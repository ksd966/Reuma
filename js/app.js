/**
 * Artron — pokretanje i prelaz između ekrana.
 *
 * Zasad postoje dva ekrana: pregled dana sa tri polja, i unos za jedan deo
 * dana. Lekovi, dnevnik, vreme i izvoz dolaze u narednim koracima i kače se
 * na isto skladište.
 */

import { napraviEkranDana } from './dan.js';
import { napraviEkranUnosa } from './unos-dana.js';
import { napraviEkranPodesavanja } from './podesavanja.js';
import { napraviEkranIzvestaja } from './izvestaj.js';
import { kljucDana, pomeriDan, jeBuducnost, imeDana } from './skladiste.js';

const ekrani = {
  dan: document.getElementById('ekran-dan'),
  unos: document.getElementById('ekran-unos'),
  izvestaj: document.getElementById('ekran-izvestaj'),
  podesavanja: document.getElementById('ekran-podesavanja')
};
const elNazad = document.getElementById('nazad');
const elKaPodesavanjima = document.getElementById('ka-podesavanjima');
const elKaIzvestaju = document.getElementById('ka-izvestaju');
const elZnak = document.getElementById('znak');
const elNaslov = document.getElementById('naslov');
const elPodnaslov = document.getElementById('podnaslov');
const elJavljanje = document.getElementById('javljanje');

let tekuciDan = kljucDana();

/* ── kratko javljanje ─────────────────────────────────────────────────── */
let sakrij = null;

/** Kratko javljanje; uz njega može da stoji i jedna radnja, npr. „Poništi". */
function javi(tekst, radnja) {
  elJavljanje.replaceChildren(document.createTextNode(tekst));
  if (radnja) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'javljanje__radnja';
    b.textContent = radnja.ime;
    b.addEventListener('click', () => { radnja.radnja(); sakrijJavljanje(); });
    elJavljanje.appendChild(b);
  }
  elJavljanje.hidden = false;
  elJavljanje.style.pointerEvents = radnja ? 'auto' : 'none';
  requestAnimationFrame(() => { elJavljanje.dataset.vidi = 'da'; });
  clearTimeout(sakrij);
  sakrij = setTimeout(sakrijJavljanje, radnja ? 5000 : 2400);
}

function sakrijJavljanje() {
  clearTimeout(sakrij);
  delete elJavljanje.dataset.vidi;
  setTimeout(() => { elJavljanje.hidden = true; }, 220);
}

/* ── ekrani ───────────────────────────────────────────────────────────── */
function prikazi(ime) {
  for (const [id, el] of Object.entries(ekrani)) el.hidden = id !== ime;
  const naPocetku = ime === 'dan';
  elNazad.hidden = naPocetku;
  elZnak.hidden = !naPocetku;
  elKaPodesavanjima.hidden = !naPocetku;
  elKaIzvestaju.hidden = !naPocetku;

  if (ime === 'unos') {
    const z = ekranUnosa.zaglavlje();
    elNaslov.textContent = z.naslov;
    elPodnaslov.textContent = z.podnaslov;
  } else if (ime === 'podesavanja') {
    elNaslov.textContent = 'Podešavanja';
    elPodnaslov.textContent = '';
  } else if (ime === 'izvestaj') {
    elNaslov.textContent = 'Izveštaj';
    elPodnaslov.textContent = '';
  } else {
    elNaslov.textContent = 'Artron';
    elPodnaslov.textContent = imeDana(tekuciDan);
  }
  scrollTo(0, 0);
}

const ekranDana = napraviEkranDana({
  naIzborDela: (deo) => {
    ekranUnosa.otvori(tekuciDan, deo);
    prikazi('unos');
  },
  naJavljanje: javi,
  naPromenuDana: (koliko) => {
    const novi = koliko === 'danas' ? kljucDana() : pomeriDan(tekuciDan, koliko);
    if (jeBuducnost(novi)) return;
    tekuciDan = novi;
    ekranDana.iscrtaj(tekuciDan);
    elPodnaslov.textContent = imeDana(tekuciDan);
  }
});

const ekranUnosa = napraviEkranUnosa({
  naZavrsetak: () => {
    ekranDana.iscrtaj(tekuciDan);
    prikazi('dan');
  },
  naJavljanje: javi
});

const ekranPodesavanja = napraviEkranPodesavanja({
  /* Promena režima menja šta se pita, pa se pregled dana mora ponovo iscrtati
     — lični zbir i mera popunjenosti zavise od izabranog režima. */
  naPromenuRezima: () => ekranDana.iscrtaj(tekuciDan)
});

const ekranIzvestaja = napraviEkranIzvestaja();

elKaIzvestaju.addEventListener('click', () => {
  ekranIzvestaja.iscrtaj(tekuciDan);
  prikazi('izvestaj');
});

elKaPodesavanjima.addEventListener('click', () => {
  ekranPodesavanja.iscrtaj();
  prikazi('podesavanja');
});

elNazad.addEventListener('click', () => {
  ekranDana.iscrtaj(tekuciDan);
  prikazi('dan');
});

/* Kad se aplikacija vrati u prvi plan posle ponoći, dan više nije isti. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!ekrani.dan.hidden && tekuciDan !== kljucDana()) {
    tekuciDan = kljucDana();
    ekranDana.iscrtaj(tekuciDan);
    elPodnaslov.textContent = imeDana(tekuciDan);
  }
});

ekranDana.iscrtaj(tekuciDan);
prikazi('dan');

/* Za proveru pri radu na modelu; aplikacija ovo ne koristi. */
globalThis.artron = { ekranDana, ekranUnosa, ekranPodesavanja, ekranIzvestaja, prikazi };

/* ── rad bez mreže ────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* radi i bez toga */ });
  });
}
