/**
 * Lekovi — tri vrste, jer se različito prate.
 *
 *   stalni      uzimaju se svakog dana u zadato vreme; prati se da li jesu
 *   poPotrebi   uzimaju se kad zatreba; broj puta dnevno i nedeljno je sam
 *               po sebi pokazatelj kako je nedelja prošla
 *   bioloska    daju se u ciklusu; prati se odbrojavanje do sledeće, mesto
 *               primene sa rotacijom i reakcija
 *
 * Aplikacija ne predlaže doze, ne savetuje promenu terapije i ne upozorava na
 * interakcije. Samo beleži ono što korisnik unese.
 */

import { deoStanja, sacuvajStanje, kljucDana, pomeriDan, izKljuca, sadaHHMM } from './skladiste.js';

export const VRSTE = [
  { id: 'stalni',    ime: 'Stalni',      opis: 'Svakog dana u isto vreme' },
  { id: 'poPotrebi', ime: 'Po potrebi',  opis: 'Kad zatreba' },
  { id: 'bioloska',  ime: 'Biološka',    opis: 'U ciklusu, injekcija ili infuzija' }
];

export const NACINI = [
  { id: 'potkozno', ime: 'Potkožno' },
  { id: 'infuzija', ime: 'Infuzija' }
];

/** Mesta primene idu ovim redom; aplikacija predlaže sledeće po redu. */
export const MESTA = [
  { id: 'stomak-levo',      ime: 'Stomak levo' },
  { id: 'stomak-desno',     ime: 'Stomak desno' },
  { id: 'butina-leva',      ime: 'Butina leva' },
  { id: 'butina-desna',     ime: 'Butina desna' },
  { id: 'nadlaktica-leva',  ime: 'Nadlaktica leva' },
  { id: 'nadlaktica-desna', ime: 'Nadlaktica desna' }
];

export const REAKCIJE = [
  { id: 'nista',    ime: 'Ništa' },
  { id: 'crvenilo', ime: 'Crvenilo' },
  { id: 'oteklina', ime: 'Oteklina' },
  { id: 'bol',      ime: 'Bol' }
];

/** Ciklus se zadaje u danima; ponuđeni razmaci pokrivaju uobičajene terapije. */
export const CIKLUSI = [
  { v: 7,   ime: 'svakih 7 dana' },
  { v: 14,  ime: 'svakih 14 dana' },
  { v: 21,  ime: 'svake 3 nedelje' },
  { v: 28,  ime: 'svake 4 nedelje' },
  { v: 42,  ime: 'svakih 6 nedelja' },
  { v: 56,  ime: 'svakih 8 nedelja' },
  { v: 84,  ime: 'svakih 12 nedelja' }
];

const noviId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const lekoviSvi = () => deoStanja('lekovi', []);
const uzimanjaSva = () => deoStanja('uzimanja', []);
const primeneSve = () => deoStanja('primene', []);

/* ── spisak lekova ───────────────────────────────────────────────────── */

export const lekovi = () => lekoviSvi().filter(l => !l.sklonjen);
export const lekoviVrste = (vrsta) => lekovi().filter(l => l.vrsta === vrsta);
export const lek = (id) => lekoviSvi().find(l => l.id === id) ?? null;

export function upisiLek(podaci) {
  const svi = lekoviSvi();
  if (podaci.id) {
    const i = svi.findIndex(l => l.id === podaci.id);
    if (i >= 0) svi[i] = { ...svi[i], ...podaci };
  } else {
    svi.push({ ...podaci, id: noviId(), dodat: Date.now() });
  }
  sacuvajStanje();
  return svi[svi.length - 1];
}

/**
 * Lek se ne briše nego sklanja: zabeležena uzimanja ostaju u dnevniku, jer je
 * i prestanak terapije podatak koji lekar traži.
 */
export function skloniLek(id) {
  const l = lek(id);
  if (l) { l.sklonjen = Date.now(); sacuvajStanje(); }
}

export function vratiLek(id) {
  const l = lek(id);
  if (l) { delete l.sklonjen; sacuvajStanje(); }
}

/* ── uzimanja (stalni i po potrebi) ──────────────────────────────────── */

export const uzimanjaDana = (datum) => uzimanjaSva().filter(u => u.datum === datum);

export const uzimanjaLeka = (lekId, datum) =>
  uzimanjaSva().filter(u => u.lekId === lekId && u.datum === datum);

/** Koliko je puta uzet lek po potrebi u poslednjih `dana` dana, zaključno sa `datum`. */
export function brojUzimanja(lekId, datum, dana) {
  const od = pomeriDan(datum, -(dana - 1));
  return uzimanjaSva().filter(u => u.lekId === lekId && u.datum >= od && u.datum <= datum).length;
}

export function zabeleziUzimanje(lekId, datum, vreme = sadaHHMM()) {
  uzimanjaSva().push({ id: noviId(), lekId, datum, vreme });
  sacuvajStanje();
}

export function ponistiUzimanje(lekId, datum) {
  const svi = uzimanjaSva();
  /* Poništava se poslednje zabeleženo tog dana — to je ono što je korisnik
     upravo dodao ako je pogrešio. */
  for (let i = svi.length - 1; i >= 0; i--) {
    if (svi[i].lekId === lekId && svi[i].datum === datum) { svi.splice(i, 1); sacuvajStanje(); return true; }
  }
  return false;
}

/* ── biološka terapija ───────────────────────────────────────────────── */

export const primeneLeka = (lekId) =>
  primeneSve().filter(p => p.lekId === lekId).sort((a, b) => a.datum.localeCompare(b.datum));

export const poslednjaPrimena = (lekId) => primeneLeka(lekId).at(-1) ?? null;

export function zabeleziPrimenu({ lekId, datum, mesto, reakcija, beleska }) {
  primeneSve().push({ id: noviId(), lekId, datum, mesto, reakcija, beleska, upisano: Date.now() });
  sacuvajStanje();
}

export function obrisiPrimenu(id) {
  const svi = primeneSve();
  const i = svi.findIndex(p => p.id === id);
  if (i >= 0) { svi.splice(i, 1); sacuvajStanje(); }
}

/** Sledeće mesto po redu rotacije, posle poslednjeg upotrebljenog. */
export function sledeceMesto(lekId) {
  const poslednja = poslednjaPrimena(lekId);
  if (!poslednja?.mesto) return MESTA[0];
  const i = MESTA.findIndex(m => m.id === poslednja.mesto);
  return MESTA[(i + 1) % MESTA.length];
}

/**
 * Odbrojavanje do sledeće doze.
 * `preostalo` je negativno ako je dan prošao — tada piše da kasni, a ne
 * izmišljen broj dana unapred.
 */
export function odbrojavanje(l, danas = kljucDana()) {
  const poslednja = poslednjaPrimena(l.id);
  if (!poslednja || !l.ciklusDana) return null;
  const sledeci = pomeriDan(poslednja.datum, l.ciklusDana);
  const razlika = Math.round((izKljuca(sledeci) - izKljuca(danas)) / 86_400_000);
  const proteklo = Math.round((izKljuca(danas) - izKljuca(poslednja.datum)) / 86_400_000);
  return { poslednja, sledeci, preostalo: razlika, danCiklusa: proteklo, ciklus: l.ciklusDana };
}

/** Ima li uopšte biološke terapije — od toga zavisi da li se odeljak prikazuje. */
export const imaBiolosku = () => lekoviVrste('bioloska').length > 0;
