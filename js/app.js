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
import { napraviEkranLekova } from './ekran-lekovi.js';
import { napraviEkranLeka } from './ekran-lek.js';
import {
  kljucDana, pomeriDan, jeBuducnost, imeDana, pripremi, upisiSada, stanjeCuvanja
} from './skladiste.js';
import { sacuvajKopiju, trebaPodsetiti, odloziPodsetnik } from './kopija.js';

/* Podaci se učitavaju pre prvog iscrtavanja: ekran dana bez njih ne bi imao
   šta da pokaže, a IndexedDB se otvara asinhrono. */
await pripremi();

const ekrani = {
  dan: document.getElementById('ekran-dan'),
  unos: document.getElementById('ekran-unos'),
  izvestaj: document.getElementById('ekran-izvestaj'),
  lekovi: document.getElementById('ekran-lekovi'),
  lek: document.getElementById('ekran-lek'),
  podesavanja: document.getElementById('ekran-podesavanja')
};
const elNazad = document.getElementById('nazad');
const elKaPodesavanjima = document.getElementById('ka-podesavanjima');
const elKaIzvestaju = document.getElementById('ka-izvestaju');
const elKaLekovima = document.getElementById('ka-lekovima');
const elZnak = document.getElementById('znak');
const elNaslov = document.getElementById('naslov');
const elPodnaslov = document.getElementById('podnaslov');
const elJavljanje = document.getElementById('javljanje');
const elPodsetnik = document.getElementById('podsetnik-kopija');
const elPodsetnikTekst = document.getElementById('podsetnik-tekst');

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
  elKaLekovima.hidden = !naPocetku;

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
  } else if (ime === 'lekovi') {
    elNaslov.textContent = 'Lekovi';
    elPodnaslov.textContent = imeDana(tekuciDan);
  } else if (ime === 'lek') {
    const z = ekranLeka.zaglavlje();
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
  naPromenuRezima: () => ekranDana.iscrtaj(tekuciDan),
  naVracanjePodataka: () => ekranDana.iscrtaj(tekuciDan)
});

/* ── podsetnik na kopiju ──────────────────────────────────────────────── */
async function osveziPodsetnik() {
  const s = await stanjeCuvanja();
  const treba = trebaPodsetiti(s.danaZabelezeno);
  elPodsetnik.hidden = !treba;
  if (!treba) return;
  elPodsetnikTekst.textContent = s.poslednjaRezerva
    ? `Prošlo je više od mesec dana od poslednje kopije. Dnevnik ima ` +
      `${s.danaZabelezeno} zabeleženih dana — sačuvajte kopiju da se ne izgube.`
    : `Dnevnik ima ${s.danaZabelezeno} zabeleženih dana, a nijedna kopija još ` +
      'nije sačuvana. Kopija je jedino što preživi brisanje aplikacije.';
}

document.getElementById('podsetnik-sacuvaj').addEventListener('click', () => {
  sacuvajKopiju();
  elPodsetnik.hidden = true;
  javi('Kopija napravljena');
});
document.getElementById('podsetnik-kasnije').addEventListener('click', () => {
  odloziPodsetnik();
  elPodsetnik.hidden = true;
});

const ekranIzvestaja = napraviEkranIzvestaja();

/* Lekovi se vraćaju na spisak, a spisak na pregled dana — zato ekran lekova
   pamti odakle se u njega ušlo. */
let odakleULek = 'lekovi';

const ekranLekova = napraviEkranLekova({
  naOtvaranjeLeka: (id) => { odakleULek = 'lekovi'; ekranLeka.otvori(id); prikazi('lek'); },
  naJavljanje: javi,
  naIzmenu: () => ekranDana.iscrtaj(tekuciDan)
});

const ekranLeka = napraviEkranLeka({
  naZavrsetak: () => { ekranLekova.iscrtaj(tekuciDan); prikazi(odakleULek); },
  naJavljanje: javi
});

elKaLekovima.addEventListener('click', () => {
  ekranLekova.iscrtaj(tekuciDan);
  prikazi('lekovi');
});

document.getElementById('dodaj-lek').addEventListener('click', () => {
  odakleULek = 'lekovi';
  ekranLeka.otvori(null);
  prikazi('lek');
});

elKaIzvestaju.addEventListener('click', () => {
  ekranIzvestaja.iscrtaj(tekuciDan);
  prikazi('izvestaj');
});

elKaPodesavanjima.addEventListener('click', () => {
  ekranPodesavanja.iscrtaj();
  prikazi('podesavanja');
});

elNazad.addEventListener('click', () => {
  if (!ekrani.lek.hidden) { ekranLekova.iscrtaj(tekuciDan); prikazi('lekovi'); return; }
  ekranDana.iscrtaj(tekuciDan);
  prikazi('dan');
});

/* Kad se aplikacija vrati u prvi plan posle ponoći, dan više nije isti. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { upisiSada(); return; }
  if (!ekrani.dan.hidden && tekuciDan !== kljucDana()) {
    tekuciDan = kljucDana();
    ekranDana.iscrtaj(tekuciDan);
    elPodnaslov.textContent = imeDana(tekuciDan);
  }
});

ekranDana.iscrtaj(tekuciDan);
prikazi('dan');
osveziPodsetnik();

/* Pred zatvaranje ili prelazak u pozadinu upiši odmah, bez odlaganja —
   na telefonu aplikacija ume da bude ugašena bez najave. */
addEventListener('pagehide', () => { upisiSada(); });
addEventListener('beforeunload', () => { upisiSada(); });

/* Za proveru pri radu na modelu; aplikacija ovo ne koristi. */
globalThis.artron = { ekranDana, ekranUnosa, ekranPodesavanja, ekranIzvestaja,
                      ekranLekova, ekranLeka, prikazi };

/* ── rad bez mreže ────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  const registruj = () => navigator.serviceWorker.register('sw.js')
    .catch(() => { /* aplikacija radi i bez keša, samo ne i van mreže */ });

  /* Ovaj modul čeka učitavanje podataka, pa se izvrši tek POSLE događaja
     `load`. Kačenje na taj događaj tada više ništa ne bi pokrenulo — zato se
     prvo proverava da li je učitavanje već završeno. */
  if (document.readyState === 'complete') registruj();
  else addEventListener('load', registruj, { once: true });
}
