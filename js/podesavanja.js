/**
 * Podešavanja — izbor režima praćenja.
 *
 * Režim menja samo šta se pita pri unosu, ne izgled aplikacije. Može i oba
 * istovremeno, jer se ta dva stanja često javljaju zajedno, i može nijedan —
 * tada Artron ostaje običan dnevnik bola.
 */

import { rezim, postaviRezim, stanjeCuvanja } from './skladiste.js';
import {
  sacuvajKopiju, vratiIzKopije, opisPoslednjeKopije, opisVelicine
} from './kopija.js';
import { naPocetnomEkranu } from './trajnost.js';

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

export function napraviEkranPodesavanja({ naPromenuRezima, naVracanjePodataka }) {
  const elRezimi = document.getElementById('rezimi');
  const elCuvanje = document.getElementById('cuvanje');
  const elSacuvaj = document.getElementById('sacuvaj-kopiju');
  const elVrati = document.getElementById('vrati-kopiju');
  const elIzbor = document.getElementById('izbor-kopije');
  const elIshod = document.getElementById('ishod-kopije');

  function iscrtaj() {
    const sad = rezim();
    elRezimi.replaceChildren(...REZIMI.map(r => kartica(r, !!sad[r.id])));
    iscrtajCuvanje();
  }

  /* ── stanje čuvanja ─────────────────────────────────────────────────── */
  async function iscrtajCuvanje() {
    const s = await stanjeCuvanja();
    const redovi = [];

    redovi.push({
      stanje: s.baza ? 'dobro' : 'pazi',
      ime: s.baza ? 'Podaci se čuvaju u bazi na uređaju' : 'Baza na uređaju nije dostupna',
      pod: s.baza
        ? `${s.danaZabelezeno} ${s.danaZabelezeno === 1 ? 'zabeležen dan' : 'zabeleženih dana'}` +
          `${opisVelicine(s.velicinaZapisa) ? ` · ${opisVelicine(s.velicinaZapisa)}` : ''}`
        : 'Radi se samo sa rezervnim zapisom, koji je podložniji brisanju.'
    });

    redovi.push({
      stanje: s.trajno ? 'dobro' : 'pazi',
      ime: s.trajno ? 'Skladište je označeno kao trajno' : 'Skladište nije označeno kao trajno',
      pod: s.trajno
        ? 'Sistem ga neće obrisati sam od sebe kad ponestane prostora.'
        : (naPocetnomEkranu()
            ? 'Pregledač nije dao dozvolu. Podaci rade, ali su podložniji brisanju — kopija je zato važnija.'
            : 'Dodajte Artron na početni ekran: tako se podaci čuvaju znatno pouzdanije nego u pregledaču.')
    });

    const kad = opisPoslednjeKopije();
    redovi.push({
      stanje: kad.startsWith('nijedna') ? 'lose' : 'dobro',
      ime: 'Kopija u datoteci',
      pod: `${kad[0].toUpperCase()}${kad.slice(1)}. Jedino kopija preživi brisanje ` +
           'aplikacije i zamenu telefona.'
    });

    elCuvanje.replaceChildren(...redovi.map(r => {
      const red = document.createElement('div');
      red.className = 'cuvanje__red';
      red.dataset.stanje = r.stanje;
      red.innerHTML = `<span class="cuvanje__tacka" aria-hidden="true"></span>
        <span class="cuvanje__tekst">
          <span class="cuvanje__ime">${r.ime}</span>
          <span class="cuvanje__pod">${r.pod}</span>
        </span>`;
      return red;
    }));
  }

  elSacuvaj.addEventListener('click', () => {
    try {
      const ime = sacuvajKopiju();
      elIshod.textContent = `Kopija napravljena: ${ime}. Sačuvajte je tamo gde vam je ` +
        'na sigurnom — na primer u iCloud Drive.';
      iscrtajCuvanje();
    } catch {
      elIshod.textContent = 'Kopija nije mogla da se napravi na ovom uređaju.';
    }
  });

  elVrati.addEventListener('click', () => { elIzbor.value = ''; elIzbor.click(); });

  elIzbor.addEventListener('change', async () => {
    const datoteka = elIzbor.files?.[0];
    if (!datoteka) return;
    try {
      const r = await vratiIzKopije(datoteka);
      elIshod.textContent =
        `Vraćeno iz kopije: ${r.novih} ${r.novih === 1 ? 'nov dan' : 'novih dana'}, ` +
        `${r.izmenjenih} ${r.izmenjenih === 1 ? 'izmenjen' : 'izmenjenih'}. ` +
        `Dnevnik sada ima ${r.ukupno} ${r.ukupno === 1 ? 'dan' : 'dana'}.`;
      iscrtaj();
      naVracanjePodataka?.();
    } catch (g) {
      elIshod.textContent = g.message;
    }
  });

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
