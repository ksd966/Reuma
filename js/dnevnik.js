/**
 * Dnevnik — svi dani u jednom spisku, najnoviji gore.
 *
 * Ovo je jedino mesto gde se odjednom vidi sve što je zabeleženo. Bez njega se
 * do ranijih dana stizalo samo strelicama, jedan po jedan.
 *
 * Dani bez ijednog unosa se preskaču; ne prikazuju se kao prazni redovi, jer
 * bi spisak onda bio uglavnom praznina.
 */

import {
  DELOVI, dohvatiDan, sviDani, imeDana, punDatum, izKljuca,
  brojRegiona, brojOteklih, rezim
} from './skladiste.js';
import { poljaZa, ispisi } from './polja.js';
import { imeRegiona, stepenZa } from './telo/regioni.js';
import { uzimanjaDana, lek } from './lekovi.js';

const PO_STRANI = 30;

const DANI = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];

export function napraviEkranDnevnika({ naIzborDana }) {
  const el = document.getElementById('dnevnik-sadrzaj');
  let prikazano = PO_STRANI;

  function iscrtaj(ponovoOdPocetka = true) {
    if (ponovoOdPocetka) prikazano = PO_STRANI;
    const kljucevi = Object.keys(sviDani()).sort().reverse();
    el.replaceChildren();

    if (!kljucevi.length) {
      const p = document.createElement('p');
      p.className = 'prazno-uputstvo';
      p.textContent =
        'Dnevnik je još prazan. Kad zabeležite prvi dan, ovde se pojavljuje spisak ' +
        'svih dana — najnoviji gore — sa sva tri unosa u jednom redu.';
      el.appendChild(p);
      return;
    }

    const zaglavlje = document.createElement('p');
    zaglavlje.className = 'uputstvo-levo';
    zaglavlje.textContent = `${kljucevi.length} ${
      kljucevi.length === 1 ? 'zabeležen dan' : 'zabeleženih dana'}, najnoviji gore. Dodirni dan da ga izmeniš.`;
    el.appendChild(zaglavlje);

    for (const k of kljucevi.slice(0, prikazano)) el.appendChild(red(k));

    if (kljucevi.length > prikazano) {
      const jos = document.createElement('button');
      jos.type = 'button';
      jos.className = 'dugme';
      jos.style.cssText = 'width:100%;margin-top:10px';
      jos.textContent = `Prikaži još ${Math.min(PO_STRANI, kljucevi.length - prikazano)}`;
      jos.addEventListener('click', () => { prikazano += PO_STRANI; iscrtaj(false); });
      el.appendChild(jos);
    }
  }

  function red(kljuc) {
    const dan = dohvatiDan(kljuc);
    const d = izKljuca(kljuc);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dnevnik-red';
    b.dataset.dan = kljuc;

    const naslov = document.createElement('p');
    naslov.className = 'dnevnik-red__dan';
    naslov.textContent = imeDana(kljuc) === 'danas' || imeDana(kljuc) === 'juče'
      ? `${imeDana(kljuc)} · ${punDatum(kljuc)}`
      : `${DANI[d.getDay()]} · ${punDatum(kljuc)}`;
    b.appendChild(naslov);

    /* Tri unosa u jednom redu — da se tok dana vidi bez otvaranja. */
    const tri = document.createElement('div');
    tri.className = 'dnevnik-red__tri';
    for (const deo of DELOVI) {
      const u = dan[deo.id];
      const c = document.createElement('span');
      c.className = 'dnevnik-celija';
      c.dataset.stanje = u ? 'uneto' : 'prazno';
      const ime = document.createElement('i');
      ime.textContent = deo.ime;
      const broj = document.createElement('b');
      if (u) {
        broj.textContent = String(u.bol ?? 0);
        broj.style.color = (u.bol ?? 0) > 0 ? stepenZa(u.bol).boja : 'var(--muted)';
      } else {
        broj.textContent = '—';
        broj.style.color = 'var(--dim)';
      }
      c.append(ime, broj);
      tri.appendChild(c);
    }
    b.appendChild(tri);

    const opis = saznaci(kljuc, dan);
    if (opis) {
      const p = document.createElement('p');
      p.className = 'dnevnik-red__opis';
      p.textContent = opis;
      b.appendChild(p);
    }

    b.setAttribute('aria-label', `${punDatum(kljuc)} — ${
      DELOVI.map(x => `${x.ime.toLowerCase()} ${dan[x.id] ? (dan[x.id].bol ?? 0) : 'nije uneto'}`).join(', ')
    }. Izmeni.`);
    b.addEventListener('click', () => naIzborDana(kljuc));
    return b;
  }

  /** Kratak opis dana: gde je bolelo, šta je još zabeleženo, koji lekovi. */
  function saznaci(kljuc, dan) {
    const r = rezim();
    const bolni = new Set(), otekli = new Set();
    for (const deo of DELOVI) {
      for (const [id, x] of Object.entries(dan[deo.id]?.regioni ?? {})) {
        if ((x.jacina ?? 0) > 0) bolni.add(id);
        if (x.oteklo) otekli.add(id);
      }
    }

    const delovi = [];
    if (bolni.size) {
      const spisak = [...bolni].slice(0, 3).map(imeRegiona).join(', ');
      delovi.push(bolni.size > 3 ? `${spisak} i još ${bolni.size - 3}` : spisak);
    }
    if (r.upalni && otekli.size) {
      delovi.push(`otečeno: ${otekli.size}`);
    }

    /* Iz svakog dela dana po jedno zabeleženo polje, da red ne naraste. */
    for (const deo of DELOVI) {
      const u = dan[deo.id];
      if (!u) continue;
      const prvo = poljaZa(deo.id, r).map(p => ispisi(p.id, u[p.id])).find(Boolean);
      if (prvo) delovi.push(prvo);
    }

    const uzeti = uzimanjaDana(kljuc);
    if (uzeti.length) {
      const imena = [...new Set(uzeti.map(u => lek(u.lekId)?.naziv).filter(Boolean))];
      if (imena.length) delovi.push(`lekovi: ${imena.slice(0, 2).join(', ')}${imena.length > 2 ? '…' : ''}`);
    }

    return delovi.slice(0, 5).join(' · ');
  }

  return { iscrtaj };
}
