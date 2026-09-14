/**
 * Trajno čuvanje na uređaju.
 *
 * Zašto ovo postoji: `localStorage` na iPhone-u NIJE trajan. Safari briše
 * podatke sajta posle sedam dana nekorišćenja. Za dnevnik koji se vodi
 * godinama to je neprihvatljivo, pa se podaci drže na tri mesta:
 *
 *   1. IndexedDB — glavno mesto; veći prostor i prvi na redu za zadržavanje
 *      kad sistem čisti. Aplikacija instalirana na početni ekran je uz to
 *      izuzeta iz sedmodnevnog brisanja.
 *   2. localStorage — ogledalo, da se stanje pročita odmah pri pokretanju i
 *      da postoji rezerva ako IndexedDB zakaže.
 *   3. Datoteka koju korisnik sam sačuva — jedino što preživi i brisanje
 *      aplikacije i zamenu telefona. Zato aplikacija na to i podseća.
 *
 * Uz to se od pregledača traži dozvola za trajno skladište
 * (`navigator.storage.persist`), čime podaci prestaju da budu kandidat za
 * automatsko brisanje kad ponestane prostora.
 */

const BAZA = 'artron';
const POLICA = 'stanje';
const ZAPIS = 'glavni';

let baza = null;
let bazaRadi = false;

function otvoriBazu() {
  return new Promise((reši, odbaci) => {
    if (!globalThis.indexedDB) return odbaci(new Error('IndexedDB nije dostupan'));
    const zahtev = indexedDB.open(BAZA, 1);
    zahtev.onupgradeneeded = () => {
      const db = zahtev.result;
      if (!db.objectStoreNames.contains(POLICA)) db.createObjectStore(POLICA);
    };
    zahtev.onsuccess = () => reši(zahtev.result);
    zahtev.onerror = () => odbaci(zahtev.error ?? new Error('IndexedDB se ne otvara'));
    zahtev.onblocked = () => odbaci(new Error('IndexedDB je zauzet'));
  });
}

function radnja(vrsta, posao) {
  return new Promise((reši, odbaci) => {
    if (!baza) return odbaci(new Error('baza nije otvorena'));
    const t = baza.transaction(POLICA, vrsta);
    const zahtev = posao(t.objectStore(POLICA));
    t.onabort = t.onerror = () => odbaci(t.error ?? new Error('neuspela radnja'));
    zahtev.onsuccess = () => reši(zahtev.result);
  });
}

/** Otvori bazu; ako ne uspe, aplikacija i dalje radi samo sa ogledalom. */
export async function pripremiBazu() {
  try {
    baza = await otvoriBazu();
    bazaRadi = true;
  } catch {
    bazaRadi = false;
  }
  return bazaRadi;
}

export const bazaDostupna = () => bazaRadi;

export async function citajIzBaze() {
  if (!bazaRadi) return null;
  try { return (await radnja('readonly', (p) => p.get(ZAPIS))) ?? null; }
  catch { return null; }
}

export async function pisiUBazu(podaci) {
  if (!bazaRadi) return false;
  try { await radnja('readwrite', (p) => p.put(podaci, ZAPIS)); return true; }
  catch { return false; }
}

/**
 * Zatraži da skladište bude trajno. Na uređaju sa aplikacijom na početnom
 * ekranu pregledač to obično odobri bez pitanja; ako odbije, podaci i dalje
 * rade, samo su podložniji automatskom brisanju — i tada sačuvana kopija
 * ostaje jedina prava zaštita.
 */
export async function zatraziTrajnost() {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Šta pregledač kaže o stanju skladišta — za prikaz u podešavanjima. */
export async function stanjeSkladista() {
  let trajno = false, upotrebljeno = null, ukupno = null;
  try {
    if (navigator.storage?.persisted) trajno = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const p = await navigator.storage.estimate();
      upotrebljeno = p.usage ?? null;
      ukupno = p.quota ?? null;
    }
  } catch { /* pregledač ne mora da ume ovo */ }
  return { trajno, upotrebljeno, ukupno, baza: bazaRadi };
}

/** Aplikacija pokrenuta sa početnog ekrana, a ne iz pregledača. */
export const naPocetnomEkranu = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
