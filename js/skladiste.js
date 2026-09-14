/**
 * Skladište — sve što aplikacija zna stoji ovde, na ovom telefonu.
 * Nema servera; nijedan podatak ne napušta uređaj.
 *
 * Čitanje je trenutno, iz stanja u memoriji. Upis ide na dva mesta odjednom:
 * u IndexedDB (glavno, trajnije) i u localStorage (ogledalo, da se pri
 * pokretanju pročita odmah). Vidi `trajnost.js` za razlog.
 *
 * Ostatak aplikacije nikad ne dira skladište direktno, nego samo funkcije
 * odavde — zato je ova izmena stala na jedno mesto.
 */

import { poljaZa } from './polja.js';
import {
  pripremiBazu, bazaDostupna, citajIzBaze, pisiUBazu, zatraziTrajnost, stanjeSkladista
} from './trajnost.js';

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
  dani: {},
  izmenjeno: 0,
  poslednjaRezerva: null
});

let podaci = null;
let zakazanUpis = null;
let lokalnoRadi = true;

function ispravi(x) {
  if (!x || typeof x !== 'object' || x.verzija !== VERZIJA) return null;
  x.dani ||= {};
  x.podesavanja ||= {};
  x.podesavanja.rezim = { ...PODRAZUMEVANI_REZIM, ...x.podesavanja.rezim };
  x.izmenjeno ||= 0;
  return x;
}

function izLokalnog() {
  try {
    const sirovo = localStorage.getItem(KLJUC);
    return sirovo ? ispravi(JSON.parse(sirovo)) : null;
  } catch {
    return null;                // pokvaren zapis ne sme da obori aplikaciju
  }
}

/**
 * Pokretanje: otvori bazu, pročitaj oba mesta i uzmi novije. Ako je jedno
 * prazno a drugo puno, to je prelazak sa starog načina čuvanja ili oporavak
 * posle brisanja jednog od njih — u oba slučaja se puni ono prazno.
 */
export async function pripremi() {
  await pripremiBazu();
  const uBazi = ispravi(await citajIzBaze());
  const uLokalnom = izLokalnog();

  podaci = (!uBazi && !uLokalnom) ? prazno()
    : !uBazi ? uLokalnom
    : !uLokalnom ? uBazi
    : (uBazi.izmenjeno >= uLokalnom.izmenjeno ? uBazi : uLokalnom);

  /* Poravnaj oba mesta na isto stanje. */
  upisiLokalno();
  await pisiUBazu(podaci);
  await zatraziTrajnost();
  return podaci;
}

function ucitaj() {
  /* Ako se nešto pozove pre `pripremi`, radi se sa onim što je u localStorage —
     aplikacija nikad ne sme da padne zato što skladište još nije spremno. */
  podaci ??= izLokalnog() ?? prazno();
  return podaci;
}

function upisiLokalno() {
  try {
    localStorage.setItem(KLJUC, JSON.stringify(podaci));
    lokalnoRadi = true;
  } catch {
    lokalnoRadi = false;        // pun disk ili privatni režim
  }
  return lokalnoRadi;
}

/**
 * Upis ide u memoriju odmah, u localStorage odmah, a u bazu sa malim odlaganjem
 * — pri brzom nizu izmena (klizač, više regiona) inače bi se pisalo na svaku.
 */
function upisi() {
  ucitaj().izmenjeno = Date.now();
  const lokalno = upisiLokalno();
  clearTimeout(zakazanUpis);
  zakazanUpis = setTimeout(() => { pisiUBazu(podaci); }, 400);
  return lokalno || bazaDostupna();
}

/** Upiši odmah, bez odlaganja — pred zatvaranje aplikacije. */
export function upisiSada() {
  clearTimeout(zakazanUpis);
  upisiLokalno();
  return pisiUBazu(podaci);
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

/**
 * Delovi dana koji su do sada stigli. Za raniji dan to su sva tri; za danas
 * samo oni koji su prošli, jer se o veču u devet ujutru ne može ništa reći.
 */
export function stigliDelovi(kljuc) {
  if (jeBuducnost(kljuc)) return [];
  if (kljuc < kljucDana()) return DELOVI.map(d => d.id);
  const sat = new Date().getHours();
  const stigli = ['jutro'];
  if (sat >= 11) stigli.push('podne');
  if (sat >= 17) stigli.push('vece');
  return stigli;
}

/** Delovi koji su stigli a još nisu popunjeni — ono što „ništa me ne boli" puni. */
export function praznoAStiglo(kljuc) {
  const dan = dohvatiDan(kljuc);
  return stigliDelovi(kljuc).filter(deo => !dan[deo]);
}

/**
 * Zabeleži da ništa ne boli, u jednom dodiru.
 *
 * Dan bez bolova je podatak koliko i bolan dan — bez njega se u izveštaju ne
 * vidi razlika između „bilo je dobro" i „nisam stigao da unesem".
 * Popunjavaju se samo prazni delovi; već uneto se ne dira.
 */
export function upisiBezBola(kljuc, delovi = praznoAStiglo(kljuc)) {
  const p = ucitaj();
  if (!delovi.length) return [];
  p.dani[kljuc] ||= {};
  for (const deo of delovi) {
    p.dani[kljuc][deo] = { bol: 0, vreme: sadaHHMM(), regioni: {}, upisano: Date.now() };
  }
  return upisi() ? delovi : [];
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
/* ── kopija podataka ──────────────────────────────────────────────────── */

/**
 * Ceo dnevnik kao tekst, za čuvanje u datoteku.
 *
 * Jedino ovo preživi i brisanje aplikacije i zamenu telefona — zato
 * podešavanja na to i podsećaju kad kopije dugo nema.
 */
export function izvezi() {
  const p = ucitaj();
  return JSON.stringify({
    aplikacija: 'Artron',
    verzija: VERZIJA,
    napravljeno: new Date().toISOString(),
    podesavanja: p.podesavanja,
    dani: p.dani
  }, null, 1);
}

export function imeKopije() {
  return `artron-kopija-${kljucDana()}.json`;
}

export function zabeleziRezervu() {
  ucitaj().poslednjaRezerva = Date.now();
  upisi();
}

export const poslednjaRezerva = () => ucitaj().poslednjaRezerva ?? null;

/**
 * Vrati podatke iz kopije.
 *
 * Dani se SPAJAJU, ne zamenjuju: vraćanje starije kopije ne sme da obriše ono
 * što je u međuvremenu uneto. Kad se isti dan nađe na oba mesta, uzima se
 * onaj iz kopije, jer je korisnik njega namerno vratio.
 */
export function uvezi(tekst) {
  let k;
  try { k = JSON.parse(tekst); }
  catch { throw new Error('Datoteka nije ispravna — nije čitljiv zapis.'); }

  if (!k || typeof k !== 'object' || !k.dani || typeof k.dani !== 'object') {
    throw new Error('Datoteka ne sadrži dnevnik Artrona.');
  }
  if (k.verzija !== VERZIJA) {
    throw new Error(`Kopija je iz verzije ${k.verzija ?? '?'}, a aplikacija radi sa ${VERZIJA}.`);
  }

  const p = ucitaj();
  let novih = 0, izmenjenih = 0;
  for (const [kljuc, dan] of Object.entries(k.dani)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(kljuc) || !dan || typeof dan !== 'object') continue;
    if (p.dani[kljuc]) izmenjenih++; else novih++;
    p.dani[kljuc] = dan;
  }
  if (k.podesavanja?.rezim) {
    p.podesavanja.rezim = { ...PODRAZUMEVANI_REZIM, ...k.podesavanja.rezim };
  }
  upisi();
  return { novih, izmenjenih, ukupno: Object.keys(p.dani).length };
}

/** Stanje čuvanja za prikaz u podešavanjima. */
export async function stanjeCuvanja() {
  const s = await stanjeSkladista();
  const p = ucitaj();
  return {
    ...s,
    ogledalo: lokalnoRadi,
    danaZabelezeno: Object.keys(p.dani).length,
    velicinaZapisa: new Blob([JSON.stringify(p)]).size,
    poslednjaRezerva: p.poslednjaRezerva ?? null
  };
}

export function najjaciRegion(unos) {
  let najbolje = null;
  for (const [id, r] of Object.entries(unos?.regioni ?? {})) {
    if (!najbolje || r.jacina > najbolje.jacina) najbolje = { id, ...r };
  }
  return najbolje;
}
