/**
 * Skladište — sve što aplikacija zna stoji ovde, u localStorage ovog telefona.
 * Nema servera; nijedan podatak ne napušta uređaj.
 *
 * Ceo sadržaj je jedan zapis pod jednim ključem. Kad dnevnik preraste par
 * megabajta, prelazi se na IndexedDB — zato ostatak aplikacije nikad ne dira
 * localStorage direktno, nego samo funkcije odavde.
 */

const KLJUC = 'artron.v1';
const VERZIJA = 1;

export const DELOVI = [
  { id: 'jutro', ime: 'Jutro', opis: 'Kako je počeo dan' },
  { id: 'podne', ime: 'Podne', opis: 'Sredina dana' },
  { id: 'vece',  ime: 'Veče',  opis: 'Kraj dana' }
];

const prazno = () => ({ verzija: VERZIJA, podesavanja: { rezim: { upalni: true, fibro: false } }, dani: {} });

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

/* ── izvedene mere ────────────────────────────────────────────────────── */

/**
 * Koliko je unos popunjen, u tri stepena — po meri iz dizajn-sistema, gde
 * oblik nosi značenje a boja ga samo pojačava.
 *  1 — samo jačina bola
 *  2 — uz to i označen bar jedan region
 *  3 — uz to i popunjena polja tog dela dana
 */
export function popunjenost(deo, unos) {
  if (!unos) return 0;
  let stepen = 1;
  if (Object.keys(unos.regioni ?? {}).length > 0) stepen = 2;
  if (dodatnaPopunjena(deo, unos)) stepen = 3;
  return stepen;
}

function dodatnaPopunjena(deo, u) {
  if (deo === 'jutro') return u.ukocenost != null && u.san != null;
  if (deo === 'podne') return u.opterecenje != null && u.umor != null;
  return u.umor != null && u.kvalitetDana != null;
}

export const brojRegiona = (unos) => Object.keys(unos?.regioni ?? {}).length;

/** Najjači zabeležen region — ono što se prvo pita kod lekara. */
export function najjaciRegion(unos) {
  let najbolje = null;
  for (const [id, r] of Object.entries(unos?.regioni ?? {})) {
    if (!najbolje || r.jacina > najbolje.jacina) najbolje = { id, ...r };
  }
  return najbolje;
}
