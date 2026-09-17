/**
 * Skala 0–10 kao tabla brojeva.
 *
 * Klizač traži precizno prevlačenje palcem po traci od nekoliko piksela
 * visine — na telefonu je to i sporo i nepouzdano, pogotovo kad prsti bole.
 * Dugme je jedan dodir, meta mu je preko 48 px, i odmah se vidi šta je
 * izabrano. Boja prati istu skalu jačine kao i mapa tela, a broj u dugmetu
 * nosi značenje i bez boje.
 */

import { stepenZa } from './telo/regioni.js';

export function napraviSkalu(okvir, {
  min = 0, max = 10, oznaka, naIzbor, bojiPoJacini = true, praznoDozvoljeno = false
} = {}) {
  okvir.classList.add('skala-tabla');
  okvir.setAttribute('role', 'group');
  if (oznaka) okvir.setAttribute('aria-label', oznaka);

  let vrednost = praznoDozvoljeno ? null : min;
  const dugmad = [];

  for (let v = min; v <= max; v++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(v);
    b.dataset.vrednost = String(v);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      /* Ponovni dodir na već izabrano poništava izbor tamo gde je prazno
         dozvoljeno — inače se greška ispravlja samo brisanjem celog unosa. */
      postavi(praznoDozvoljeno && vrednost === v ? null : v);
      naIzbor?.(vrednost);
    });
    okvir.appendChild(b);
    dugmad.push(b);
  }

  function postavi(v) {
    vrednost = v;
    for (const b of dugmad) {
      const bv = Number(b.dataset.vrednost);
      const izabrano = bv === v;
      b.setAttribute('aria-pressed', String(izabrano));
      b.style.background = '';
      b.style.borderColor = '';
      b.style.color = '';
      if (!izabrano) continue;
      if (bojiPoJacini && bv > 0) {
        const stepen = stepenZa(bv);
        b.style.background = stepen.boja;
        b.style.borderColor = stepen.boja;
        b.style.color = stepen.naBoji;
      } else {
        b.style.background = 'var(--text)';
        b.style.borderColor = 'var(--text)';
        b.style.color = 'var(--ground)';
      }
    }
  }

  postavi(vrednost);
  return { postavi, vrednost: () => vrednost };
}

/** Reč uz izabranu jačinu bola. */
export function recZaJacinu(v) {
  if (v == null) return 'nije uneseno';
  return v === 0 ? 'bez bola' : stepenZa(v).ime;
}

/** Reč uz ostale mere 0–10 (umor, opterećenje, magla). */
export function recZaMeru(v) {
  if (v == null) return 'nije uneseno';
  return v === 0 ? 'nimalo' : v <= 3 ? 'malo' : v <= 6 ? 'osrednje' : v <= 8 ? 'mnogo' : 'vrlo mnogo';
}
