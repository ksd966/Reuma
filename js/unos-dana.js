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
import { POLJA } from './polja.js';
import {
  DELOVI, dohvatiUnos, upisiUnos, obrisiUnos, imeDana, punDatum, sadaHHMM
} from './skladiste.js';

export function napraviEkranUnosa({ naZavrsetak, naJavljanje }) {
  const elDodatna = document.getElementById('dodatna');
  const elSpisak = document.getElementById('spisak');
  const elPogledi = document.getElementById('pogledi');
  const elBolBroj = document.getElementById('bol-broj');
  const elBolRec = document.getElementById('bol-rec');
  const elBolKlizac = document.getElementById('bol-klizac');
  const elSacuvaj = document.getElementById('sacuvaj');
  const elObrisi = document.getElementById('obrisi-unos');

  let kljuc = null, deo = null, dodatnaVrednost = {};

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
    naPotvrdu: (id, u) => { mapa.postaviStanje(id, u); osveziRegion(id); },
    naUklanjanje: (id) => { mapa.postaviStanje(id, null); osveziRegion(id); },
    naZatvaranje: () => mapa.izaberi(null)
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
    if (unos) {
      b.dataset.oznacen = 'da';
      znak.hidden = false;
      znak.textContent = String(unos.jacina);
      znak.style.background = stepenZa(unos.jacina).boja;
      b.setAttribute('aria-label', `${PO_ID.get(id).ime} — bol ${unos.jacina} od 10`);
    } else {
      delete b.dataset.oznacen;
      znak.hidden = true;
      b.removeAttribute('aria-label');
    }
  }

  /* ── ukupna jačina ──────────────────────────────────────────────────── */
  function osveziBol() {
    const j = Number(elBolKlizac.value);
    elBolBroj.textContent = String(j);
    if (j === 0) {
      elBolRec.textContent = 'bez bola';
      elBolBroj.style.color = 'var(--dim)';
    } else {
      const s = stepenZa(j);
      elBolRec.textContent = s.ime;
      elBolBroj.style.color = s.boja;
    }
  }
  elBolKlizac.addEventListener('input', osveziBol);

  /* ── pitanja uz deo dana ────────────────────────────────────────────── */
  function iscrtajDodatna() {
    elDodatna.replaceChildren();
    const polja = POLJA[deo] ?? [];
    if (!polja.length) return;

    const naslov = document.createElement('h2');
    naslov.className = 'naslov-odeljka';
    naslov.textContent = DELOVI.find(d => d.id === deo).opis;
    elDodatna.appendChild(naslov);

    for (const polje of polja) {
      elDodatna.appendChild(polje.vrsta === 'izbor' ? poljeIzbor(polje) : poljeKlizac(polje));
    }
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

  function poljeKlizac(polje) {
    const okvir = zaglavljePolja(polje);

    const prikaz = document.createElement('div');
    prikaz.className = 'polje__vrednost';
    const broj = document.createElement('span');
    broj.className = 'polje__broj tabular';
    const rec = document.createElement('span');
    rec.className = 'polje__rec';
    prikaz.append(broj, rec);

    const klizac = document.createElement('input');
    klizac.type = 'range';
    klizac.className = 'klizac';
    klizac.min = String(polje.min);
    klizac.max = String(polje.max);
    klizac.step = '1';
    klizac.setAttribute('aria-label', `${polje.ime} od ${polje.min} do ${polje.max}`);
    klizac.value = String(dodatnaVrednost[polje.id] ?? 0);

    const skala = document.createElement('div');
    skala.className = 'skala';
    skala.setAttribute('aria-hidden', 'true');
    skala.innerHTML = `<span>${polje.min}</span><span>${Math.round((polje.min + polje.max) / 2)}</span><span>${polje.max}</span>`;

    const osvezi = () => {
      const v = Number(klizac.value);
      dodatnaVrednost[polje.id] = v;
      broj.textContent = String(v);
      rec.textContent = v === 0 ? 'nimalo' : v <= 3 ? 'malo' : v <= 6 ? 'osrednje' : v <= 8 ? 'mnogo' : 'vrlo mnogo';
    };
    klizac.addEventListener('input', osvezi);
    osvezi();

    okvir.append(prikaz, klizac, skala);
    return okvir;
  }

  /* ── otvaranje i čuvanje ────────────────────────────────────────────── */
  function otvori(noviKljuc, noviDeo) {
    kljuc = noviKljuc;
    deo = noviDeo;
    const unos = dohvatiUnos(kljuc, deo);

    elBolKlizac.value = String(unos?.bol ?? 0);
    osveziBol();

    mapa.ocistiSve();
    for (const r of REGIONI) osveziRegion(r.id);
    for (const [id, r] of Object.entries(unos?.regioni ?? {})) {
      if (!PO_ID.has(id)) continue;          // region uklonjen iz neke starije verzije
      mapa.postaviStanje(id, r);
      osveziRegion(id);
    }

    dodatnaVrednost = {};
    for (const polje of POLJA[deo] ?? []) {
      if (unos?.[polje.id] != null) dodatnaVrednost[polje.id] = unos[polje.id];
    }
    iscrtajDodatna();

    elObrisi.hidden = !unos;
    mapa.osvezi();
    scrollTo(0, 0);
  }

  elSacuvaj.addEventListener('click', () => {
    const regioni = {};
    for (const [id, r] of mapa.svaStanja()) regioni[id] = r;

    const unos = { bol: Number(elBolKlizac.value), vreme: sadaHHMM(), regioni };
    for (const polje of POLJA[deo] ?? []) {
      if (dodatnaVrednost[polje.id] != null) unos[polje.id] = dodatnaVrednost[polje.id];
    }

    const ime = DELOVI.find(d => d.id === deo).ime.toLowerCase();
    if (upisiUnos(kljuc, deo, unos)) {
      naJavljanje(`Sačuvano — ${ime}, ${imeDana(kljuc) === 'danas' ? 'danas' : punDatum(kljuc)}`);
      naZavrsetak();
    } else {
      naJavljanje('Nije moglo da se sačuva — nema mesta na uređaju');
    }
  });

  elObrisi.addEventListener('click', () => {
    obrisiUnos(kljuc, deo);
    naJavljanje('Unos obrisan');
    naZavrsetak();
  });

  return {
    otvori,
    zaglavlje: () => ({
      naslov: DELOVI.find(d => d.id === deo)?.ime ?? '',
      podnaslov: imeDana(kljuc) === 'danas' ? 'danas' : punDatum(kljuc)
    })
  };
}
