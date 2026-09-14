/**
 * Skladište — sve što aplikacija zna stoji ovde, u localStorage ovog telefona.
 * Nema servera; nijedan podatak ne napušta uređaj.
 *
 * Ceo sadržaj je jedan zapis pod jednim ključem. Kad dnevnik preraste par
 * megabajta, prelazi se na IndexedDB — zato ostatak aplikacije nikad ne dira
 * localStorage direktno, nego samo funkcije odavde.
 */

import { poljaZa } from './polja.js';

const KLJUC = 'artron.v1';
const VERZIJA = 1;

export const DELOVI = [
  { id: 'jutro', ime: 'Jutro', opis: 'Kako je počeo dan' },
  { id: 'podne', ime: 'Podne', opis: 'Sredina dana' },
  { id: 'vece',  ime: 'Veče',  opis: 'Kraj dana' }
];

const PODRAZUMEVANI_REZIM = { upalni: false, fibro: false };

const prazno = () => ({
  verzija: VERZIJA,
  podesavanja: { rezim: { ...PODRAZUMEVANI_REZIM } },
  dani: {}
});

let podaci = null;

function ucitaj() {
  if (podaci) return podaci;
  try {
    const sirovo = localStorage.getItem(KLJUC);
    podaci = sirovo ? JSON.parse(sirovo) : prazno();
  } catch {
    podaci = prazno();          // pokvaren zapis ne sme da obori aplikaciju
  }
  if (!podaci || podaci.verzija !== VERZIJA) podaci = prazno();
  podaci.dani ||= {};
  podaci.podesavanja ||= {};
  podaci.podesavanja.rezim = { ...PODRAZUMEVANI_REZIM, ...podaci.podesavanja.rezim };
  return podaci;
}

function upisi() {
  try {
    localStorage.setItem(KLJUC, JSON.stringify(ucitaj()));
    return true;
  } catch {
    return false;               // pun disk ili privatni režim
  }
}

/* ── datumi ───────────────────────────────────────────────────────────── */

const MESECI = ['januar', 'februar', 'mart', 'april', 'maj', 'jun',
                'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
const DANI = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];

/** Ključ dana u obliku 2026-09-13; lokalni datum, ne UTC. */
export function kljucDana(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function izKljuca(kljuc) {
  const [g, m, d] = kljuc.split('-').map(Number);
  return new Date(g, m - 1, d);
}

export function pomeriDan(kljuc, koliko) {
  const d = izKljuca(kljuc);
  d.setDate(d.getDate() + koliko);
  return kljucDana(d);
}

export const jeDanas = (kljuc) => kljuc === kljucDana();
export const jeBuducnost = (kljuc) => kljuc > kljucDana();

/** „danas", „juče", inače „subota, 13. septembar". */
export function imeDana(kljuc) {
  if (jeDanas(kljuc)) return 'danas';
  if (kljuc === pomeriDan(kljucDana(), -1)) return 'juče';
  const d = izKljuca(kljuc);
  return `${DANI[d.getDay()]}, ${d.getDate()}. ${MESECI[d.getMonth()]}`;
}

export function punDatum(kljuc) {
  const d = izKljuca(kljuc);
  const godina = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}.` : '';
  return `${d.getDate()}. ${MESECI[d.getMonth()]}${godina}`;
}

export const sadaHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* ── unosi ────────────────────────────────────────────────────────────── */

export function dohvatiDan(kljuc) {
  return ucitaj().dani[kljuc] ?? {};
}

export function dohvatiUnos(kljuc, deo) {
  return dohvatiDan(kljuc)[deo] ?? null;
}

export function upisiUnos(kljuc, deo, unos) {
  const p = ucitaj();
  p.dani[kljuc] ||= {};
  p.dani[kljuc][deo] = { ...unos, upisano: Date.now() };
  return upisi();
}

export function obrisiUnos(kljuc, deo) {
  const p = ucitaj();
  if (!p.dani[kljuc]) return true;
  delete p.dani[kljuc][deo];
  if (Object.keys(p.dani[kljuc]).length === 0) delete p.dani[kljuc];
  return upisi();
}

export function podesavanja() {
  return ucitaj().podesavanja;
}

export const rezim = () => ucitaj().podesavanja.rezim;

export function postaviRezim(noviRezim) {
  ucitaj().podesavanja.rezim = { ...PODRAZUMEVANI_REZIM, ...noviRezim };
  return upisi();
}

/* ── izvedene mere ────────────────────────────────────────────────────── */

/**
 * Koliko je unos popunjen, u tri stepena — po meri iz dizajn-sistema, gde
 * oblik nosi značenje a boja ga samo pojačava.
 *  1 — samo jačina bola
 *  2 — uz to i označen bar jedan region
 *  3 — uz to i sva pitanja tog dela dana
 */
export function popunjenost(deo, unos, rezimSad = rezim()) {
  if (!unos) return 0;
  let stepen = 1;
  if (Object.keys(unos.regioni ?? {}).length > 0) stepen = 2;
  const polja = poljaZa(deo, rezimSad);
  if (polja.length && polja.every(p => unos[p.id] != null)) stepen = 3;
  return stepen;
}

export const brojRegiona = (unos) => Object.keys(unos?.regioni ?? {}).length;

/** Regioni sa zabeleženim bolom, odvojeno od onih samo otečenih. */
export const brojBolnih = (unos) =>
  Object.values(unos?.regioni ?? {}).filter(r => (r.jacina ?? 0) > 0).length;

export const brojOteklih = (unos) =>
  Object.values(unos?.regioni ?? {}).filter(r => r.oteklo).length;

/**
 * Lični zbir za praćenje kroz vreme.
 *
 * Namerno se ne zove skorom i ne primenjuje nikakve zvanične kriterijume —
 * to su brojevi koje je korisnik sam uneo, sabrani da bi mogao da uporedi
 * jedan dan sa drugim. Tumačenje je na lekaru.
 */
export function zbirDana(kljuc, rezimSad = rezim()) {
  const dan = dohvatiDan(kljuc);
  const unosi = DELOVI.map(d => dan[d.id]).filter(Boolean);
  if (!unosi.length) return null;

  const svi = new Set();
  const otekli = new Set();
  for (const u of unosi) {
    for (const [id, r] of Object.entries(u.regioni ?? {})) {
      if ((r.jacina ?? 0) > 0) svi.add(id);
      if (r.oteklo) otekli.add(id);
    }
  }

  const prosek = (polje) => {
    const v = unosi.map(u => u[polje]).filter(x => x != null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };

  return {
    bolnihPodrucja: svi.size,
    oteklihZglobova: otekli.size,
    prosekBola: prosek('bol'),
    prosekUmora: rezimSad.fibro ? prosek('umor') : null,
    prosekMagle: rezimSad.fibro ? prosek('magla') : null,
    ukocenost: dan.jutro?.ukocenost ?? null,
    brojUnosa: unosi.length
  };
}

/** Najjači zabeležen region — ono što se prvo pita kod lekara. */
export function najjaciRegion(unos) {
  let najbolje = null;
  for (const [id, r] of Object.entries(unos?.regioni ?? {})) {
    if (!najbolje || r.jacina > najbolje.jacina) najbolje = { id, ...r };
  }
  return najbolje;
}
