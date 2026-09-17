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
  DELOVI, dohvatiDan, sviDani, imeDana, punDatum, izKljuca, kljucDana, jeBuducnost, rezim
} from './skladiste.js';
import { sazetakDana } from './statistika.js';
import { poljaZa, ispisi } from './polja.js';
import { imeRegiona, stepenZa } from './telo/regioni.js';
import { uzimanjaDana, lek } from './lekovi.js';

const PO_STRANI = 30;

const DANI = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];

const MESECI = ['januar','februar','mart','april','maj','jun',
                'jul','avgust','septembar','oktobar','novembar','decembar'];
const SKRACENI = ['Pon','Uto','Sre','Čet','Pet','Sub','Ned'];

export function napraviEkranDnevnika({ naIzborDana }) {
  const el = document.getElementById('dnevnik-sadrzaj');
  const elPrikaz = document.getElementById('dnevnik-prikaz');
  let prikazano = PO_STRANI;
  let prikaz = 'mesec';
  let mesec = null;              // prvi dan prikazanog meseca

  for (const b of elPrikaz.children) {
    b.addEventListener('click', () => {
      prikaz = b.dataset.prikaz;
      for (const x of elPrikaz.children) {
        x.setAttribute('aria-pressed', String(x.dataset.prikaz === prikaz));
      }
      iscrtaj();
    });
  }

  function iscrtaj(ponovoOdPocetka = true) {
    if (prikaz === 'mesec') return iscrtajMesec();
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

  /* ── mesec kao mreža ──────────────────────────────────────────────── */

  /**
   * Spisak od 60 dana je bio skoro osam ekrana skrolovanja i nije imao nijedan
   * način da se nešto nađe. Mesec staje u jedan ekran, a loša nedelja se vidi
   * kao niz obojenih polja — što spisak nikad nije pokazivao.
   */
  function iscrtajMesec() {
    el.replaceChildren();
    const danasKljuc = kljucDana();
    mesec ??= new Date(izKljuca(danasKljuc).getFullYear(), izKljuca(danasKljuc).getMonth(), 1);

    el.appendChild(traka());

    const mreza = document.createElement('div');
    mreza.className = 'mesec-mreza';
    for (const d of SKRACENI) {
      const c = document.createElement('div');
      c.className = 'mesec-mreza__dan';
      c.textContent = d;
      mreza.appendChild(c);
    }

    const godina = mesec.getFullYear(), m = mesec.getMonth();
    /* Nedelja počinje ponedeljkom, a getDay() nedeljom — otuda pomeranje. */
    const prviStubac = (new Date(godina, m, 1).getDay() + 6) % 7;
    const danaUMesecu = new Date(godina, m + 1, 0).getDate();

    for (let i = 0; i < prviStubac; i++) {
      const prazno = document.createElement('div');
      prazno.className = 'mesec-polje mesec-polje--prazan';
      mreza.appendChild(prazno);
    }

    let saUnosom = 0, zbir = 0;
    for (let d = 1; d <= danaUMesecu; d++) {
      const kljuc = `${godina}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const s = sazetakDana(kljuc);
      if (s) { saUnosom++; zbir += s.prosekBola; }
      mreza.appendChild(polje(kljuc, d, s, kljuc === danasKljuc));
    }
    el.appendChild(mreza);

    const zbirRed = document.createElement('p');
    zbirRed.className = 'mesec-zbir';
    zbirRed.textContent = saUnosom
      ? `${saUnosom} ${saUnosom === 1 ? 'zabeležen dan' : 'zabeleženih dana'} u ovom mesecu · ` +
        `prosek bola ${String((zbir / saUnosom).toFixed(1)).replace('.', ',')} od 10. ` +
        'Dodirni dan da ga izmeniš.'
      : 'U ovom mesecu nema nijednog zabeleženog dana.';
    el.appendChild(zbirRed);
  }

  function traka() {
    const t = document.createElement('div');
    t.className = 'mesec-traka';

    const strelica = (smer, oznaka, putanja) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dan-traka__strelica';
      b.setAttribute('aria-label', oznaka);
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19"
        fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
        stroke-linejoin="round"><path d="${putanja}"/></svg>`;
      b.addEventListener('click', () => {
        mesec = new Date(mesec.getFullYear(), mesec.getMonth() + smer, 1);
        iscrtajMesec();
      });
      return b;
    };

    const nazad = strelica(-1, 'Prethodni mesec', 'M15 4 L7 12 L15 20');
    const napred = strelica(1, 'Sledeći mesec', 'M9 4 L17 12 L9 20');
    /* Mesec koji tek dolazi nema šta da pokaže. */
    napred.disabled = jeBuducnost(
      `${mesec.getFullYear()}-${String(mesec.getMonth() + 2).padStart(2, '0')}-01`);

    const ime = document.createElement('p');
    ime.className = 'mesec-traka__ime';
    ime.setAttribute('aria-live', 'polite');
    ime.textContent = `${MESECI[mesec.getMonth()]} ${mesec.getFullYear()}.`;

    t.append(nazad, ime, napred);
    return t;
  }

  function polje(kljuc, broj, s, jeDanas) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mesec-polje';
    b.dataset.uneto = s ? 'da' : 'ne';
    if (jeDanas) b.dataset.danas = 'da';
    b.disabled = jeBuducnost(kljuc);

    const datum = document.createElement('span');
    datum.className = 'mesec-polje__datum';
    datum.textContent = String(broj);
    b.appendChild(datum);

    if (s) {
      /* Uz boju uvek ide i broj — boja sama ne sme da nosi podatak. */
      const t = document.createElement('span');
      t.className = 'mesec-polje__tacka';
      const zaokruzen = Math.round(s.prosekBola);
      t.textContent = String(zaokruzen);
      if (zaokruzen > 0) {
        const stepen = stepenZa(zaokruzen);
        t.style.background = stepen.boja;
        t.style.color = stepen.naBoji;
      } else {
        t.style.background = 'var(--line-strong)';
        t.style.color = 'var(--muted)';
      }
      b.appendChild(t);
      b.setAttribute('aria-label',
        `${punDatum(kljuc)} — prosek bola ${String(s.prosekBola).replace('.', ',')} od 10. Izmeni.`);
    } else {
      b.setAttribute('aria-label', `${punDatum(kljuc)} — nema unosa. Unesi.`);
    }

    b.addEventListener('click', () => naIzborDana(kljuc));
    return b;
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
