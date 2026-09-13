/**
 * Artron — pokretanje i prelaz između ekrana.
 *
 * Zasad postoje dva ekrana: pregled dana sa tri polja, i unos za jedan deo
 * dana. Lekovi, dnevnik, vreme i izvoz dolaze u narednim koracima i kače se
 * na isto skladište.
 */

import { napraviEkranDana } from './dan.js';
import { napraviEkranUnosa } from './unos-dana.js';
import { kljucDana, pomeriDan, jeBuducnost, imeDana } from './skladiste.js';

const ekrani = {
  dan: document.getElementById('ekran-dan'),
  unos: document.getElementById('ekran-unos')
};
const elNazad = document.getElementById('nazad');
const elZnak = document.getElementById('znak');
const elNaslov = document.getElementById('naslov');
const elPodnaslov = document.getElementById('podnaslov');
const elJavljanje = document.getElementById('javljanje');

let tekuciDan = kljucDana();

/* ── kratko javljanje ─────────────────────────────────────────────────── */
let sakrij = null;
function javi(tekst) {
  elJavljanje.textContent = tekst;
  elJavljanje.hidden = false;
  requestAnimationFrame(() => { elJavljanje.dataset.vidi = 'da'; });
  clearTimeout(sakrij);
  sakrij = setTimeout(() => {
    delete elJavljanje.dataset.vidi;
    setTimeout(() => { elJavljanje.hidden = true; }, 220);
  }, 2400);
}

/* ── ekrani ───────────────────────────────────────────────────────────── */
function prikazi(ime) {
  for (const [id, el] of Object.entries(ekrani)) el.hidden = id !== ime;
  const uUnosu = ime === 'unos';
  elNazad.hidden = !uUnosu;
  elZnak.hidden = uUnosu;
  if (uUnosu) {
    const z = ekranUnosa.zaglavlje();
    elNaslov.textContent = z.naslov;
    elPodnaslov.textContent = z.podnaslov;
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
globalThis.artron = { ekranDana, ekranUnosa, prikazi };

/* ── rad bez mreže ────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* radi i bez toga */ });
  });
}
