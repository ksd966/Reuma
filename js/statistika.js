/**
 * Sažimanje dnevnika u izveštaj za period.
 *
 * Sve se računa iz onoga što je korisnik uneo. Dani bez unosa se ne
 * popunjavaju ničim i ne ulaze u prosek — prosek od nepostojećih dana bio bi
 * izmišljen podatak.
 */

import { DELOVI, dohvatiDan, pomeriDan, kljucDana, izKljuca } from './skladiste.js';
import { primeneLeka } from './lekovi.js';

export const PERIODI = [
  { id: 'nedelja', ime: 'Nedelja',   dana: 7,   grupa: 'dan' },
  { id: 'mesec',   ime: 'Mesec',     dana: 30,  grupa: 'dan' },
  { id: 'pola',    ime: '6 meseci',  dana: 182, grupa: 'nedelja' },
  { id: 'godina',  ime: 'Godina',    dana: 365, grupa: 'mesec' }
];

const MESECI_KRATKO = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun',
                       'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
const DANI_SLOVO = ['N', 'P', 'U', 'S', 'Č', 'P', 'S'];

const prosek = (niz) => (niz.length ? niz.reduce((a, b) => a + b, 0) / niz.length : null);
const zaokruzi = (x) => (x == null ? null : Math.round(x * 10) / 10);

/** Ključevi dana od najstarijeg do najnovijeg. */
export function rasponDana(kraj, brojDana) {
  const dani = [];
  for (let i = brojDana - 1; i >= 0; i--) dani.push(pomeriDan(kraj, -i));
  return dani;
}

/**
 * Sažetak jednog dana, ili null ako tog dana nema nijednog unosa.
 * `bezBola` je dan u kom je sve zabeleženo na nuli i nijedan region ne boli —
 * to je podatak koliko i bolan dan, pa se broji zasebno.
 */
export function sazetakDana(kljuc) {
  const dan = dohvatiDan(kljuc);
  const unosi = DELOVI.map(d => [d.id, dan[d.id]]).filter(([, u]) => u);
  if (!unosi.length) return null;

  const bolovi = unosi.map(([, u]) => u.bol ?? 0);
  const bolni = new Set(), otekli = new Set();
  for (const [, u] of unosi) {
    for (const [id, r] of Object.entries(u.regioni ?? {})) {
      if ((r.jacina ?? 0) > 0) bolni.add(id);
      if (r.oteklo) otekli.add(id);
    }
  }

  const poDelu = {};
  for (const [deo, u] of unosi) poDelu[deo] = u.bol ?? 0;

  return {
    kljuc,
    prosekBola: zaokruzi(prosek(bolovi)),
    najjaciBol: Math.max(...bolovi),
    bezBola: bolovi.every(b => b === 0) && bolni.size === 0,
    brojUnosa: unosi.length,
    poDelu,
    bolniRegioni: [...bolni],
    otekliRegioni: [...otekli],
    umor: zaokruzi(prosek(unosi.map(([, u]) => u.umor).filter(x => x != null))),
    magla: zaokruzi(prosek(unosi.map(([, u]) => u.magla).filter(x => x != null))),
    ukocenost: dan.jutro?.ukocenost ?? null
  };
}

/** Stubići grafika: po danu, po nedelji ili po mesecu, zavisno od dužine perioda. */
function stubici(dani, grupa) {
  if (grupa === 'dan') {
    return dani.map(k => {
      const s = sazetakDana(k);
      const d = izKljuca(k);
      return {
        kljuc: k,
        vrednost: s?.prosekBola ?? null,
        oznaka: d.getDate() === 1 ? MESECI_KRATKO[d.getMonth()] : String(d.getDate()),
        slovo: DANI_SLOVO[d.getDay()],
        naslov: `${d.getDate()}. ${MESECI_KRATKO[d.getMonth()]}`,
        danaSaUnosom: s ? 1 : 0
      };
    });
  }

  const kofe = new Map();
  for (const k of dani) {
    const d = izKljuca(k);
    let id, oznaka, naslov;
    if (grupa === 'mesec') {
      id = `${d.getFullYear()}-${d.getMonth()}`;
      oznaka = MESECI_KRATKO[d.getMonth()];
      naslov = `${MESECI_KRATKO[d.getMonth()]} ${d.getFullYear()}.`;
    } else {
      /* Nedelje se broje unazad od kraja perioda, da poslednja bude puna. */
      const i = dani.indexOf(k);
      const brojNedelje = Math.floor((dani.length - 1 - i) / 7);
      id = `n${brojNedelje}`;
      const pocetak = izKljuca(dani[Math.max(0, dani.length - (brojNedelje + 1) * 7)]);
      oznaka = String(pocetak.getDate());
      naslov = `nedelja od ${pocetak.getDate()}. ${MESECI_KRATKO[pocetak.getMonth()]}`;
    }
    if (!kofe.has(id)) kofe.set(id, { kljuc: id, oznaka, naslov, vrednosti: [], danaSaUnosom: 0 });
    const s = sazetakDana(k);
    if (s) { kofe.get(id).vrednosti.push(s.prosekBola); kofe.get(id).danaSaUnosom++; }
  }
  /* Kofe nastaju redom kojim se prolazi kroz dane — od najstarijeg ka
     najnovijem — pa se taj redosled zadržava: vreme na grafiku teče udesno. */
  return [...kofe.values()].map(k => ({ ...k, vrednost: zaokruzi(prosek(k.vrednosti)) }));
}

/** Ceo izveštaj za period koji se završava danom `kraj`. */
export function izvestaj(kraj, period, rezim) {
  const dani = rasponDana(kraj, period.dana);
  const sazeci = dani.map(sazetakDana).filter(Boolean);

  const prethodni = rasponDana(pomeriDan(kraj, -period.dana), period.dana)
    .map(sazetakDana).filter(Boolean);

  /* Koliko je puta koji region bolео u periodu — ne koliko je jak bio, nego
     u koliko dana se javio; to je ono što se vidi na mapi najčešćih. */
  const brojac = new Map();
  const brojacOteklih = new Map();
  for (const s of sazeci) {
    for (const id of s.bolniRegioni) brojac.set(id, (brojac.get(id) ?? 0) + 1);
    for (const id of s.otekliRegioni) brojacOteklih.set(id, (brojacOteklih.get(id) ?? 0) + 1);
  }
  const najcesci = [...brojac.entries()]
    .map(([id, broj]) => ({ id, broj, oteklo: brojacOteklih.get(id) ?? 0 }))
    .sort((a, b) => b.broj - a.broj || a.id.localeCompare(b.id));

  const najjaci = sazeci.reduce((a, b) => (!a || b.najjaciBol > a.najjaciBol ? b : a), null);

  const poDelu = {};
  for (const d of DELOVI) {
    const v = sazeci.map(s => s.poDelu[d.id]).filter(x => x != null);
    poDelu[d.id] = { prosek: zaokruzi(prosek(v)), broj: v.length };
  }

  const sviProseci = sazeci.map(s => s.prosekBola);
  return {
    period,
    od: dani[0],
    doDana: dani[dani.length - 1],
    danaUkupno: period.dana,
    danaSaUnosom: sazeci.length,
    danaBezBolova: sazeci.filter(s => s.bezBola).length,
    brojUnosa: sazeci.reduce((a, s) => a + s.brojUnosa, 0),
    prosekBola: zaokruzi(prosek(sviProseci)),
    prosekPrethodni: zaokruzi(prosek(prethodni.map(s => s.prosekBola))),
    danaPrethodni: prethodni.length,
    najjaciDan: najjaci && najjaci.najjaciBol > 0 ? najjaci : null,
    poDelu,
    najcesci,
    stubici: stubici(dani, period.grupa),
    prosekUmora: rezim?.fibro ? zaokruzi(prosek(sazeci.map(s => s.umor).filter(x => x != null))) : null,
    prosekMagle: rezim?.fibro ? zaokruzi(prosek(sazeci.map(s => s.magla).filter(x => x != null))) : null,
    oteklihUkupno: rezim?.upalni ? brojacOteklih.size : null,
    prosekUkocenosti: rezim?.upalni
      ? Math.round(prosek(sazeci.map(s => s.ukocenost).filter(x => x != null)) ?? NaN) || null
      : null
  };
}

/**
 * Kako bol ide u odnosu na dan ciklusa biološke terapije.
 *
 * Ovo je prikaz koji lekar traži: ako bol raste pred sledeću dozu, to mora da
 * se vidi na prvi pogled. Za svaki dan ciklusa (0 = dan primene) skupljaju se
 * proseci svih dana koji su na tom mestu u ciklusu, pa se uzima njihov prosek.
 *
 * Dani bez unosa se preskaču; dan ciklusa u kom nema nijednog zabeleženog dana
 * ostaje prazan, a ne nula.
 */
export function bolPoDanuCiklusa(lekId, ciklusDana, danas = kljucDana()) {
  const primene = primeneLeka(lekId);
  if (!primene.length || !ciklusDana) return null;

  const kofe = Array.from({ length: ciklusDana }, () => []);
  let ciklusa = 0;

  for (let i = 0; i < primene.length; i++) {
    const pocetak = primene[i].datum;
    /* Ciklus se završava sledećom primenom, ili posle zadatog broja dana —
       šta pre dođe. Tekući ciklus staje na današnjem danu. */
    const sledeca = primene[i + 1]?.datum;
    const kraj = [sledeca, pomeriDan(pocetak, ciklusDana), pomeriDan(danas, 1)]
      .filter(Boolean).sort()[0];
    let imaPodatka = false;

    for (let d = 0; d < ciklusDana; d++) {
      const kljuc = pomeriDan(pocetak, d);
      if (kljuc >= kraj) break;
      const s = sazetakDana(kljuc);
      if (!s) continue;
      kofe[d].push(s.prosekBola);
      imaPodatka = true;
    }
    if (imaPodatka) ciklusa++;
  }

  const tacke = kofe.map((v, d) => ({
    dan: d,
    prosek: v.length ? zaokruzi(prosek(v)) : null,
    brojDana: v.length
  }));

  const saPodatkom = tacke.filter(t => t.prosek != null);
  if (saPodatkom.length < 2) return { tacke, ciklusa, dovoljno: false, ciklusDana };

  /* Poređenje prve i poslednje trećine ciklusa — da li bol raste pred dozu. */
  const trecina = Math.max(1, Math.floor(ciklusDana / 3));
  const pocetni = tacke.slice(0, trecina).filter(t => t.prosek != null).map(t => t.prosek);
  const zavrsni = tacke.slice(-trecina).filter(t => t.prosek != null).map(t => t.prosek);
  const razlikaKrajeva = (pocetni.length && zavrsni.length)
    ? zaokruzi(prosek(zavrsni) - prosek(pocetni)) : null;

  return {
    tacke, ciklusa, ciklusDana, dovoljno: true,
    pocetakCiklusa: zaokruzi(prosek(pocetni)),
    krajCiklusa: zaokruzi(prosek(zavrsni)),
    razlikaKrajeva
  };
}

export { MESECI_KRATKO, DANI_SLOVO, kljucDana };
