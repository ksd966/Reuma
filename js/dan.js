/**
 * Ekran dana — tri polja za jutro, podne i veče, i tok dana među njima.
 *
 * Popunjeno polje se jasno razlikuje od praznog: puna ivica umesto isprekidane,
 * podignuta podloga i velika vrednost umesto crtice. Koliko je popunjeno
 * pokazuje mera u tri segmenta, gde oblik nosi značenje a boja ga pojačava.
 */

import {
  DELOVI, dohvatiDan, imeDana, punDatum, jeDanas, jeBuducnost,
  popunjenost, brojRegiona, rezim, zbirDana, praznoAStiglo, upisiBezBola, obrisiUnos,
  sviDani
} from './skladiste.js';
import { poljaZa, ispisi } from './polja.js';
import { stepenZa } from './telo/regioni.js';

export function napraviEkranDana({ naIzborDela, naPromenuDana, naJavljanje }) {
  const elIme = document.getElementById('dan-ime');
  const elDatum = document.getElementById('dan-datum');
  const elNazad = document.getElementById('dan-nazad');
  const elNapred = document.getElementById('dan-napred');
  const elDelovi = document.getElementById('delovi');
  const elUvod = document.getElementById('uvod');
  const elTok = document.getElementById('tok');
  const elZbir = document.getElementById('zbir');
  const elNaDanas = document.getElementById('na-danas');
  const elBezBolova = document.getElementById('bez-bolova');
  const elBezBolovaPod = document.getElementById('bez-bolova-pod');

  let kljuc = null;

  elNazad.addEventListener('click', () => naPromenuDana(-1));
  elNapred.addEventListener('click', () => naPromenuDana(1));
  elNaDanas.addEventListener('click', () => naPromenuDana('danas'));

  function iscrtaj(noviKljuc) {
    kljuc = noviKljuc;
    const dan = dohvatiDan(kljuc);

    elIme.textContent = imeDana(kljuc);
    elDatum.textContent = punDatum(kljuc);
    elNapred.disabled = jeBuducnost(nextKljuc(kljuc));
    elNaDanas.hidden = jeDanas(kljuc);

    osveziBezBolova();
    /* Dok dnevnik nema nijedan unos, mora da se kaže šta se radi: mapa tela
       stoji iza dodira na polje, a sitno „+ dodaj" to ne nagoveštava. */
    elUvod.hidden = imaIkakvihUnosa();
    elDelovi.replaceChildren(...DELOVI.map(d => karticaDela(d, dan[d.id])));
    iscrtajTok(dan);
    iscrtajZbir();
  }

  /* Dugme puni samo prazne delove dana koji su već stigli — o veču se u devet
     ujutru ne može ništa reći. */
  function osveziBezBolova() {
    const prazni = praznoAStiglo(kljuc);
    const imena = prazni.map(id => DELOVI.find(d => d.id === id).ime.toLowerCase());
    elBezBolova.disabled = prazni.length === 0;
    elBezBolovaPod.textContent = prazni.length === 0
      ? 'sve je već uneto za ovaj dan'
      : `upisuje nulu za: ${imena.join(', ')}`;
  }

  elBezBolova.addEventListener('click', () => {
    const upisani = upisiBezBola(kljuc);
    if (!upisani.length) return;
    const danKljuc = kljuc;
    const imena = upisani.map(id => DELOVI.find(d => d.id === id).ime.toLowerCase());
    iscrtaj(kljuc);
    naJavljanje?.(`Bez bolova — ${imena.join(', ')}`, {
      ime: 'Poništi',
      radnja: () => {
        for (const deo of upisani) obrisiUnos(danKljuc, deo);
        iscrtaj(danKljuc);
      }
    });
  });

  const imaIkakvihUnosa = () => Object.keys(sviDani()).length > 0;

  const nextKljuc = (k) => {
    const [g, m, d] = k.split('-').map(Number);
    const n = new Date(g, m - 1, d + 1);
    const p = (x) => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  };

  function karticaDela(deo, unos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'deo';
    b.dataset.deo = deo.id;
    b.dataset.stanje = unos ? 'uneto' : 'prazno';

    const ime = document.createElement('p');
    ime.className = 'deo__ime';
    ime.textContent = deo.ime;
    b.appendChild(ime);

    const broj = document.createElement('p');
    broj.className = 'deo__broj';
    const rec = document.createElement('p');
    rec.className = 'deo__rec';

    if (unos) {
      broj.textContent = String(unos.bol ?? 0);
      broj.style.color = unos.bol > 0 ? stepenZa(unos.bol).boja : 'var(--muted)';
      rec.textContent = unos.bol > 0 ? stepenZa(unos.bol).ime : 'bez bola';
      b.setAttribute('aria-label',
        `${deo.ime} — bol ${unos.bol ?? 0} od 10, ${brojRegiona(unos)} označenih regiona. Izmeni.`);
    } else {
      broj.textContent = '—';
      broj.classList.add('deo__broj--prazno');
      rec.textContent = 'nije uneto';
      b.setAttribute('aria-label', `${deo.ime} — nije uneto. Dodaj unos.`);
    }
    b.append(broj, rec);

    const dno = document.createElement('div');
    dno.className = 'deo__dno';
    if (unos) {
      const n = brojRegiona(unos);
      const regioni = document.createElement('p');
      regioni.className = 'deo__regioni';
      regioni.textContent = n === 0 ? 'bez regiona' : n === 1 ? '1 region' : `${n} regiona`;
      dno.appendChild(regioni);
      dno.appendChild(meraPopunjenosti(popunjenost(deo.id, unos, rezim())));
    } else {
      const dodaj = document.createElement('span');
      dodaj.className = 'deo__dodaj';
      dodaj.textContent = 'Unesi';
      dno.appendChild(dodaj);
    }
    b.appendChild(dno);

    b.addEventListener('click', () => naIzborDela(deo.id));
    return b;
  }

  function meraPopunjenosti(stepen) {
    const m = document.createElement('span');
    m.className = `mera mera--${stepen}`;
    m.setAttribute('role', 'img');
    m.setAttribute('aria-label', `popunjeno ${stepen} od 3`);
    for (let i = 1; i <= 3; i++) {
      const i2 = document.createElement('i');
      if (i <= stepen) i2.className = 'on';
      m.appendChild(i2);
    }
    return m;
  }

  /* ── tok dana ─────────────────────────────────────────────────────── */
  function iscrtajTok(dan) {
    const tacke = DELOVI.map((d, i) => {
      const u = dan[d.id];
      return u ? { i, ime: d.ime, bol: u.bol ?? 0, unos: u, deo: d.id } : null;
    });
    const ima = tacke.filter(Boolean);
    if (ima.length < 2) { elTok.hidden = true; return; }
    elTok.hidden = false;

    const X = [42, 160, 278], GORE = 14, DOLE = 62;
    const y = (bol) => DOLE - (bol / 10) * (DOLE - GORE);

    const delovi = [];
    for (let i = 0; i < tacke.length - 1; i++) {
      const a = tacke[i], b = tacke[i + 1];
      if (!a || !b) continue;
      delovi.push(`<line x1="${X[a.i]}" y1="${y(a.bol)}" x2="${X[b.i]}" y2="${y(b.bol)}"
                    stroke="var(--line-strong)" stroke-width="2" stroke-linecap="round"/>`);
    }
    const kruzici = ima.map(t => `
      <circle cx="${X[t.i]}" cy="${y(t.bol)}" r="9"
              fill="${t.bol > 0 ? stepenZa(t.bol).boja : 'var(--dim)'}"/>
      <text x="${X[t.i]}" y="${y(t.bol) + 4}" text-anchor="middle"
            font-size="11" font-weight="700" fill="#14171A">${t.bol}</text>`).join('');
    const imena = DELOVI.map((d, i) => `
      <text x="${X[i]}" y="76" text-anchor="middle" font-size="11"
            fill="var(--dim)">${d.ime}</text>`).join('');

    elTok.innerHTML = `
      <p class="tok__naslov">Tok dana</p>
      <svg class="tok__crtez" viewBox="0 0 320 82" role="img"
           aria-label="${ima.map(t => `${t.ime}: bol ${t.bol} od 10`).join('; ')}">
        ${delovi.join('')}${kruzici}${imena}
      </svg>
      <p class="tok__rec">${recOToku(ima)}</p>
      ${redDetalja(ima)}`;
  }

  /**
   * Rečenica uz grafik — opisuje šta je zabeleženo, bez ijedne tvrdnje o
   * uzroku. Aplikacija beleži i prikazuje, ne tumači.
   */
  function recOToku(ima) {
    const najjaci = ima.reduce((a, b) => (b.bol > a.bol ? b : a));
    const najblazi = ima.reduce((a, b) => (b.bol < a.bol ? b : a));
    if (najjaci.bol === najblazi.bol) {
      return `Bol je bio ujednačen kroz dan — ${najjaci.bol} od 10.`;
    }
    return `Najjači bol zabeležen je u delu „${najjaci.ime.toLowerCase()}" (${najjaci.bol} od 10), ` +
           `najblaži u delu „${najblazi.ime.toLowerCase()}" (${najblazi.bol} od 10).`;
  }

  /**
   * Ostala zabeležena polja, grupisana po delu dana. Bez grupisanja bi umor iz
   * podneva i umor iz večeri stajali jedan do drugog kao „umor 7/10, umor
   * 9/10", pa se ne bi videlo šta je kad zabeleženo.
   */
  function redDetalja(ima) {
    const redovi = ima.map(t => {
      const stavke = poljaZa(t.deo, rezim()).map(p => ispisi(p.id, t.unos[p.id])).filter(Boolean);
      return stavke.length ? `<b>${t.ime}</b> ${stavke.join(', ')}` : null;
    }).filter(Boolean);
    return redovi.length ? `<p class="tok__detalji">${redovi.join('<span> · </span>')}</p>` : '';
  }

  /**
   * Lični zbir za praćenje.
   *
   * Namerno se ne zove skorom: to su brojevi koje je korisnik sam uneo,
   * sabrani da bi mogao da uporedi jedan dan sa drugim. Aplikacija ne
   * primenjuje nikakve zvanične kriterijume i ne tumači ove brojeve.
   */
  function iscrtajZbir() {
    const r = rezim();
    const z = zbirDana(kljuc, r);
    if (!z || (!r.upalni && !r.fibro)) { elZbir.hidden = true; return; }

    const broj = (x) => String(x).replace('.', ',');
    const stavke = [];

    /* Bolna mesta se broje jednom, ma koliko režima bilo uključeno — kod
       upalnog se zovu zglobovima, kod fibromijalgije područjima. */
    stavke.push([r.upalni && !r.fibro ? 'Bolnih zglobova' : 'Bolnih područja', z.bolnihPodrucja]);
    if (r.upalni) {
      stavke.push(['Otečenih zglobova', z.oteklihZglobova]);
      if (z.ukocenost != null) {
        stavke.push(['Jutarnja ukočenost', z.ukocenost === 0 ? 'nema' : `${z.ukocenost} min`]);
      }
    }
    if (r.fibro) {
      if (z.prosekUmora != null) stavke.push(['Prosek umora', `${broj(z.prosekUmora)}/10`]);
      if (z.prosekMagle != null) stavke.push(['Prosek magle', `${broj(z.prosekMagle)}/10`]);
    }
    if (z.prosekBola != null) stavke.push(['Prosek bola', `${broj(z.prosekBola)}/10`]);
    if (!stavke.length) { elZbir.hidden = true; return; }

    elZbir.hidden = false;
    elZbir.innerHTML = `
      <p class="zbir__naslov">Lični zbir za praćenje</p>
      <dl class="zbir__stavke">
        ${stavke.map(([ime, v]) => `
          <div><dt>${ime}</dt><dd class="tabular">${v}</dd></div>`).join('')}
      </dl>
      <p class="zbir__ograda">
        Vaši brojevi, sabrani da biste mogli da uporedite jedan dan sa drugim.
        Nije dijagnostički skor i ne primenjuje nikakve zvanične kriterijume —
        tumačenje je na lekaru.
      </p>`;
  }

  return { iscrtaj, tekuciDan: () => kljuc };
}
