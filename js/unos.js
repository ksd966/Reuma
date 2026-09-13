/**
 * List odozdo za unos bola u jednom regionu.
 *
 * Jedan region po otvaranju; više regiona se označava tako što se list zatvori
 * i dodirne sledeći region — zato jedan unos može da nosi koliko god regiona.
 */

import { VRSTE_BOLA, stepenZa } from './telo/regioni.js';

export function napraviList({ naPotvrdu, naUklanjanje, naZatvaranje }) {
  const list = document.getElementById('list');
  const zastor = document.getElementById('zastor');
  const elIme = document.getElementById('list-ime');
  const elPod = document.getElementById('list-pod');
  const elBroj = document.getElementById('jacina-broj');
  const elRec = document.getElementById('jacina-rec');
  const klizac = document.getElementById('klizac');
  const elVrste = document.getElementById('vrste');
  const dUkloni = document.getElementById('ukloni');
  const dPotvrdi = document.getElementById('potvrdi');

  let tekuci = null;
  let vrsta = VRSTE_BOLA[0].id;
  let vracaFokusNa = null;

  for (const v of VRSTE_BOLA) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = v.ime;
    b.dataset.vrsta = v.id;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { vrsta = v.id; osveziVrste(); });
    elVrste.appendChild(b);
  }

  function osveziVrste() {
    for (const b of elVrste.children) {
      b.setAttribute('aria-pressed', String(b.dataset.vrsta === vrsta));
    }
  }

  function osveziJacinu() {
    const j = Number(klizac.value);
    elBroj.textContent = String(j);
    if (j === 0) {
      elRec.textContent = 'bez bola';
      elBroj.style.color = 'var(--dim)';
      dPotvrdi.textContent = tekuci?.postojeci ? 'Ukloni oznaku' : 'Potvrdi';
    } else {
      const s = stepenZa(j);
      elRec.textContent = s.ime;
      elBroj.style.color = s.boja;
      dPotvrdi.textContent = 'Potvrdi';
    }
  }

  klizac.addEventListener('input', osveziJacinu);

  function otvori(region, postojeci, poreklo) {
    tekuci = { id: region.id, postojeci: !!postojeci };
    vracaFokusNa = poreklo ?? null;

    elIme.textContent = region.ime;
    elPod.textContent = postojeci ? 'Izmena već unetog bola' : 'Jačina bola i kakav je';
    klizac.value = String(postojeci?.jacina ?? 5);
    vrsta = postojeci?.vrsta ?? VRSTE_BOLA[0].id;
    dUkloni.hidden = !postojeci;

    osveziVrste();
    osveziJacinu();

    list.hidden = false;
    zastor.hidden = false;
    requestAnimationFrame(() => {
      list.dataset.otvoren = 'da';
      zastor.dataset.otvoren = 'da';
      klizac.focus({ preventScroll: true });
    });
  }

  function zatvori() {
    const bio = tekuci;
    tekuci = null;
    delete list.dataset.otvoren;
    delete zastor.dataset.otvoren;
    setTimeout(() => { list.hidden = true; zastor.hidden = true; }, 260);
    vracaFokusNa?.focus?.({ preventScroll: true });
    vracaFokusNa = null;
    if (bio) naZatvaranje?.(bio.id);
  }

  dPotvrdi.addEventListener('click', () => {
    if (!tekuci) return;
    const j = Number(klizac.value);
    if (j === 0) naUklanjanje?.(tekuci.id);
    else naPotvrdu?.(tekuci.id, { jacina: j, vrsta });
    zatvori();
  });

  dUkloni.addEventListener('click', () => {
    if (!tekuci) return;
    naUklanjanje?.(tekuci.id);
    zatvori();
  });

  zastor.addEventListener('click', zatvori);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tekuci) zatvori();
  });

  return { otvori, zatvori, jeOtvoren: () => !!tekuci };
}
