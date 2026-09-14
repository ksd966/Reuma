/**
 * Podešavanja — izbor režima praćenja.
 *
 * Režim menja samo šta se pita pri unosu, ne izgled aplikacije. Može i oba
 * istovremeno, jer se ta dva stanja često javljaju zajedno, i može nijedan —
 * tada Artron ostaje običan dnevnik bola.
 */

import { rezim, postaviRezim } from './skladiste.js';

const REZIMI = [
  {
    id: 'upalni',
    ime: 'Upalni reumatizam',
    pod: 'reumatoidni artritis, spondiloartritis i slično',
    dodaje: [
      'otečeni zglobovi zasebno od bolnih, na istoj mapi tela i drugom oznakom',
      'toplina i crvenilo zgloba',
      'jutarnja ukočenost u minutima'
    ]
  },
  {
    id: 'fibro',
    ime: 'Fibromijalgija',
    pod: 'raširen bol po područjima tela',
    dodaje: [
      'umor zasebno, jer ume da bude teži od samog bola',
      'neosvežavajući san',
      'magla u glavi i koncentracija',
      'osetljivost na dodir, buku i svetlo',
      'glavobolja i problemi sa varenjem'
    ]
  }
];

export function napraviEkranPodesavanja({ naPromenuRezima }) {
  const elRezimi = document.getElementById('rezimi');

  function iscrtaj() {
    const sad = rezim();
    elRezimi.replaceChildren(...REZIMI.map(r => kartica(r, !!sad[r.id])));
  }

  function kartica(r, ukljucen) {
    const okvir = document.createElement('div');
    okvir.className = 'rezim';
    okvir.dataset.ukljucen = ukljucen ? 'da' : 'ne';

    const dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.className = 'rezim__prekidac';
    dugme.setAttribute('role', 'switch');
    dugme.setAttribute('aria-checked', String(ukljucen));
    dugme.id = `rezim-${r.id}`;

    const tekst = document.createElement('span');
    tekst.className = 'rezim__tekst';
    const ime = document.createElement('span');
    ime.className = 'rezim__ime';
    ime.textContent = r.ime;
    const pod = document.createElement('span');
    pod.className = 'rezim__pod';
    pod.textContent = r.pod;
    tekst.append(ime, pod);

    const klizac = document.createElement('span');
    klizac.className = 'prekidac';
    klizac.setAttribute('aria-hidden', 'true');
    klizac.appendChild(document.createElement('i'));

    dugme.append(tekst, klizac);
    dugme.addEventListener('click', () => {
      const sad = { ...rezim(), [r.id]: !ukljucen };
      postaviRezim(sad);
      iscrtaj();
      naPromenuRezima?.(sad);
    });

    const spisak = document.createElement('ul');
    spisak.className = 'rezim__dodaje';
    for (const t of r.dodaje) {
      const li = document.createElement('li');
      li.textContent = t;
      spisak.appendChild(li);
    }

    okvir.append(dugme, spisak);
    return okvir;
  }

  return { iscrtaj };
}
