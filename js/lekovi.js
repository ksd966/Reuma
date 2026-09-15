/**
 * Lekovi.
 *
 * Lek ima tri nezavisne osobine, jer se ranije mešale u jednu „vrstu" pa
 * metotreksat — nedeljna tableta — nije imao gde da stane:
 *
 *   raspored   kada se uzima: svaki dan, određenim danima u nedelji,
 *              na svakih N dana, ili po potrebi
 *   nacin      kako se uzima: tableta, injekcija, infuzija
 *   doza       koliko, onako kako je korisnik otkucao
 *
 * Od `nacin` zavisi šta se beleži: tableta se samo potvrdi, injekcija nosi i
 * mesto uboda sa rotacijom, infuzija reakciju ali ne i mesto (ide u venu).
 * Od `raspored` zavisi kada se lek uopšte pojavi kao „danas na redu".
 *
 * Aplikacija ne predlaže doze, ne savetuje promenu terapije i ne upozorava na
 * uzajamna dejstva. Samo beleži ono što korisnik unese.
 */

import { deoStanja, sacuvajStanje, kljucDana, pomeriDan, izKljuca, sadaHHMM } from './skladiste.js';

export const RASPOREDI = [
  { id: 'dnevno',    ime: 'Svaki dan',       opis: 'Jednom ili više puta dnevno' },
  { id: 'nedeljno',  ime: 'Danima u nedelji', opis: 'Na primer svakog četvrtka' },
  { id: 'ciklus',    ime: 'Na svakih N dana', opis: 'Biološka terapija' },
  { id: 'poPotrebi', ime: 'Po potrebi',      opis: 'Kad zatreba' }
];

export const NACINI = [
  { id: 'tableta',   ime: 'Tableta' },
  { id: 'injekcija', ime: 'Injekcija' },
  { id: 'infuzija',  ime: 'Infuzija' }
];

/* Ponedeljak je 1, nedelja 7 — kao u razgovoru, ne kao u JavaScriptu. */
export const DANI_NEDELJE = [
  { v: 1, ime: 'Pon', puno: 'ponedeljkom' },
  { v: 2, ime: 'Uto', puno: 'utorkom' },
  { v: 3, ime: 'Sre', puno: 'sredom' },
  { v: 4, ime: 'Čet', puno: 'četvrtkom' },
  { v: 5, ime: 'Pet', puno: 'petkom' },
  { v: 6, ime: 'Sub', puno: 'subotom' },
  { v: 7, ime: 'Ned', puno: 'nedeljom' }
];

export const danUNedelji = (kljuc) => ((izKljuca(kljuc).getDay() + 6) % 7) + 1;

/** Ponuđena vremena za 1, 2 i 3 doze dnevno — biraju se pločicom, ne točkićem. */
export const PODRAZUMEVANA_VREMENA = { 1: ['08:00'], 2: ['08:00', '20:00'], 3: ['08:00', '14:00', '20:00'] };

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
  { v: 3,   ime: 'svaka 3 dana' },
  { v: 4,   ime: 'svaka 4 dana' },
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
export const lekoviRasporeda = (vrsta) => lekovi().filter(l => l.raspored?.vrsta === vrsta);

/** Injekcija i infuzija se beleže kao „primena" — nose reakciju, injekcija i mesto. */
export const beleziPrimenu = (l) => l?.nacin === 'injekcija' || l?.nacin === 'infuzija';
export const beleziMesto = (l) => l?.nacin === 'injekcija';
export const lek = (id) => lekoviSvi().find(l => l.id === id) ?? null;

/**
 * Prevodi lekove sa stare podele („stalni / po potrebi / biološka") na
 * raspored + način. Ništa se ne briše i ne gubi: zabeležena uzimanja i primene
 * ostaju gde su bila, menja se samo opis samog leka.
 *
 * Pokreće se pri svakom pokretanju i ne radi ništa kad nema šta da prevede.
 */
export function migrirajLekove() {
  const svi = lekoviSvi();
  let menjano = 0;

  for (const l of svi) {
    if (l.raspored) continue;                 // već preveden
    if (l.vrsta === 'bioloska') {
      l.raspored = { vrsta: 'ciklus', ciklusDana: l.ciklusDana ?? 14 };
      /* Stari „potkozno" je bio jedini način ubrizgavanja koji je postojao. */
      l.nacin = l.nacin === 'infuzija' ? 'infuzija' : 'injekcija';
    } else if (l.vrsta === 'poPotrebi') {
      l.raspored = { vrsta: 'poPotrebi' };
      l.nacin = 'tableta';
    } else {
      /* Sve ostalo je bilo „stalni", što je značilo svaki dan. */
      l.raspored = { vrsta: 'dnevno', vremena: l.vremena?.length ? [...l.vremena] : ['08:00'] };
      l.nacin = 'tableta';
    }
    delete l.vrsta;
    delete l.vremena;
    delete l.ciklusDana;
    menjano++;
  }

  if (menjano) sacuvajStanje();
  return menjano;
}

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

/**
 * Podesi broj zabeleženih uzimanja tog dana na tačno `ciljni`.
 *
 * Kvadratići se ranije punili odozgo: dodir na drugu dozu je štiklirao prvu,
 * jer se gledao samo broj. Sad dodir na dozu po redu `i` znači „uzeto ih je
 * i+1", a skidanje štiklice sa nje znači „uzeto ih je i".
 */
export function postaviBrojUzimanja(lekId, datum, ciljni) {
  let sada = uzimanjaLeka(lekId, datum).length;
  while (sada < ciljni) { zabeleziUzimanje(lekId, datum); sada++; }
  while (sada > ciljni) { ponistiUzimanje(lekId, datum); sada--; }
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

/* ── jedinstven pogled na zabeleženo ─────────────────────────────────── */

/**
 * Sve što je za taj lek zabeleženo, bez obzira gde stoji.
 *
 * Tablete idu u „uzimanja", injekcije i infuzije u „primene" — dva zapisa jer
 * nose različite podatke. Odbrojavanje, grafik ciklusa i izvoz ih odavde
 * gledaju kao jedan niz, pa ne moraju da znaju u kom su spremištu.
 */
export function dogadjajiLeka(lekId) {
  const l = lek(lekId);
  if (!l) return [];
  if (beleziPrimenu(l)) return primeneLeka(lekId);
  return uzimanjaSva()
    .filter(u => u.lekId === lekId)
    .sort((a, b) => a.datum.localeCompare(b.datum) || (a.vreme ?? '').localeCompare(b.vreme ?? ''));
}

export const poslednjiDogadjaj = (lekId) => dogadjajiLeka(lekId).at(-1) ?? null;

/**
 * Odbrojavanje do sledeće doze, samo za lekove u ciklusu.
 * `preostalo` je negativno ako je dan prošao — tada piše da kasni, a ne
 * izmišljen broj dana unapred.
 */
export function odbrojavanje(l, danas = kljucDana()) {
  const ciklus = l?.raspored?.vrsta === 'ciklus' ? l.raspored.ciklusDana : null;
  const poslednja = ciklus ? poslednjiDogadjaj(l.id) : null;
  if (!poslednja || !ciklus) return null;
  const sledeci = pomeriDan(poslednja.datum, ciklus);
  const razlika = Math.round((izKljuca(sledeci) - izKljuca(danas)) / 86_400_000);
  const proteklo = Math.round((izKljuca(danas) - izKljuca(poslednja.datum)) / 86_400_000);
  return { poslednja, sledeci, preostalo: razlika, danCiklusa: proteklo, ciklus };
}

/* ── šta je danas na redu ────────────────────────────────────────────── */

/**
 * Doze koje po rasporedu padaju na zadati dan, sa podatkom da li su već
 * zabeležene. Ovo je jedini izvor istine i za ekran Dan i za ekran Lekovi —
 * inače bi dva mesta mogla da tvrde različito.
 *
 * Lek „po potrebi" se ovde ne pojavljuje: on nema red, broji se koliko puta
 * je uzet.
 */
export function naReduNa(datum = kljucDana()) {
  const red = [];

  for (const l of lekovi()) {
    const r = l.raspored;
    if (!r || r.vrsta === 'poPotrebi') continue;

    if (r.vrsta === 'ciklus') {
      const o = odbrojavanje(l, datum);
      /* Bez ijedne zabeležene primene ne zna se kad je sledeća, pa se lek nudi
         odmah — tako se odbrojavanje uopšte i pokreće. */
      const dospelo = !o || o.preostalo <= 0;
      if (!dospelo) continue;
      const vecDanas = dogadjajiLeka(l.id).some(d => d.datum === datum);
      red.push({ lek: l, kljuc: `${l.id}#0`, redni: 0, vreme: null, uzeto: vecDanas,
                 kasni: !!o && o.preostalo < 0 });
      continue;
    }

    if (r.vrsta === 'nedeljno' && !(r.dani ?? []).includes(danUNedelji(datum))) continue;

    const vremena = r.vremena?.length ? r.vremena : ['08:00'];
    const zabelezeno = beleziPrimenu(l)
      ? primeneLeka(l.id).filter(p => p.datum === datum).length
      : uzimanjaLeka(l.id, datum).length;

    vremena.forEach((v, i) => {
      red.push({ lek: l, kljuc: `${l.id}#${i}`, redni: i, vreme: v, uzeto: i < zabelezeno, kasni: false });
    });
  }

  /* Bez vremena (ciklus) ide na vrh — to je događaj dana, ne rutina. */
  return red.sort((a, b) => (a.vreme ?? '').localeCompare(b.vreme ?? ''));
}

/** Rečenica koja opisuje raspored, za spisak lekova i za podsetnike. */
export function opisRasporeda(l) {
  const r = l?.raspored;
  if (!r) return '';
  if (r.vrsta === 'poPotrebi') return 'po potrebi';
  if (r.vrsta === 'ciklus') {
    return CIKLUSI.find(c => c.v === r.ciklusDana)?.ime ?? `svakih ${r.ciklusDana} dana`;
  }
  const vremena = r.vremena?.length ? r.vremena : ['08:00'];
  if (r.vrsta === 'nedeljno') {
    const dani = (r.dani ?? []).map(d => DANI_NEDELJE.find(x => x.v === d)?.puno).filter(Boolean);
    if (!dani.length) return 'nije zadat dan';
    return `${dani.join(', ')} u ${vremena.join(' i ')}`;
  }
  return vremena.length === 1
    ? `svaki dan u ${vremena[0]}`
    : `svaki dan, ${vremena.length}× (${vremena.join(', ')})`;
}

/** Ima li lekova u ciklusu — od toga zavisi da li se odeljak prikazuje. */
export const imaCiklus = () => lekoviRasporeda('ciklus').length > 0;
