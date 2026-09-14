/**
 * Kopija dnevnika — čuvanje u datoteku i vraćanje iz nje.
 *
 * Ovo je jedina zaštita koja preživi brisanje aplikacije i zamenu telefona.
 * Datoteka ide tamo gde je korisnik sam smesti; ako je smesti u iCloud Drive
 * ili na Drive, dobija i rezervnu kopiju van uređaja. Ništa se nigde ne šalje
 * samo od sebe.
 */

import { izvezi, imeKopije, uvezi, zabeleziRezervu, poslednjaRezerva } from './skladiste.js';

const DAN = 24 * 60 * 60 * 1000;
const PODSETI_POSLE = 30 * DAN;
const ODLOZI_ZA = 7 * DAN;
const KLJUC_ODLAGANJA = 'artron.podsetnik-odlozen';

/** Otvori sistemsko čuvanje datoteke sa celim dnevnikom. */
export function sacuvajKopiju() {
  const blob = new Blob([izvezi()], { type: 'application/json' });
  const adresa = URL.createObjectURL(blob);
  const veza = document.createElement('a');
  veza.href = adresa;
  veza.download = imeKopije();
  document.body.appendChild(veza);
  veza.click();
  veza.remove();
  /* Adresa se pušta tek posle dodira, da je pregledač stigne iskoristiti. */
  setTimeout(() => URL.revokeObjectURL(adresa), 60_000);
  zabeleziRezervu();
  return veza.download;
}

/** Pročitaj izabranu datoteku i vrati podatke iz nje. */
export async function vratiIzKopije(datoteka) {
  if (!datoteka) throw new Error('Nije izabrana datoteka.');
  if (datoteka.size > 40 * 1024 * 1024) throw new Error('Datoteka je prevelika za dnevnik.');
  const tekst = await datoteka.text();
  return uvezi(tekst);
}

export function opisPoslednjeKopije() {
  const kad = poslednjaRezerva();
  if (!kad) return 'nijedna kopija još nije sačuvana';
  const dana = Math.floor((Date.now() - kad) / DAN);
  if (dana === 0) return 'poslednja kopija sačuvana danas';
  if (dana === 1) return 'poslednja kopija sačuvana juče';
  return `poslednja kopija sačuvana pre ${dana} dana`;
}

/**
 * Da li vredi podsetiti na kopiju. Podseća se tek kad ima šta da se izgubi —
 * za dva-tri unosa nema smisla dizati paniku.
 */
export function trebaPodsetiti(danaZabelezeno) {
  if (danaZabelezeno < 14) return false;
  let odlozeno = 0;
  try { odlozeno = Number(localStorage.getItem(KLJUC_ODLAGANJA)) || 0; } catch { /* svejedno */ }
  if (Date.now() - odlozeno < ODLOZI_ZA) return false;
  const kad = poslednjaRezerva();
  return !kad || Date.now() - kad > PODSETI_POSLE;
}

export function odloziPodsetnik() {
  try { localStorage.setItem(KLJUC_ODLAGANJA, String(Date.now())); } catch { /* svejedno */ }
}

export const opisVelicine = (bajtova) => {
  if (bajtova == null) return null;
  if (bajtova < 1024) return `${bajtova} B`;
  if (bajtova < 1024 * 1024) return `${Math.round(bajtova / 1024)} KB`;
  return `${(bajtova / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
};
