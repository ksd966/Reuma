/**
 * Sklopiv odeljak — naslov koji se dodiruje i sadržaj koji se otvara ispod.
 *
 * Isti obrazac se koristi na više mesta (spisak regiona, još pitanja, grafik
 * ciklusa, spisak lekova), pa stoji na jednom mestu umesto da se prepisuje.
 *
 * Ono što je danas na redu nikad se ne sklapa — sklapa se samo ono što se
 * gleda retko: pregled, podešavanje, istorija.
 */

let brojac = 0;

/**
 * @param {string}  ime       naslov reda
 * @param {string}  pod       sitniji red ispod naslova; menja se kroz `postaviPod`
 * @param {boolean} otvoreno  početno stanje kad nema zapamćenog
 * @param {string}  pamtiKao  ključ pod kojim se stanje pamti između otvaranja
 * @param {string}  id        oznaka sadržaja i dugmeta; sama se dodeli kad se ne zada
 */
export function napraviSklopivo({ ime, pod = '', otvoreno = false, pamtiKao = null, id = null }) {
  id ??= `sklopivo-${++brojac}`;

  const zapamceno = pamtiKao ? procitaj(pamtiKao) : null;
  let otvoren = zapamceno ?? otvoreno;

  const dugme = document.createElement('button');
  dugme.type = 'button';
  dugme.className = 'sklopivo';
  dugme.id = `${id}-prekidac`;
  dugme.setAttribute('aria-controls', id);
  dugme.innerHTML = `
    <span class="sklopivo__ime"></span>
    <span class="sklopivo__pod"></span>
    <svg class="sklopivo__strelica" viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"
         fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 9 L12 16 L19 9"/>
    </svg>`;
  dugme.querySelector('.sklopivo__ime').textContent = ime;

  const sadrzaj = document.createElement('div');
  sadrzaj.className = 'sklopivo__sadrzaj';
  sadrzaj.id = id;

  function osvezi() {
    dugme.setAttribute('aria-expanded', String(otvoren));
    sadrzaj.hidden = !otvoren;
  }

  dugme.addEventListener('click', () => {
    otvoren = !otvoren;
    osvezi();
    if (pamtiKao) upisi(pamtiKao, otvoren);
  });

  const okvir = document.createDocumentFragment();
  okvir.append(dugme, sadrzaj);

  const postaviPod = (t) => { dugme.querySelector('.sklopivo__pod').textContent = t ?? ''; };
  postaviPod(pod);
  osvezi();

  return { okvir, sadrzaj, dugme, postaviPod, jeOtvoren: () => otvoren };
}

/* Stanje sklapanja je udobnost ovog telefona, ne podatak — zato ide u
   localStorage, a ne u dnevnik koji se izvozi i pravi kopija. */
const kljuc = (ime) => `artron.sklopivo.${ime}`;

function procitaj(ime) {
  try {
    const v = localStorage.getItem(kljuc(ime));
    return v === null ? null : v === 'da';
  } catch { return null; }          // privatni režim, obrisani podaci sajta
}

function upisi(ime, otvoren) {
  try { localStorage.setItem(kljuc(ime), otvoren ? 'da' : 'ne'); } catch { /* bez pamćenja */ }
}
