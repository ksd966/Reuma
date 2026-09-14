/**
 * Unos i izmena jednog leka.
 *
 * Spisak lekova se pamti, pa se posle unosi sa nekoliko dodira — zato se ovde
 * kuca samo naziv i doza, a sve ostalo se bira.
 */

import { VRSTE, NACINI, CIKLUSI, lek, upisiLek, skloniLek, vratiLek } from './lekovi.js';

export function napraviEkranLeka({ naZavrsetak, naJavljanje }) {
  const elNaziv = document.getElementById('lek-naziv');
  const elDoza = document.getElementById('lek-doza');
  const elVrsta = document.getElementById('lek-vrsta');
  const elDodatno = document.getElementById('lek-dodatno');
  const elSacuvaj = document.getElementById('lek-sacuvaj');
  const elSkloni = document.getElementById('lek-skloni');
  const elPoruka = document.getElementById('lek-poruka');

  let tekuci = null;          // null = nov lek
  let vrsta = 'stalni';
  let nacin = 'potkozno';
  let ciklusDana = 14;
  let vremena = [];

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

  /* ── polja koja zavise od vrste ───────────────────────────────────── */
  function iscrtajDodatno() {
    elDodatno.replaceChildren();

    if (vrsta === 'stalni') {
      const okvir = naslovPolja('Vreme uzimanja', 'Može i više puta dnevno');
      const spisak = document.createElement('div');
      spisak.className = 'izbori';

      for (const v of vremena) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-pressed', 'true');
        b.textContent = `${v}  ✕`;
        b.setAttribute('aria-label', `Ukloni vreme ${v}`);
        b.addEventListener('click', () => {
          vremena = vremena.filter(x => x !== v);
          iscrtajDodatno();
        });
        spisak.appendChild(b);
      }

      const unos = document.createElement('input');
      unos.type = 'time';
      unos.className = 'unos';
      unos.id = 'lek-vreme';
      unos.setAttribute('aria-label', 'Novo vreme uzimanja');

      const dodaj = document.createElement('button');
      dodaj.type = 'button';
      dodaj.className = 'dugme';
      dodaj.style.cssText = 'width:100%;margin-top:8px';
      dodaj.textContent = 'Dodaj vreme';
      dodaj.addEventListener('click', () => {
        if (!unos.value || vremena.includes(unos.value)) return;
        vremena = [...vremena, unos.value].sort();
        iscrtajDodatno();
      });

      okvir.append(spisak, unos, dodaj);
      elDodatno.appendChild(okvir);
      return;
    }

    if (vrsta === 'bioloska') {
      const a = naslovPolja('Način primene');
      a.appendChild(red(NACINI, nacin, (v) => { nacin = v; }));
      const b = naslovPolja('Ciklus', 'Na koliko dana se daje sledeća doza');
      b.appendChild(red(CIKLUSI, ciklusDana, (v) => { ciklusDana = v; }));
      elDodatno.append(a, b);
    }
    /* „Po potrebi" nema dodatnih polja — broji se samo koliko puta je uzet. */
  }

  /* ── otvaranje ────────────────────────────────────────────────────── */
  function otvori(id) {
    tekuci = id ? lek(id) : null;
    elPoruka.textContent = '';

    elNaziv.value = tekuci?.naziv ?? '';
    elDoza.value = tekuci?.doza ?? '';
    vrsta = tekuci?.vrsta ?? 'stalni';
    nacin = tekuci?.nacin ?? 'potkozno';
    ciklusDana = tekuci?.ciklusDana ?? 14;
    vremena = [...(tekuci?.vremena ?? [])];

    napuni(elVrsta, VRSTE, vrsta, (v) => { vrsta = v; iscrtajDodatno(); });
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
    const podaci = { id: tekuci?.id, naziv, doza: elDoza.value.trim() || undefined, vrsta };
    if (vrsta === 'stalni') podaci.vremena = vremena;
    if (vrsta === 'bioloska') { podaci.nacin = nacin; podaci.ciklusDana = ciklusDana; }

    upisiLek(podaci);
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
