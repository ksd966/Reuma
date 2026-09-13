/**
 * Mapa tela — trodimenzionalni prikaz sa 36 regiona koji se biraju prstom.
 *
 * Crta se samo kad ima šta da se promeni (okretanje, izmena unosa, promena
 * veličine ekrana). Dok se telo ne dira, petlja stoji i ne troši bateriju.
 */

import * as THREE from '../vendor/three.js';
import { napraviTelo } from './telo-model.js';
import { REGIONI, PO_ID, stepenZa } from './regioni.js';

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

const PRAG_DODIRA = 10;     // px pomeraja preko kojih dodir postaje okretanje
const PRAG_DUBINE = 0.08;   // m tolerancije pri proveri da li je region zaklonjen
const RAZMAK_OZNAKA = 30;   // px najmanjeg razmaka između dva broja
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

  const nebo = new THREE.HemisphereLight(0xffffff, 0x6a7078, 1.5);
  scena.add(nebo);
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

  /* Sidro oznake za svaki region, izračunato jednom u mirnom položaju; kasnije
     se samo prebaci kroz matricu okreta, bez ponovnog računanja.
     Uzima se središte NAJVEĆEG dela regiona, a ne središte svih delova zajedno:
     kod prstiju bi zajedničko središte palo u vazduh između njih, pa bi zrak
     za proveru zaklonjenosti promašio telo i broj se ne bi pojavio. */
  const sidro = new Map();
  telo.grupa.updateMatrixWorld(true);
  for (const r of REGIONI) {
    let najveci = null, najzapremina = -1;
    for (const m of telo.meshoviPoRegionu.get(r.id)) {
      const o = new THREE.Box3().expandByObject(m);
      const d = o.getSize(new THREE.Vector3());
      const v = d.x * d.y * d.z;
      if (v > najzapremina) { najzapremina = v; najveci = o; }
    }
    sidro.set(r.id, najveci.getCenter(new THREE.Vector3()));
  }

  const stanje = new Map();                // id regiona -> { jacina, vrsta }
  let izabran = null;                      // region trenutno otvoren u listu
  let trebaCrtati = true;
  let ugaoCilj = null;
  let brzina = 0;
  const oznake = new Map();

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
    const osnovna = unos ? stepenZa(unos.jacina).boja : boje().region;
    mat.color.set(osnovna);
    mat.emissive.set(id === izabran ? '#E0A64B' : '#000000');
    mat.emissiveIntensity = id === izabran ? 0.42 : 0;
  }

  function primeniBoje() {
    telo.grupa.children.forEach(m => {
      if (m.userData.neutralno) m.material.color.set(boje().neutralno);
    });
    for (const r of REGIONI) obojiRegion(r.id);
    trebaCrtati = true;
  }

  /* ── oznake sa brojem ─────────────────────────────────────────────── */
  const zrak = new THREE.Raycaster();
  const tacka = new THREE.Vector3();

  function oznakaZa(id) {
    let el = oznake.get(id);
    if (!el) {
      el = document.createElement('span');
      el.className = 'oznaka-regiona tabular';
      slojOznaka.appendChild(el);
      oznake.set(id, el);
    }
    return el;
  }

  function osveziOznake() {
    const w = platno.clientWidth, h = platno.clientHeight;
    for (const [id, el] of oznake) {
      if (!stanje.has(id)) { el.remove(); oznake.delete(id); }
    }

    const vidljive = [];
    for (const [id, unos] of stanje) {
      const el = oznakaZa(id);
      el.textContent = String(unos.jacina);
      el.style.background = stepenZa(unos.jacina).boja;

      tacka.copy(sidro.get(id)).applyMatrix4(okret.matrixWorld).project(kamera);
      /* Zaklonjen region ne dobija oznaku — inače bi broj visio u vazduhu nad
         delom tela okrenutim na drugu stranu. Ne traži se da region bude baš
         prvi pogodak, jer se susedni delovi preklapaju (butina se završava
         tačno na kolenu). Gleda se dubina: ako je površina regiona na istoj
         udaljenosti kao i ono najbliže, region se vidi. */
      zrak.setFromCamera({ x: tacka.x, y: tacka.y }, kamera);
      const pogoci = zrak.intersectObjects(telo.grupa.children, false);
      const nas = pogoci.find(g => g.object.userData.region === id);
      const vidljiv = !!nas && nas.distance - pogoci[0].distance < PRAG_DUBINE;

      el.hidden = !vidljiv;
      if (vidljiv) {
        vidljive.push({ el, x: ((tacka.x + 1) / 2) * w, y: ((1 - tacka.y) / 2) * h });
      }
    }

    razmakni(vidljive, w, h);
    for (const o of vidljive) {
      o.el.style.left = `${o.x}px`;
      o.el.style.top = `${o.y}px`;
    }
  }

  /**
   * Razmiče brojeve koji bi pali jedan preko drugog. Gusto zbijeni regioni
   * (rame uz vrat, ručni zglob uz prste) inače daju gomilu u kojoj se ne vidi
   * koji broj pripada čemu. Nekoliko prolaza je dovoljno da se razdvoje, a
   * pomeraj ostaje mali pa se i dalje vidi na šta broj pokazuje.
   */
  function razmakni(stavke, w, h) {
    for (let prolaz = 0; prolaz < 4; prolaz++) {
      let mirno = true;
      for (let i = 0; i < stavke.length; i++) {
        for (let j = i + 1; j < stavke.length; j++) {
          const a = stavke[i], b = stavke[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= RAZMAK_OZNAKA) continue;
          if (d < 0.001) { dx = 0; dy = 1; d = 1; }      // tačno jedan na drugom
          const pomak = (RAZMAK_OZNAKA - d) / 2;
          const ux = (dx / d) * pomak, uy = (dy / d) * pomak;
          a.x -= ux; a.y -= uy; b.x += ux; b.y += uy;
          mirno = false;
        }
      }
      if (mirno) break;
    }
    const ivica = RAZMAK_OZNAKA / 2;
    for (const o of stavke) {
      o.x = Math.min(w - ivica, Math.max(ivica, o.x));
      o.y = Math.min(h - ivica, Math.max(ivica, o.y));
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
      osveziOznake();
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

  /* ── prst ─────────────────────────────────────────────────────────── */
  let pocetak = null, prevuceno = false, prethodniX = 0, poslednjiPomak = 0;

  platno.addEventListener('pointerdown', (e) => {
    platno.setPointerCapture(e.pointerId);
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

  function zavrsi(e) {
    if (!pocetak) return;
    if (prevuceno) {
      brzina = Math.max(-0.09, Math.min(0.09, poslednjiPomak));
    } else {
      const p = platno.getBoundingClientRect();
      zrak.setFromCamera({
        x: ((e.clientX - p.left) / p.width) * 2 - 1,
        y: -((e.clientY - p.top) / p.height) * 2 + 1
      }, kamera);
      const pogodak = zrak.intersectObjects(telo.zaPogadjanje, false)[0];
      if (pogodak) naDodirRegiona?.(pogodak.object.userData.region);
    }
    pocetak = null;
    poslednjiPomak = 0;
  }
  platno.addEventListener('pointerup', zavrsi);
  platno.addEventListener('pointercancel', () => { pocetak = null; });

  /* ── spolja dostupno ──────────────────────────────────────────────── */
  const api = {
    naPogled(id) {
      const p = POGLEDI.find(x => x.id === id);
      if (!p) return;
      const y = okret.rotation.y;
      ugaoCilj = y + najkraciUgao(y, p.ugao);
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
