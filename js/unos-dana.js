/**
 * Ekran unosa za jedan deo dana.
 *
 * Nosi ukupnu jačinu bola, mapu tela sa regionima i pitanja koja idu uz taj
 * deo dana. Mapa tela se pravi jednom i preživljava sve prelaze — WebGL
 * kontekst je skup, a ionako je uvek ista.
 */

import { napraviMapuTela, POGLEDI } from './telo/mapa-tela.js';
import { napraviList } from './unos.js';
import { REGIONI, GRUPE, PO_ID, stepenZa } from './telo/regioni.js';

/* Ista boja kao na mapi tela za zglob koji je otečen a ne boli. */
const BOJA_OTEKLINE = '#5A6FD6';
import { poljaZa } from './polja.js';
import { napraviSkalu, recZaJacinu, recZaMeru } from './skala.js';
import {
  DELOVI, dohvatiUnos, upisiUnos, obrisiUnos, imeDana, punDatum, sadaHHMM, rezim,
  poslednjiUnos
} from './skladiste.js';

export function napraviEkranUnosa({ naZavrsetak, naJavljanje }) {
  const elDodatna = document.getElementById('dodatna');
  const elSpisak = document.getElementById('spisak');
  const elPogledi = document.getElementById('pogledi');
  const elBolBroj = document.getElementById('bol-broj');
  const elBolRec = document.getElementById('bol-rec');
  const elBolSkala = document.getElementById('bol-skala');
  const elSacuvaj = document.getElementById('sacuvaj');
  const elObrisi = document.getElementById('obrisi-unos');
  const elLegendaOblik = document.getElementById('legenda-oblik');
  const elBezBola = document.getElementById('unos-bez-bola');
  const elPrepisi = document.getElementById('prepisi');
  const elPrepisiIme = document.getElementById('prepisi-ime');
  const elPrepisiPod = document.getElementById('prepisi-pod');
  const elSpisakPrekidac = document.getElementById('spisak-prekidac');

  /* Spisak od 36 regiona je sklopljen: razvučen, gurao je dugme za čuvanje i
     ostatak pitanja daleko nadole. */
  elSpisakPrekidac.addEventListener('click', () => {
    const otvoren = elSpisakPrekidac.getAttribute('aria-expanded') === 'true';
    elSpisakPrekidac.setAttribute('aria-expanded', String(!otvoren));
    elSpisak.hidden = otvoren;
  });

  let kljuc = null, deo = null, dodatnaVrednost = {};
  let bolRucno = false;          // da li je korisnik sam dirao ukupnu jačinu

  /* ── spisak regiona ─────────────────────────────────────────────────── */
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

  /* ── dugmad pogleda ─────────────────────────────────────────────────── */
  for (const p of POGLEDI) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.ime;
    b.dataset.pogled = p.id;
    b.setAttribute('aria-pressed', String(p.id === 'napred'));
    b.addEventListener('click', () => mapa.naPogled(p.id));
    elPogledi.appendChild(b);
  }

  /* ── mapa i list ────────────────────────────────────────────────────── */
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

  const list = napraviList({
    naPotvrdu: (id, u) => { mapa.postaviStanje(id, u); osveziRegion(id); izvediBol(); },
    naUklanjanje: (id) => { mapa.postaviStanje(id, null); osveziRegion(id); izvediBol(); },
    naZatvaranje: () => mapa.izaberi(null)
  });

  /* Kod hroničnog bola ista mesta bole iz dana u dan — prepisivanje poslednjeg
     unosa štedi najviše koraka, ostane samo da se popravi jačina. */
  elPrepisi.addEventListener('click', () => {
    const p = poslednjiUnos(deo, kljuc);
    if (!p) return;
    mapa.ocistiSve();
    for (const r of REGIONI) osveziRegion(r.id);
    for (const [id, r] of Object.entries(p.unos.regioni ?? {})) {
      if (!PO_ID.has(id)) continue;
      mapa.postaviStanje(id, { ...r });
      osveziRegion(id);
    }
    bolRucno = false;
    izvediBol();
    naJavljanje?.(`Prepisano sa ${punDatum(p.kljuc)}`);
  });

  function otvoriRegion(id, poreklo) {
    const region = PO_ID.get(id);
    if (!region) return;
    mapa.izaberi(id);
    list.otvori(region, mapa.stanjeRegiona(id), poreklo);
  }

  function osveziRegion(id) {
    const b = dugmadRegiona.get(id);
    if (!b) return;
    const unos = mapa.stanjeRegiona(id);
    const znak = b.querySelector('b');
    if (!unos) {
      delete b.dataset.oznacen;
      delete znak.dataset.oteklo;
      znak.hidden = true;
      b.removeAttribute('aria-label');
      return;
    }
    const jacina = unos.jacina ?? 0;
    b.dataset.oznacen = 'da';
    znak.hidden = false;
    znak.textContent = jacina > 0 ? String(jacina) : '';
    znak.style.background = jacina > 0 ? stepenZa(jacina).boja : BOJA_OTEKLINE;
    if (unos.oteklo) znak.dataset.oteklo = 'da'; else delete znak.dataset.oteklo;

    const delovi = [PO_ID.get(id).ime];
    delovi.push(jacina > 0 ? `bol ${jacina} od 10` : 'bez bola');
    if (unos.oteklo) delovi.push('otečen');
    if (unos.toplo) delovi.push('topao');
    if (unos.crveno) delovi.push('crven');
    b.setAttribute('aria-label', delovi.join(' — '));
  }

  /* ── ukupna jačina ──────────────────────────────────────────────────── */
  const bolSkala = napraviSkalu(elBolSkala, {
    oznaka: 'Ukupna jačina bola od 0 do 10',
    naIzbor: () => { bolRucno = true; osveziBol(); }
  });

  /**
   * Dok korisnik sam ne dodirne ukupnu jačinu, ona prati najjači označen
   * region. Tako se za većinu unosa ukupan bol uopšte ne mora posebno birati.
   */
  function izvediBol() {
    if (bolRucno) return;
    let najjaci = 0;
    for (const r of mapa.svaStanja().values()) najjaci = Math.max(najjaci, r.jacina ?? 0);
    bolSkala.postavi(najjaci);
    osveziBol();
  }

  function osveziBol() {
    const j = bolSkala.vrednost() ?? 0;
    elBolBroj.textContent = String(j);
    elBolRec.textContent = recZaJacinu(j);
    elBolBroj.style.color = j === 0 ? 'var(--dim)' : stepenZa(j).boja;
  }

  /* ── pitanja uz deo dana ────────────────────────────────────────────── */
  function iscrtajDodatna() {
    elDodatna.replaceChildren();
    const polja = poljaZa(deo, rezim());
    if (!polja.length) return;

    const naslov = document.createElement('h2');
    naslov.className = 'naslov-odeljka';
    naslov.textContent = DELOVI.find(d => d.id === deo).opis;
    elDodatna.appendChild(naslov);

    const crtaci = {
      izbor: poljeIzbor,
      mera: poljeMere,
      prekidac: poljePrekidac,
      viseizbor: poljeViseizbor
    };
    for (const polje of polja) {
      elDodatna.appendChild((crtaci[polje.vrsta] ?? poljeMere)(polje));
    }
  }

  /** Da/ne, sa trećim mogućim stanjem — neodgovoreno. */
  function poljePrekidac(polje) {
    const okvir = zaglavljePolja(polje);
    const red = document.createElement('div');
    red.className = 'izbori';
    red.setAttribute('role', 'group');
    red.setAttribute('aria-labelledby', `polje-${polje.id}`);

    for (const o of [{ v: true, ime: 'Da' }, { v: false, ime: 'Ne' }]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.ime;
      b.dataset.vrednost = String(o.v);
      b.setAttribute('aria-pressed', String(dodatnaVrednost[polje.id] === o.v));
      b.addEventListener('click', () => {
        dodatnaVrednost[polje.id] = dodatnaVrednost[polje.id] === o.v ? undefined : o.v;
        for (const d of red.children) {
          d.setAttribute('aria-pressed', String((d.dataset.vrednost === 'true') === dodatnaVrednost[polje.id]));
        }
      });
      red.appendChild(b);
    }
    okvir.appendChild(red);
    return okvir;
  }

  /** Više odgovora odjednom; vrednost je spisak izabranog. */
  function poljeViseizbor(polje) {
    const okvir = zaglavljePolja(polje);
    const red = document.createElement('div');
    red.className = 'izbori';
    red.setAttribute('role', 'group');
    red.setAttribute('aria-labelledby', `polje-${polje.id}`);
    dodatnaVrednost[polje.id] ??= [];

    for (const o of polje.opcije) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.ime;
      b.setAttribute('aria-pressed', String(dodatnaVrednost[polje.id].includes(o.v)));
      b.addEventListener('click', () => {
        const spisak = dodatnaVrednost[polje.id];
        const i = spisak.indexOf(o.v);
        if (i >= 0) spisak.splice(i, 1); else spisak.push(o.v);
        b.setAttribute('aria-pressed', String(i < 0));
      });
      red.appendChild(b);
    }
    okvir.appendChild(red);
    return okvir;
  }

  function zaglavljePolja(polje) {
    const okvir = document.createElement('div');
    okvir.className = 'polje';
    const ime = document.createElement('p');
    ime.className = 'polje__ime';
    ime.id = `polje-${polje.id}`;
    ime.textContent = polje.ime;
    okvir.appendChild(ime);
    if (polje.opis) {
      const opis = document.createElement('p');
      opis.className = 'polje__opis';
      opis.textContent = polje.opis;
      okvir.appendChild(opis);
    }
    return okvir;
  }

  function poljeIzbor(polje) {
    const okvir = zaglavljePolja(polje);
    const red = document.createElement('div');
    red.className = 'izbori';
    red.setAttribute('role', 'group');
    red.setAttribute('aria-labelledby', `polje-${polje.id}`);

    for (const o of polje.opcije) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.ime;
      b.dataset.vrednost = String(o.v);
      b.setAttribute('aria-pressed', String(dodatnaVrednost[polje.id] === o.v));
      b.addEventListener('click', () => {
        /* Ponovni dodir na već izabrano poništava izbor — da se greška ispravi
           bez brisanja celog unosa. */
        dodatnaVrednost[polje.id] = dodatnaVrednost[polje.id] === o.v ? undefined : o.v;
        for (const d of red.children) {
          d.setAttribute('aria-pressed', String(Number(d.dataset.vrednost) === dodatnaVrednost[polje.id]));
        }
      });
      red.appendChild(b);
    }
    okvir.appendChild(red);
    return okvir;
  }

  function poljeMere(polje) {
    const okvir = zaglavljePolja(polje);

    const prikaz = document.createElement('div');
    prikaz.className = 'polje__vrednost';
    const broj = document.createElement('span');
    broj.className = 'polje__broj tabular';
    const rec = document.createElement('span');
    rec.className = 'polje__rec';
    prikaz.append(broj, rec);
    okvir.appendChild(prikaz);

    const tabla = document.createElement('div');
    okvir.appendChild(tabla);

    /* Polje koje korisnik nije dodirnuo NIJE odgovor — dok se ne dodirne stoji
       crtica. Da se vrednost upisivala već pri iscrtavanju, svaki unos bi
       nosio umor 0 i magla 0, pa bi prosek bio izmišljen podatak. */
    const skala = napraviSkalu(tabla, {
      min: polje.min, max: polje.max,
      oznaka: `${polje.ime} od ${polje.min} do ${polje.max}`,
      bojiPoJacini: false,
      praznoDozvoljeno: true,
      naIzbor: (v) => { dodatnaVrednost[polje.id] = v ?? undefined; osvezi(); }
    });

    function osvezi() {
      const v = dodatnaVrednost[polje.id];
      broj.textContent = v == null ? '—' : String(v);
      broj.style.color = v == null ? 'var(--dim)' : '';
      rec.textContent = recZaMeru(v);
    }

    skala.postavi(dodatnaVrednost[polje.id] ?? null);
    osvezi();
    return okvir;
  }

  /* ── otvaranje i čuvanje ────────────────────────────────────────────── */
  function otvori(noviKljuc, noviDeo) {
    kljuc = noviKljuc;
    deo = noviDeo;
    const unos = dohvatiUnos(kljuc, deo);

    bolRucno = unos?.bol != null;
    bolSkala.postavi(unos?.bol ?? 0);
    osveziBol();

    const raniji = poslednjiUnos(deo, kljuc);
    elPrepisi.hidden = !raniji;
    if (raniji) {
      /* „Kao juče" se čita brže od datuma, a datum ostaje kad je stariji. */
      const kada = imeDana(raniji.kljuc);
      elPrepisiIme.textContent = kada === 'juče' || kada === 'danas'
        ? `Kao ${kada}` : `Kao ${punDatum(raniji.kljuc)}`;
      const n = Object.keys(raniji.unos.regioni ?? {}).length;
      elPrepisiPod.textContent = n ? `${n} ${n === 1 ? 'region' : 'regiona'}` : '';
      elPrepisi.setAttribute('aria-label',
        `Prepiši unos sa ${punDatum(raniji.kljuc)}${n ? `, ${n} ${n === 1 ? 'region' : 'regiona'}` : ''}`);
    }

    mapa.ocistiSve();
    for (const r of REGIONI) osveziRegion(r.id);
    for (const [id, r] of Object.entries(unos?.regioni ?? {})) {
      if (!PO_ID.has(id)) continue;          // region uklonjen iz neke starije verzije
      mapa.postaviStanje(id, r);
      osveziRegion(id);
    }

    dodatnaVrednost = {};
    for (const polje of poljaZa(deo, rezim())) {
      if (unos?.[polje.id] != null) {
        dodatnaVrednost[polje.id] = Array.isArray(unos[polje.id])
          ? [...unos[polje.id]] : unos[polje.id];
      }
    }
    iscrtajDodatna();

    elLegendaOblik.hidden = !rezim().upalni;
    elObrisi.hidden = !unos;
    elSpisakPrekidac.setAttribute('aria-expanded', 'false');
    elSpisak.hidden = true;
    scrollTo(0, 0);
  }

  elSacuvaj.addEventListener('click', () => {
    const regioni = {};
    for (const [id, r] of mapa.svaStanja()) regioni[id] = r;

    const unos = { bol: bolSkala.vrednost() ?? 0, vreme: sadaHHMM(), regioni };
    for (const polje of poljaZa(deo, rezim())) {
      const v = dodatnaVrednost[polje.id];
      if (v == null) continue;
      if (Array.isArray(v) && v.length === 0) continue;   // prazan spisak nije odgovor
      unos[polje.id] = v;
    }

    const ime = DELOVI.find(d => d.id === deo).ime.toLowerCase();
    if (upisiUnos(kljuc, deo, unos)) {
      naJavljanje(`Sačuvano — ${ime}, ${imeDana(kljuc) === 'danas' ? 'danas' : punDatum(kljuc)}`);
      naZavrsetak();
    } else {
      naJavljanje('Nije moglo da se sačuva — nema mesta na uređaju');
    }
  });

  /* Jedan dodir za deo dana u kom ništa ne boli: nula, bez ijednog regiona. */
  elBezBola.addEventListener('click', () => {
    bolRucno = true;
    bolSkala.postavi(0);
    osveziBol();
    for (const id of [...mapa.svaStanja().keys()]) {
      mapa.postaviStanje(id, null);
      osveziRegion(id);
    }
    elSacuvaj.click();
  });

  elObrisi.addEventListener('click', () => {
    obrisiUnos(kljuc, deo);
    naJavljanje('Unos obrisan');
    naZavrsetak();
  });

  return {
    otvori,
    /* Zove se pošto je ekran prikazan: dok je bio sakriven, platno nije imalo
       veličinu pa se telo ne bi iscrtalo. */
    osveziMapu: () => mapa.osvezi(),
    zaglavlje: () => ({
      naslov: DELOVI.find(d => d.id === deo)?.ime ?? '',
      podnaslov: imeDana(kljuc) === 'danas' ? 'danas' : punDatum(kljuc)
    })
  };
}
