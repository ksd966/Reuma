/**
 * Mapa tela — trodimenzionalni prikaz sa 36 regiona koji se biraju prstom.
 *
 * Svaki region ima svoju vidljivu tačku na telu. Tačka je i meta za prst i
 * mesto gde se, kad se bol unese, pojavi broj jačine.
 *
 * Crta se samo kad ima šta da se promeni (okretanje, izmena unosa, promena
 * veličine ekrana). Dok se telo ne dira, petlja stoji i ne troši bateriju.
 */

import * as THREE from '../vendor/three.js';
import { napraviTelo, napraviTacke } from './telo-model.js';
import { REGIONI, stepenZa } from './regioni.js';

/** Četiri pogleda; između njih se ide dugmadima ili slobodno prstom. */
export const POGLEDI = [
  { id: 'napred',    ime: 'Napred',    ugao: 0 },
  { id: 'desni-bok', ime: 'Desni bok', ugao: Math.PI / 2 },
  { id: 'nazad',     ime: 'Nazad',     ugao: Math.PI },
  { id: 'levi-bok',  ime: 'Levi bok',  ugao: -Math.PI / 2 }
];

const BOJE = {
  tamno:  { neutralno: '#2A2F35', region: '#414951' },
  svetlo: { neutralno: '#C6CBD1', region: '#A9B0B8' }
};

/* Zglob koji je otečen a ne boli dobija svoju boju, izvan skale jačine bola —
   da se ne pomeša sa blagim bolom. Oblik tačke ga ionako razlikuje. */
const BOJA_OTEKLINE = '#5A6FD6';

const PRAG_DODIRA = 10;     // px pomeraja preko kojih dodir postaje okretanje
const PRAG_OKRENUTOSTI = 0.12;  // koliko tačka mora da gleda ka nama da bi se videla
const ZAZOR = 0.02;             // m — da tačka ne zakloni samu sebe pri proveri
const BLIZU_TACKE = 22;     // px — dodir ovoliko blizu tačke je pogodak u nju
const DOMET_TACKE = 44;     // px — krajnji domet ako ni telo nije pogođeno
const POLUPRECNIK = { tacka: 7, broj: 15 };   // px, za razmicanje oznaka
const TAU = Math.PI * 2;

/** Najkraći put do ciljnog ugla, da se telo ne vrti naokolo bez potrebe. */
function najkraciUgao(od, doUgla) {
  let d = (doUgla - od) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function napraviMapuTela({ platno, slojOznaka, naDodirRegiona, naPromenuPogleda }) {
  const tamnoUpit = matchMedia('(prefers-color-scheme: dark)');
  const boje = () => (tamnoUpit.matches ? BOJE.tamno : BOJE.svetlo);

  const crtac = new THREE.WebGLRenderer({ canvas: platno, antialias: true, alpha: true });
  crtac.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const scena = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);

  scena.add(new THREE.HemisphereLight(0xffffff, 0x6a7078, 1.5));
  const glavno = new THREE.DirectionalLight(0xffffff, 2.0);
  glavno.position.set(0.55, 1.1, 1.25);
  scena.add(glavno);
  const dopuna = new THREE.DirectionalLight(0xffffff, 0.55);
  dopuna.position.set(-0.9, 0.25, 0.7);
  scena.add(dopuna);

  const telo = napraviTelo(THREE, boje());
  const okret = new THREE.Group();         // nosi telo i okreće se oko uspravne ose
  okret.add(telo.grupa);
  scena.add(okret);

  /* Tačke regiona u mirnom položaju; pri okretanju se samo zavrte oko uspravne
     ose, bez ponovnog računanja. */
  const tackeRegiona = napraviTacke();
  const uModelu = new Map();
  for (const [id, niz] of tackeRegiona) {
    uModelu.set(id, niz.map(t => ({
      p: new THREE.Vector3(...t.p),
      n: new THREE.Vector3(...t.n)
    })));
  }

  const stanje = new Map();                // id regiona -> { jacina, vrsta }
  const elementi = new Map();              // id regiona -> DOM element tačke
  const naEkranu = new Map();              // id regiona -> { x, y, vidljiv }
  let izabran = null;
  let trebaCrtati = true;
  let ugaoCilj = null;
  let brzina = 0;

  for (const r of REGIONI) {
    const el = document.createElement('span');
    el.className = 'tacka-regiona';
    el.dataset.region = r.id;
    slojOznaka.appendChild(el);
    elementi.set(r.id, el);
    naEkranu.set(r.id, { x: 0, y: 0, vidljiv: false });
  }

  /* ── veličina ─────────────────────────────────────────────────────── */
  function naVelicinu() {
    const { clientWidth: w, clientHeight: h } = platno;
    if (!w || !h) return;
    crtac.setSize(w, h, false);
    kamera.aspect = w / h;
    /* Kamera se odmakne taman toliko da telo stane po visini, sa malom ivicom. */
    const vidno = (kamera.fov * Math.PI) / 180;
    kamera.position.set(0, 0, (telo.visina * 0.53) / Math.tan(vidno / 2));
    kamera.lookAt(0, 0, 0);
    kamera.updateProjectionMatrix();
    trebaCrtati = true;
  }

  /* ── boje regiona ─────────────────────────────────────────────────── */
  function obojiRegion(id) {
    const mat = telo.materijali.get(id);
    const unos = stanje.get(id);
    mat.color.set(bojaStanja(unos) ?? boje().region);
    mat.emissive.set(id === izabran ? '#E0A64B' : '#000000');
    mat.emissiveIntensity = id === izabran ? 0.42 : 0;
  }

  function primeniBoje() {
    for (const m of telo.grupa.children) {
      if (m.userData.neutralno) m.material.color.set(boje().neutralno);
    }
    for (const r of REGIONI) obojiRegion(r.id);
    trebaCrtati = true;
  }

  /* ── tačke i brojevi ──────────────────────────────────────────────── */
  const zrak = new THREE.Raycaster();
  const tacka = new THREE.Vector3();

  function osveziTacke() {
    const w = platno.clientWidth, h = platno.clientHeight;
    const stavke = [];
    const kosinus = Math.cos(okret.rotation.y), sinus = Math.sin(okret.rotation.y);
    telo.grupa.updateMatrixWorld(true);

    for (const r of REGIONI) {
      const id = r.id;
      const el = elementi.get(id);
      const unos = stanje.get(id);

      /* Izgled se postavlja pre provere vidljivosti: sakriven region kasnije
         izranja pri okretanju i mora odmah da bude tačan. */
      const boja = bojaStanja(unos);
      if (boja) {
        /* Broj stoji samo kad bol postoji; otečen a bezbolan zglob nosi
           prazan kvadrat, jer bi „0" tu čitala kao izmerena vrednost. */
        el.textContent = (unos.jacina ?? 0) > 0 ? String(unos.jacina) : '';
        el.dataset.stanje = 'uneto';
        el.style.background = boja;
      } else {
        el.textContent = '';
        delete el.dataset.stanje;
        el.style.background = '';
      }
      /* Oteklina se razlikuje oblikom, ne samo bojom — kvadrat umesto kruga. */
      if (unos?.oteklo) el.dataset.oteklo = 'da'; else delete el.dataset.oteklo;

      const izabrana = najboljaTacka(id, kosinus, sinus);
      const zapis = naEkranu.get(id);
      zapis.vidljiv = !!izabrana;
      el.hidden = !izabrana;
      if (!izabrana) continue;

      tacka.copy(izabrana).project(kamera);
      stavke.push({
        el, zapis,
        x: ((tacka.x + 1) / 2) * w,
        y: ((1 - tacka.y) / 2) * h,
        r: boja ? POLUPRECNIK.broj : POLUPRECNIK.tacka
      });
    }

    razmakni(stavke, w, h);
    for (const s of stavke) {
      s.el.style.left = `${s.x}px`;
      s.el.style.top = `${s.y}px`;
      s.zapis.x = s.x;
      s.zapis.y = s.y;
    }
  }

  /** Boja regiona po onome što je zabeleženo; null kad ništa nije. */
  function bojaStanja(unos) {
    if (!unos) return null;
    if ((unos.jacina ?? 0) > 0) return stepenZa(unos.jacina).boja;
    if (unos.oteklo) return BOJA_OTEKLINE;
    return null;
  }

  const radnaP = new THREE.Vector3();
  const radnaN = new THREE.Vector3();
  const kaKameri = new THREE.Vector3();

  /**
   * Bira tačku regiona koja se vidi: prvo onu najviše okrenutu ka gledaocu, pa
   * proverava da li je neki drugi deo tela zaklanja (šaka ume da padne preko
   * butine u pogledu sa boka). Ako nijedna ne prolazi, region nema tačku —
   * i to je tačno: kičma se spreda i ne vidi.
   */
  function najboljaTacka(id, kosinus, sinus, dnevnik) {
    const kandidati = uModelu.get(id);
    const poredak = [];

    for (const k of kandidati) {
      /* Okret je samo oko uspravne ose, pa je dovoljno zavrteti x i z. */
      radnaN.set(k.n.x * kosinus + k.n.z * sinus, k.n.y, -k.n.x * sinus + k.n.z * kosinus);
      radnaP.copy(k.p).applyMatrix4(telo.grupa.matrixWorld);
      kaKameri.subVectors(kamera.position, radnaP);
      const daljina = kaKameri.length();
      kaKameri.divideScalar(daljina || 1);
      const okrenutost = radnaN.dot(kaKameri);
      if (okrenutost > PRAG_OKRENUTOSTI) {
        poredak.push({ okrenutost, p: radnaP.clone(), daljina });
      }
    }

    poredak.sort((a, b) => b.okrenutost - a.okrenutost);
    for (const k of poredak) {
      zrak.set(kamera.position, kaKameri.subVectors(k.p, kamera.position).normalize());
      zrak.far = k.daljina - ZAZOR;
      const smetnja = zrak.intersectObjects(telo.grupa.children, false)[0];
      zrak.far = Infinity;
      if (dnevnik) dnevnik.push({
        okrenutost: +k.okrenutost.toFixed(2),
        zaklanja: smetnja ? (smetnja.object.userData.region || 'neutralno') : null,
        koliko: smetnja ? +(k.daljina - smetnja.distance).toFixed(3) : 0
      });
      if (!smetnja) return k.p;
    }
    return null;
  }

  /**
   * Razmiče tačke i brojeve koji bi pali jedan preko drugog. Gusto zbijeni
   * regioni (ručni zglob uz prste, rame uz vrat) inače daju gomilu u kojoj se
   * ne vidi šta je šta, a prst ne može da pogodi pravu tačku. Nekoliko prolaza
   * je dovoljno, a pomeraj ostaje mali pa se i dalje vidi na šta tačka pokazuje.
   */
  function razmakni(stavke, w, h) {
    for (let prolaz = 0; prolaz < 6; prolaz++) {
      let mirno = true;
      for (let i = 0; i < stavke.length; i++) {
        for (let j = i + 1; j < stavke.length; j++) {
          const a = stavke[i], b = stavke[j];
          const najmanje = a.r + b.r + 2;
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= najmanje) continue;
          if (d < 0.001) { dx = 0; dy = 1; d = 1; }      // tačno jedan na drugom
          const pomak = (najmanje - d) / 2;
          const ux = (dx / d) * pomak, uy = (dy / d) * pomak;
          a.x -= ux; a.y -= uy; b.x += ux; b.y += uy;
          mirno = false;
        }
      }
      if (mirno) break;
    }
    for (const s of stavke) {
      s.x = Math.min(w - s.r, Math.max(s.r, s.x));
      s.y = Math.min(h - s.r, Math.max(s.r, s.y));
    }
  }

  /* ── petlja ───────────────────────────────────────────────────────── */
  function korak() {
    if (ugaoCilj !== null) {
      const d = najkraciUgao(okret.rotation.y, ugaoCilj);
      if (Math.abs(d) < 0.002) { okret.rotation.y = ugaoCilj; ugaoCilj = null; }
      else okret.rotation.y += d * 0.18;
      trebaCrtati = true;
    } else if (Math.abs(brzina) > 0.0004) {
      okret.rotation.y += brzina;
      brzina *= 0.93;
      trebaCrtati = true;
    }
    if (trebaCrtati) {
      trebaCrtati = false;
      okret.updateMatrixWorld(true);
      crtac.render(scena, kamera);
      osveziTacke();
      javiPogled();
    }
    requestAnimationFrame(korak);
  }

  let poslednjiPogled = null;
  function javiPogled() {
    const y = ((okret.rotation.y % TAU) + TAU) % TAU;
    let najblizi = POGLEDI[0], najbolje = Infinity;
    for (const p of POGLEDI) {
      const d = Math.abs(najkraciUgao(y, p.ugao));
      if (d < najbolje) { najbolje = d; najblizi = p; }
    }
    const id = najbolje < 0.4 ? najblizi.id : null;
    if (id !== poslednjiPogled) { poslednjiPogled = id; naPromenuPogleda?.(id); }
  }

  /* ── pogađanje regiona ────────────────────────────────────────────── */
  /**
   * Tri koraka, tim redom:
   *  1. tačka pod prstom — ako je prst pao na 22 px od neke tačke, to je ona,
   *     jer korisnik gađa tačku koju vidi, a ne površinu tela ispod nje;
   *  2. zrak kroz telo — dodir bilo gde po udu bira taj region;
   *  3. najbliža tačka u krugu od 44 px — da promašaj za koji piksel
   *     ne prođe bez ičega.
   */
  function regionNaDodir(x, y) {
    let najblizi = null, najbolje = Infinity;
    for (const [id, t] of naEkranu) {
      if (!t.vidljiv) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < najbolje) { najbolje = d; najblizi = id; }
    }
    if (najblizi && najbolje <= BLIZU_TACKE) return najblizi;

    const w = platno.clientWidth, h = platno.clientHeight;
    zrak.setFromCamera({ x: (x / w) * 2 - 1, y: -(y / h) * 2 + 1 }, kamera);
    const pogodak = zrak.intersectObjects(telo.zaPogadjanje, false)[0];
    if (pogodak) return pogodak.object.userData.region;

    return najblizi && najbolje <= DOMET_TACKE ? najblizi : null;
  }

  /* ── prst ─────────────────────────────────────────────────────────── */
  let pocetak = null, prevuceno = false, prethodniX = 0, poslednjiPomak = 0;

  platno.addEventListener('pointerdown', (e) => {
    /* Hvatanje pokazivača ume da padne ako je prst već pušten — okretanje
       radi i bez njega, pa greška ne sme da obori ostatak obrade dodira. */
    try { platno.setPointerCapture(e.pointerId); } catch { /* nije presudno */ }
    pocetak = { x: e.clientX, y: e.clientY };
    prethodniX = e.clientX;
    prevuceno = false;
    brzina = 0;
    ugaoCilj = null;
  });

  platno.addEventListener('pointermove', (e) => {
    if (!pocetak) return;
    const dx = e.clientX - pocetak.x, dy = e.clientY - pocetak.y;
    if (!prevuceno && Math.hypot(dx, dy) > PRAG_DODIRA) prevuceno = true;
    if (prevuceno) {
      poslednjiPomak = (e.clientX - prethodniX) * 0.0085;
      okret.rotation.y += poslednjiPomak;
      prethodniX = e.clientX;
      trebaCrtati = true;
    }
  });

  platno.addEventListener('pointerup', (e) => {
    if (!pocetak) return;
    if (prevuceno) {
      brzina = Math.max(-0.09, Math.min(0.09, poslednjiPomak));
    } else {
      const o = platno.getBoundingClientRect();
      const id = regionNaDodir(e.clientX - o.left, e.clientY - o.top);
      if (id) naDodirRegiona?.(id);
    }
    pocetak = null;
    poslednjiPomak = 0;
  });
  platno.addEventListener('pointercancel', () => { pocetak = null; });

  /* ── spolja dostupno ──────────────────────────────────────────────── */
  const api = {
    naPogled(id) {
      const p = POGLEDI.find(x => x.id === id);
      if (!p) return;
      ugaoCilj = okret.rotation.y + najkraciUgao(okret.rotation.y, p.ugao);
      brzina = 0;
    },
    postaviStanje(id, unos) {
      if (unos) stanje.set(id, unos); else stanje.delete(id);
      obojiRegion(id);
      trebaCrtati = true;
    },
    ocistiSve() {
      for (const id of [...stanje.keys()]) { stanje.delete(id); obojiRegion(id); }
      trebaCrtati = true;
    },
    izaberi(id) {
      const prethodni = izabran;
      izabran = id;
      if (prethodni) obojiRegion(prethodni);
      if (id) obojiRegion(id);
      trebaCrtati = true;
    },
    /** Zašto se region ne vidi — za proveru pri radu na modelu. */
    zastoSakriven(id) {
      const dnevnik = [];
      najboljaTacka(id, Math.cos(okret.rotation.y), Math.sin(okret.rotation.y), dnevnik);
      return dnevnik;
    },
    stanjeRegiona: (id) => stanje.get(id),
    svaStanja: () => new Map(stanje),
    osvezi: naVelicinu
  };

  new ResizeObserver(naVelicinu).observe(platno);
  tamnoUpit.addEventListener('change', primeniBoje);
  naVelicinu();
  primeniBoje();
  requestAnimationFrame(korak);

  return api;
}
