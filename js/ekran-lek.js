/**
 * Unos i izmena jednog leka.
 *
 * Spisak lekova se pamti, pa se posle unosi sa nekoliko dodira — zato se ovde
 * kuca samo naziv i doza, a sve ostalo se bira.
 */

import {
  RASPOREDI, NACINI, CIKLUSI, DANI_NEDELJE, PODRAZUMEVANA_VREMENA,
  lek, upisiLek, skloniLek, vratiLek
} from './lekovi.js';

export function napraviEkranLeka({ naZavrsetak, naJavljanje }) {
  const elNaziv = document.getElementById('lek-naziv');
  const elDoza = document.getElementById('lek-doza');
  const elNacin = document.getElementById('lek-nacin');
  const elRaspored = document.getElementById('lek-raspored');
  const elDodatno = document.getElementById('lek-dodatno');
  const elSacuvaj = document.getElementById('lek-sacuvaj');
  const elSkloni = document.getElementById('lek-skloni');
  const elPoruka = document.getElementById('lek-poruka');

  let tekuci = null;          // null = nov lek
  let nacin = 'tableta';
  let rasporedVrsta = 'dnevno';
  let ciklusDana = 14;
  let vremena = ['08:00'];
  let dani = [];              // 1 = ponedeljak … 7 = nedelja

  /* ── izbori ───────────────────────────────────────────────────────── */

  /** Napuni postojeći okvir dugmadima za izbor jedne vrednosti. */
  function napuni(r, opcije, izabrano, naIzbor) {
    r.replaceChildren();
    for (const o of opcije) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.ime;
      b.dataset.vrednost = String(o.v ?? o.id);
      b.setAttribute('aria-pressed', String((o.v ?? o.id) === izabrano));
      b.addEventListener('click', () => {
        naIzbor(o.v ?? o.id);
        for (const d of r.children) {
          d.setAttribute('aria-pressed', String(d.dataset.vrednost === String(o.v ?? o.id)));
        }
      });
      r.appendChild(b);
    }
    return r;
  }

  /** Isto, ali u novom okviru. */
  function red(opcije, izabrano, naIzbor) {
    const r = document.createElement('div');
    r.className = 'izbori';
    r.setAttribute('role', 'group');
    return napuni(r, opcije, izabrano, naIzbor);
  }

  function naslovPolja(tekst, opis) {
    const okvir = document.createElement('div');
    okvir.className = 'polje';
    const ime = document.createElement('p');
    ime.className = 'polje__ime';
    ime.textContent = tekst;
    okvir.appendChild(ime);
    if (opis) {
      const o = document.createElement('p');
      o.className = 'polje__opis';
      o.textContent = opis;
      okvir.appendChild(o);
    }
    return okvir;
  }

  /** Prekidači za više vrednosti odjednom — dani u nedelji. */
  function viseRed(opcije, izabrano, naIzmenu) {
    const r = document.createElement('div');
    r.className = 'izbori';
    r.setAttribute('role', 'group');
    for (const o of opcije) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.ime;
      b.setAttribute('aria-label', o.puno ?? o.ime);
      b.setAttribute('aria-pressed', String(izabrano.includes(o.v)));
      b.addEventListener('click', () => {
        naIzmenu(o.v);
        b.setAttribute('aria-pressed', String(!(b.getAttribute('aria-pressed') === 'true')));
      });
      r.appendChild(b);
    }
    return r;
  }

  /**
   * Koliko puta dnevno — pločicom, ne vrtenjem točkića za svaku dozu.
   * Ponuđena vremena se posle mogu pomeriti, ali retko i treba.
   */
  function poljeDoza() {
    const okvir = naslovPolja('Koliko puta dnevno');
    const broj = [1, 2, 3].map(n => ({ v: n, ime: `${n}×` }));
    okvir.appendChild(red(broj, vremena.length, (n) => {
      vremena = [...PODRAZUMEVANA_VREMENA[n]];
      iscrtajDodatno();
    }));

    const vrem = document.createElement('div');
    vrem.className = 'vremena';
    vremena.forEach((v, i) => {
      const u = document.createElement('input');
      u.type = 'time';
      u.className = 'unos';
      u.value = v;
      u.setAttribute('aria-label', `Vreme ${i + 1}. doze`);
      u.addEventListener('change', () => {
        if (u.value) vremena[i] = u.value;
      });
      vrem.appendChild(u);
    });
    okvir.appendChild(vrem);
    return okvir;
  }

  /* ── polja koja zavise od rasporeda ───────────────────────────────── */
  function iscrtajDodatno() {
    elDodatno.replaceChildren();

    if (rasporedVrsta === 'nedeljno') {
      const a = naslovPolja('Kojim danima', 'Metotreksat se obično pije jednom nedeljno');
      a.appendChild(viseRed(DANI_NEDELJE, dani, (v) => {
        dani = dani.includes(v) ? dani.filter(x => x !== v) : [...dani, v].sort();
      }));
      elDodatno.append(a, poljeDoza());
      return;
    }

    if (rasporedVrsta === 'dnevno') {
      elDodatno.appendChild(poljeDoza());
      return;
    }

    if (rasporedVrsta === 'ciklus') {
      const b = naslovPolja('Na koliko dana', 'Razmak do sledeće doze');
      b.appendChild(red(CIKLUSI, ciklusDana, (v) => { ciklusDana = v; }));
      elDodatno.appendChild(b);
      return;
    }
    /* „Po potrebi" nema rasporeda — broji se samo koliko puta je uzet. */
  }

  /* ── otvaranje ────────────────────────────────────────────────────── */
  function otvori(id) {
    tekuci = id ? lek(id) : null;
    elPoruka.textContent = '';

    elNaziv.value = tekuci?.naziv ?? '';
    elDoza.value = tekuci?.doza ?? '';
    const r = tekuci?.raspored;
    nacin = tekuci?.nacin ?? 'tableta';
    rasporedVrsta = r?.vrsta ?? 'dnevno';
    ciklusDana = r?.ciklusDana ?? 14;
    vremena = r?.vremena?.length ? [...r.vremena] : ['08:00'];
    dani = [...(r?.dani ?? [])];

    napuni(elNacin, NACINI, nacin, (v) => { nacin = v; });
    napuni(elRaspored, RASPOREDI, rasporedVrsta, (v) => { rasporedVrsta = v; iscrtajDodatno(); });
    iscrtajDodatno();
    elSkloni.hidden = !tekuci;
    elSkloni.textContent = tekuci?.sklonjen ? 'Vrati u upotrebu' : 'Skloni';
    scrollTo(0, 0);
  }

  elSacuvaj.addEventListener('click', () => {
    const naziv = elNaziv.value.trim();
    if (!naziv) {
      elPoruka.textContent = 'Naziv leka je obavezan.';
      elNaziv.focus();
      return;
    }
    if (rasporedVrsta === 'nedeljno' && !dani.length) {
      elPoruka.textContent = 'Izaberite bar jedan dan u nedelji.';
      return;
    }

    const raspored = { vrsta: rasporedVrsta };
    if (rasporedVrsta === 'dnevno') raspored.vremena = [...vremena];
    if (rasporedVrsta === 'nedeljno') { raspored.dani = [...dani]; raspored.vremena = [...vremena]; }
    if (rasporedVrsta === 'ciklus') raspored.ciklusDana = ciklusDana;

    upisiLek({ id: tekuci?.id, naziv, doza: elDoza.value.trim() || undefined, nacin, raspored });
    naJavljanje?.(tekuci ? `Izmenjeno — ${naziv}` : `Dodato — ${naziv}`);
    naZavrsetak();
  });

  elSkloni.addEventListener('click', () => {
    if (!tekuci) return;
    if (tekuci.sklonjen) { vratiLek(tekuci.id); naJavljanje?.(`Vraćeno — ${tekuci.naziv}`); }
    else { skloniLek(tekuci.id); naJavljanje?.(`Sklonjeno — ${tekuci.naziv}`); }
    naZavrsetak();
  });

  return {
    otvori,
    zaglavlje: () => ({ naslov: tekuci ? 'Izmena leka' : 'Novi lek', podnaslov: '' })
  };
}
