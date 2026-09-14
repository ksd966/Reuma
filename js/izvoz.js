/**
 * Izvoz u CSV — tabela koja se otvara u Excelu i pokazuje lekaru.
 *
 * Razdvojnik je tačka-zarez, jer tako Excel na našim podešavanjima otvara
 * tabelu bez pitanja. Na početak ide BOM, inače se č, ć, š, ž i đ prikažu
 * kao smeće.
 *
 * Za rezervnu kopiju služi JSON iz `kopija.js`; CSV je za čitanje, ne za
 * vraćanje podataka.
 */

import {
  DELOVI, sviDani, dohvatiDan, izKljuca, kljucDana, brojOteklih
} from './skladiste.js';
import { poljaZa, ispisi } from './polja.js';
import { imeRegiona } from './telo/regioni.js';
import { lekovi, lek, uzimanjaDana, primeneLeka, VRSTE, NACINI, MESTA, REAKCIJE } from './lekovi.js';

const DANI = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];
const BOM = '﻿';

/** Polje u kom ima tačka-zarez, navodnik ili novi red mora da se uokviri. */
function polje(v) {
  if (v == null) return '';
  const t = String(v);
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

const uTabelu = (redovi) => BOM + redovi.map(r => r.map(polje).join(';')).join('\r\n');

/* ── dnevnik ─────────────────────────────────────────────────────────── */

const ZAGLAVLJE_DNEVNIKA = [
  'Datum', 'Dan u nedelji', 'Deo dana', 'Vreme unosa', 'Bol 0-10',
  'Bolnih regiona', 'Bolni regioni', 'Otečenih zglobova', 'Otečeni zglobovi',
  'Jutarnja ukočenost (min)', 'San 1-5', 'Opterećenje 0-10', 'Umor 0-10',
  'Magla u glavi 0-10', 'Kvalitet dana 1-5', 'Neosvežavajući san',
  'Glavobolja', 'Problemi sa varenjem', 'Osetljivost', 'Lekovi tog dana'
];

const daNe = (v) => (v == null ? '' : v ? 'da' : 'ne');

export function dnevnikUTabelu() {
  const redovi = [ZAGLAVLJE_DNEVNIKA];
  const kljucevi = Object.keys(sviDani()).sort();

  for (const k of kljucevi) {
    const dan = dohvatiDan(k);
    const d = izKljuca(k);
    const lekoviTogDana = [...new Set(uzimanjaDana(k).map(u => lek(u.lekId)?.naziv).filter(Boolean))].join(', ');

    for (const deo of DELOVI) {
      const u = dan[deo.id];
      if (!u) continue;

      const bolni = [], otekli = [];
      for (const [id, r] of Object.entries(u.regioni ?? {})) {
        if ((r.jacina ?? 0) > 0) bolni.push(`${imeRegiona(id)} (${r.jacina})`);
        if (r.oteklo) otekli.push(imeRegiona(id));
      }

      redovi.push([
        k, DANI[d.getDay()], deo.ime, u.vreme ?? '', u.bol ?? '',
        bolni.length, bolni.join(', '),
        otekli.length, otekli.join(', '),
        u.ukocenost ?? '', u.san ?? '', u.opterecenje ?? '', u.umor ?? '',
        u.magla ?? '', u.kvalitetDana ?? '',
        daNe(u.neosvezavajucSan), daNe(u.glavobolja), daNe(u.varenje),
        (u.osetljivost ?? []).join(', '),
        lekoviTogDana
      ]);
    }
  }
  return uTabelu(redovi);
}

/* ── lekovi ──────────────────────────────────────────────────────────── */

const ZAGLAVLJE_LEKOVA = [
  'Datum', 'Lek', 'Doza', 'Vrsta', 'Događaj', 'Vreme',
  'Način primene', 'Mesto primene', 'Reakcija', 'Beleška'
];

const imeIz = (spisak, id) => spisak.find(x => x.id === id)?.ime ?? '';

export function lekoviUTabelu() {
  const redovi = [ZAGLAVLJE_LEKOVA];
  const zapisi = [];

  for (const k of Object.keys(sviDani())) {
    for (const u of uzimanjaDana(k)) {
      const l = lek(u.lekId);
      if (!l) continue;
      zapisi.push([k, l.naziv, l.doza ?? '', imeIz(VRSTE, l.vrsta), 'uzet', u.vreme ?? '', '', '', '', '']);
    }
  }
  for (const l of lekovi().filter(x => x.vrsta === 'bioloska')) {
    for (const p of primeneLeka(l.id)) {
      zapisi.push([
        p.datum, l.naziv, l.doza ?? '', imeIz(VRSTE, l.vrsta), 'primena', '',
        imeIz(NACINI, l.nacin), imeIz(MESTA, p.mesto), imeIz(REAKCIJE, p.reakcija), p.beleska ?? ''
      ]);
    }
  }

  zapisi.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  return uTabelu([...redovi, ...zapisi]);
}

/* ── čuvanje u datoteku ──────────────────────────────────────────────── */

export function sacuvajTabelu(sadrzaj, ime) {
  const blob = new Blob([sadrzaj], { type: 'text/csv;charset=utf-8' });
  const adresa = URL.createObjectURL(blob);
  const veza = document.createElement('a');
  veza.href = adresa;
  veza.download = ime;
  document.body.appendChild(veza);
  veza.click();
  veza.remove();
  setTimeout(() => URL.revokeObjectURL(adresa), 60_000);
  return ime;
}

export const imeDnevnika = () => `artron-dnevnik-${kljucDana()}.csv`;
export const imeLekova = () => `artron-lekovi-${kljucDana()}.csv`;

/** Koliko redova bi izvoz imao — da se ne nudi prazna tabela. */
export function brojRedova() {
  let unosa = 0;
  for (const k of Object.keys(sviDani())) {
    for (const deo of DELOVI) if (dohvatiDan(k)[deo.id]) unosa++;
  }
  const lekova = Object.keys(sviDani()).reduce((z, k) => z + uzimanjaDana(k).length, 0)
    + lekovi().filter(l => l.vrsta === 'bioloska').reduce((z, l) => z + primeneLeka(l.id).length, 0);
  return { unosa, lekova };
}
