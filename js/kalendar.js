/**
 * Podsetnici za lekove kao `.ics` datoteka za Kalendar.
 *
 * Prave notifikacije (one koje zazvone i kad aplikacija nije otvorena) na
 * iPhone-u traže server koji šalje poruku — a dogovor je da ništa ne napušta
 * telefon. Kalendar rešava isto bez servera: aplikacija napravi datoteku,
 * telefon je uveze, i dalje podseća sam.
 *
 * Aplikacija ne predlaže doze i ne savetuje terapiju. U podsetnik ulazi samo
 * ono što je korisnik sam uneo — naziv, doza koju je otkucao i raspored koji
 * je sam zadao.
 */

import { lekovi, odbrojavanje, opisRasporeda, danUNedelji } from './lekovi.js';
import { kljucDana, punDatum, pomeriDan } from './skladiste.js';

/* Koliko unapred se pišu ponavljanja. Godinu dana je dovoljno da se ne misli
   na to, a dovoljno kratko da se zastarela terapija sama ugasi u kalendaru. */
const DANA_UNAPRED = 365;

/** Vreme podsetnika kad raspored ne nosi sat — ujutru, da ostane ceo dan. */
const VREME_BEZ_SATA = '09:00';

/** Oznake dana po standardu; indeks je 1 = ponedeljak … 7 = nedelja. */
const SKRACENICE = { 1:'MO', 2:'TU', 3:'WE', 4:'TH', 5:'FR', 6:'SA', 7:'SU' };

/** Prvi dan od `od` nadalje koji pada na jedan od zadatih dana u nedelji. */
function prviTakavDan(od, dani) {
  for (let i = 0; i < 7; i++) {
    const k = pomeriDan(od, i);
    if (dani.includes(danUNedelji(k))) return k;
  }
  return od;
}

const NAPOMENA =
  'Podsetnik koji ste sami podesili u aplikaciji Artron. ' +
  'Artron je lični dnevnik, nije medicinsko sredstvo: ne propisuje terapiju, ' +
  'ne predlaže doze i ne savetuje promene. Ako raspored više ne odgovara, ' +
  'izmenite lek u Artronu i ponovo uvezite podsetnike.';

/* ── zapis po RFC 5545 ───────────────────────────────────────────────── */

/** U tekstualnom polju obrnuta kosa crta, tačka-zarez, zarez i novi red imaju značenje. */
const tekst = (s) => String(s)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/**
 * Red duži od 75 okteta se prelama, a nastavak počinje razmakom. Meri se u
 * oktetima, ne u znakovima — „č", „ć", „š" i „ž" zauzimaju po dva — i prelom
 * nikad ne sme da padne usred jednog znaka.
 */
function prelomi(red) {
  const bajtovi = new TextEncoder().encode(red);
  if (bajtovi.length <= 75) return red;

  const delovi = [];
  let pocetak = 0;
  let granica = 75;
  while (pocetak < bajtovi.length) {
    let kraj = Math.min(pocetak + granica, bajtovi.length);
    /* 0b10xxxxxx je nastavak znaka — vrati se do njegovog početka. */
    while (kraj < bajtovi.length && (bajtovi[kraj] & 0xC0) === 0x80) kraj--;
    delovi.push(new TextDecoder().decode(bajtovi.slice(pocetak, kraj)));
    pocetak = kraj;
    granica = 74;               // nastavak troši jedan oktet na razmak
  }
  return delovi.join('\r\n ');
}

const dvocifreno = (n) => String(n).padStart(2, '0');

/** Trenutak nastanka datoteke, u UTC — traži ga standard. */
function sada() {
  const d = new Date();
  return `${d.getUTCFullYear()}${dvocifreno(d.getUTCMonth() + 1)}${dvocifreno(d.getUTCDate())}` +
         `T${dvocifreno(d.getUTCHours())}${dvocifreno(d.getUTCMinutes())}${dvocifreno(d.getUTCSeconds())}Z`;
}

/**
 * Lokalno vreme bez oznake vremenske zone — tzv. „plutajuće". Namerno: lek se
 * uzima u osam ujutru tamo gde je korisnik, a ne u osam po Beogradu ako se
 * telefon nađe drugde.
 */
function trenutak(kljuc, hhmm) {
  const [c, m] = hhmm.split(':');
  return `${kljuc.replace(/-/g, '')}T${dvocifreno(c)}${dvocifreno(m)}00`;
}

function dogadjaj({ uid, pocetak, ponavljanje, naslov, opis }) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${sada()}`,
    `DTSTART:${pocetak}`,
    'DURATION:PT15M',
    ponavljanje,
    `SUMMARY:${tekst(naslov)}`,
    `DESCRIPTION:${tekst(opis)}`,
    'CATEGORIES:Artron',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${tekst(naslov)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT'
  ];
}

/* ── sastavljanje ────────────────────────────────────────────────────── */

/**
 * Pravi podsetnike iz onoga što je već uneto u Lekove.
 *
 * Vraća i `preskoceno` — lekove za koje se raspored ne može znati, da bi se
 * to reklo naglas umesto da tiho nedostaju u kalendaru.
 */
export function napraviKalendar(danas = kljucDana()) {
  const redovi = [];
  const preskoceno = [];
  let dogadjaja = 0;

  for (const l of lekovi()) {
    const r = l.raspored;
    const naslov = [l.naziv, l.doza].filter(Boolean).join(' ');

    if (!r || r.vrsta === 'poPotrebi') {
      if (r) preskoceno.push(`${l.naziv} — uzima se po potrebi, nema rasporeda`);
      continue;
    }

    if (r.vrsta === 'ciklus') {
      const o = odbrojavanje(l, danas);
      if (!o) {
        preskoceno.push(`${l.naziv} — nijedna primena još nije zabeležena`);
        continue;
      }
      /* Ako je dan primene prošao, red kreće od danas: podsetnik koji zvoni
         unazad ne pomaže. */
      const prvi = o.preostalo < 0 ? danas : o.sledeci;
      redovi.push(...dogadjaj({
        uid: `artron-ciklus-${l.id}`,
        pocetak: trenutak(prvi, VREME_BEZ_SATA),
        ponavljanje: `RRULE:FREQ=DAILY;INTERVAL=${r.ciklusDana};COUNT=${
          Math.max(1, Math.ceil(DANA_UNAPRED / r.ciklusDana))}`,
        naslov,
        opis: `Raspored koji ste zadali: ${opisRasporeda(l)}. ` +
              `Prvi podsetnik ${punDatum(prvi)}. ${NAPOMENA}`
      }));
      dogadjaja++;
      continue;
    }

    const vremena = r.vremena?.length ? r.vremena : null;
    if (!vremena) {
      preskoceno.push(`${l.naziv} — nije zadato vreme uzimanja`);
      continue;
    }

    if (r.vrsta === 'nedeljno') {
      const dani = (r.dani ?? []).map(d => SKRACENICE[d]).filter(Boolean);
      if (!dani.length) {
        preskoceno.push(`${l.naziv} — nije zadat dan u nedelji`);
        continue;
      }
      /* Prvi termin mora da padne na jedan od izabranih dana, inače bi
         ponavljanje krenulo od pogrešne nedelje. */
      const prvi = prviTakavDan(danas, r.dani);
      vremena.forEach((v, i) => {
        redovi.push(...dogadjaj({
          uid: `artron-nedeljno-${l.id}-${i}`,
          pocetak: trenutak(prvi, v),
          ponavljanje: `RRULE:FREQ=WEEKLY;BYDAY=${dani.join(',')};COUNT=${
            Math.max(1, Math.ceil(DANA_UNAPRED / 7) * dani.length)}`,
          naslov,
          opis: `${opisRasporeda(l)}. ${NAPOMENA}`
        }));
        dogadjaja++;
      });
      continue;
    }

    vremena.forEach((v, i) => {
      redovi.push(...dogadjaj({
        uid: `artron-dnevno-${l.id}-${i}`,
        pocetak: trenutak(danas, v),
        ponavljanje: `RRULE:FREQ=DAILY;COUNT=${DANA_UNAPRED}`,
        naslov,
        opis: `Svakog dana u ${v}. ${NAPOMENA}`
      }));
      dogadjaja++;
    });
  }

  const sve = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Artron//Podsetnici za lekove//SR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Artron — lekovi',
    ...redovi,
    'END:VCALENDAR'
  ];

  return { tekst: sve.map(prelomi).join('\r\n') + '\r\n', dogadjaja, preskoceno };
}

export const imeKalendara = () => `artron-podsetnici-${kljucDana()}.ics`;

/** Ima li uopšte šta da se izveze — da se ne nudi prazna datoteka. */
export function brojPodsetnika() {
  let n = 0;
  for (const l of lekovi()) {
    const r = l.raspored;
    if (!r || r.vrsta === 'poPotrebi') continue;
    if (r.vrsta === 'ciklus') { if (odbrojavanje(l)) n++; continue; }
    if (r.vrsta === 'nedeljno' && !(r.dani?.length)) continue;
    n += r.vremena?.length ?? 0;
  }
  return n;
}
