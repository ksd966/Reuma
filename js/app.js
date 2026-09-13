/**
 * Artron — pokretanje aplikacije.
 *
 * Zasad je na strani samo mapa tela; tri dnevna unosa, lekovi, dnevnik, vreme
 * i izvoz dolaze u narednim koracima i kače se na isto skladište stanja.
 */

import { napraviMapuTela, POGLEDI } from './telo/mapa-tela.js';
import { napraviList } from './unos.js';
import { REGIONI, GRUPE, PO_ID, stepenZa } from './telo/regioni.js';

const elPogledi = document.getElementById('pogledi');
const elSpisak = document.getElementById('spisak');
const elBrojac = document.getElementById('brojac');

/* ── dugmad spiska regiona ────────────────────────────────────────────── */
const dugmadRegiona = new Map();

for (const g of GRUPE) {
  const grupa = document.createElement('div');
  grupa.className = 'spisak__grupa';

  const naslov = document.createElement('p');
  naslov.className = 'spisak__ime-grupe';
  naslov.id = `grupa-${g.id}`;
  naslov.textContent = g.ime;
  grupa.appendChild(naslov);

  const mreza = document.createElement('div');
  mreza.className = 'spisak__mreza';
  mreza.setAttribute('role', 'group');
  mreza.setAttribute('aria-labelledby', naslov.id);

  for (const r of REGIONI.filter(x => x.grupa === g.id)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spisak__dugme';
    b.dataset.region = r.id;
    b.append(document.createTextNode(r.ime));
    const znak = document.createElement('b');
    znak.hidden = true;
    b.appendChild(znak);
    b.addEventListener('click', () => otvoriRegion(r.id, b));
    mreza.appendChild(b);
    dugmadRegiona.set(r.id, b);
  }

  grupa.appendChild(mreza);
  elSpisak.appendChild(grupa);
}

/* ── dugmad pogleda ───────────────────────────────────────────────────── */
for (const p of POGLEDI) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = p.ime;
  b.dataset.pogled = p.id;
  b.setAttribute('aria-pressed', String(p.id === 'napred'));
  b.addEventListener('click', () => mapa.naPogled(p.id));
  elPogledi.appendChild(b);
}

/* ── mapa tela ────────────────────────────────────────────────────────── */
const mapa = napraviMapuTela({
  platno: document.getElementById('platno'),
  slojOznaka: document.getElementById('oznake'),
  naDodirRegiona: (id) => otvoriRegion(id, null),
  naPromenuPogleda: (id) => {
    for (const b of elPogledi.children) {
      b.setAttribute('aria-pressed', String(b.dataset.pogled === id));
    }
  }
});

/* ── list za unos ─────────────────────────────────────────────────────── */
const list = napraviList({
  naPotvrdu: (id, unos) => { mapa.postaviStanje(id, unos); osveziRegion(id); osveziBrojac(); },
  naUklanjanje: (id) => { mapa.postaviStanje(id, null); osveziRegion(id); osveziBrojac(); },
  naZatvaranje: () => mapa.izaberi(null)
});

function otvoriRegion(id, poreklo) {
  const region = PO_ID.get(id);
  if (!region) return;
  mapa.izaberi(id);
  list.otvori(region, mapa.stanjeRegiona(id), poreklo);
}

/* ── osvežavanje prikaza ──────────────────────────────────────────────── */
function osveziRegion(id) {
  const b = dugmadRegiona.get(id);
  if (!b) return;
  const unos = mapa.stanjeRegiona(id);
  const znak = b.querySelector('b');
  if (unos) {
    b.dataset.oznacen = 'da';
    znak.hidden = false;
    znak.textContent = String(unos.jacina);
    znak.style.background = stepenZa(unos.jacina).boja;
    b.setAttribute('aria-label', `${PO_ID.get(id).ime} — bol ${unos.jacina} od 10`);
  } else {
    delete b.dataset.oznacen;
    znak.hidden = true;
    b.removeAttribute('aria-label');
  }
}

function osveziBrojac() {
  const n = mapa.svaStanja().size;
  elBrojac.textContent =
    n === 0 ? 'nijedan region' :
    n === 1 ? '1 region' :
    n < 5   ? `${n} regiona` : `${n} regiona`;
}

osveziBrojac();

/* Za proveru pri radu na modelu; ne koristi se u aplikaciji. */
globalThis.artron = { mapa };

/* ── rad bez mreže ────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* radi i bez toga */ });
  });
}
