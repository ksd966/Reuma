/**
 * Spisak svih regiona tela koje Artron prati.
 *
 * Svaki region ima stalan `id` koji se koristi u podacima i u izvozu — taj id se
 * nikad ne menja, jer za njega vezani unosi ostaju u dnevniku zauvek.
 *
 * `ime` je puno ime koje čita i korisnik i čitač ekrana, sa pravim rodom
 * ("Levo koleno", ali "Leva butina" i "Levi lakat").
 *
 * Strane su iz ugla osobe, ne posmatrača: `levo` je leva strana pacijenta.
 * U pogledu spreda to znači da se levi regioni vide na desnoj polovini ekrana,
 * isto kao kad lekar stoji naspram pacijenta.
 */

export const GRUPE = [
  { id: 'glava',  ime: 'Glava i vrat' },
  { id: 'ruke',   ime: 'Ruke' },
  { id: 'trup',   ime: 'Trup i kičma' },
  { id: 'noge',   ime: 'Noge' }
];

/** @type {{id:string, ime:string, osnova:string, strana:'levo'|'desno'|null, grupa:string}[]} */
export const REGIONI = [
  // — glava i vrat —
  { id: 'vilica-l',        ime: 'Levi vilični zglob',          osnova: 'Vilični zglob',        strana: 'levo',  grupa: 'glava' },
  { id: 'vilica-d',        ime: 'Desni vilični zglob',         osnova: 'Vilični zglob',        strana: 'desno', grupa: 'glava' },
  { id: 'vrat',            ime: 'Vrat',                        osnova: 'Vrat',                 strana: null,    grupa: 'glava' },

  // — ruke —
  { id: 'rame-l',          ime: 'Levo rame',                   osnova: 'Rame',                 strana: 'levo',  grupa: 'ruke' },
  { id: 'rame-d',          ime: 'Desno rame',                  osnova: 'Rame',                 strana: 'desno', grupa: 'ruke' },
  { id: 'nadlaktica-l',    ime: 'Leva nadlaktica',             osnova: 'Nadlaktica',           strana: 'levo',  grupa: 'ruke' },
  { id: 'nadlaktica-d',    ime: 'Desna nadlaktica',            osnova: 'Nadlaktica',           strana: 'desno', grupa: 'ruke' },
  { id: 'lakat-l',         ime: 'Levi lakat',                  osnova: 'Lakat',                strana: 'levo',  grupa: 'ruke' },
  { id: 'lakat-d',         ime: 'Desni lakat',                 osnova: 'Lakat',                strana: 'desno', grupa: 'ruke' },
  { id: 'podlaktica-l',    ime: 'Leva podlaktica',             osnova: 'Podlaktica',           strana: 'levo',  grupa: 'ruke' },
  { id: 'podlaktica-d',    ime: 'Desna podlaktica',            osnova: 'Podlaktica',           strana: 'desno', grupa: 'ruke' },
  { id: 'rucni-zglob-l',   ime: 'Levi ručni zglob',            osnova: 'Ručni zglob',          strana: 'levo',  grupa: 'ruke' },
  { id: 'rucni-zglob-d',   ime: 'Desni ručni zglob',           osnova: 'Ručni zglob',          strana: 'desno', grupa: 'ruke' },
  { id: 'saka-l',          ime: 'Leva šaka',                   osnova: 'Šaka',                 strana: 'levo',  grupa: 'ruke' },
  { id: 'saka-d',          ime: 'Desna šaka',                  osnova: 'Šaka',                 strana: 'desno', grupa: 'ruke' },
  { id: 'prsti-sake-l',    ime: 'Prsti leve šake',             osnova: 'Prsti šake',           strana: 'levo',  grupa: 'ruke' },
  { id: 'prsti-sake-d',    ime: 'Prsti desne šake',            osnova: 'Prsti šake',           strana: 'desno', grupa: 'ruke' },

  // — trup i kičma —
  { id: 'kicma-gornja',    ime: 'Gornja kičma',                osnova: 'Gornja kičma',         strana: null,    grupa: 'trup' },
  { id: 'kicma-donja',     ime: 'Donja kičma',                 osnova: 'Donja kičma',          strana: null,    grupa: 'trup' },
  { id: 'krsta',           ime: 'Krsta',                       osnova: 'Krsta',                strana: null,    grupa: 'trup' },
  { id: 'si-zglob-l',      ime: 'Levi sakroilijakalni zglob',  osnova: 'Sakroilijakalni zglob', strana: 'levo',  grupa: 'trup' },
  { id: 'si-zglob-d',      ime: 'Desni sakroilijakalni zglob', osnova: 'Sakroilijakalni zglob', strana: 'desno', grupa: 'trup' },

  // — noge —
  { id: 'kuk-l',           ime: 'Levi kuk',                    osnova: 'Kuk',                  strana: 'levo',  grupa: 'noge' },
  { id: 'kuk-d',           ime: 'Desni kuk',                   osnova: 'Kuk',                  strana: 'desno', grupa: 'noge' },
  { id: 'butina-l',        ime: 'Leva butina',                 osnova: 'Butina',               strana: 'levo',  grupa: 'noge' },
  { id: 'butina-d',        ime: 'Desna butina',                osnova: 'Butina',               strana: 'desno', grupa: 'noge' },
  { id: 'koleno-l',        ime: 'Levo koleno',                 osnova: 'Koleno',               strana: 'levo',  grupa: 'noge' },
  { id: 'koleno-d',        ime: 'Desno koleno',                osnova: 'Koleno',               strana: 'desno', grupa: 'noge' },
  { id: 'list-l',          ime: 'Levi list',                   osnova: 'List',                 strana: 'levo',  grupa: 'noge' },
  { id: 'list-d',          ime: 'Desni list',                  osnova: 'List',                 strana: 'desno', grupa: 'noge' },
  { id: 'skocni-zglob-l',  ime: 'Levi skočni zglob',           osnova: 'Skočni zglob',         strana: 'levo',  grupa: 'noge' },
  { id: 'skocni-zglob-d',  ime: 'Desni skočni zglob',          osnova: 'Skočni zglob',         strana: 'desno', grupa: 'noge' },
  { id: 'stopalo-l',       ime: 'Levo stopalo',                osnova: 'Stopalo',              strana: 'levo',  grupa: 'noge' },
  { id: 'stopalo-d',       ime: 'Desno stopalo',               osnova: 'Stopalo',              strana: 'desno', grupa: 'noge' },
  { id: 'prsti-stopala-l', ime: 'Prsti levog stopala',         osnova: 'Prsti stopala',        strana: 'levo',  grupa: 'noge' },
  { id: 'prsti-stopala-d', ime: 'Prsti desnog stopala',        osnova: 'Prsti stopala',        strana: 'desno', grupa: 'noge' }
];

/** Brzo pronalaženje regiona po id-ju. */
export const PO_ID = new Map(REGIONI.map(r => [r.id, r]));

export const imeRegiona = (id) => PO_ID.get(id)?.ime ?? id;

/** Vrste bola — redosled je i redosled dugmadi u listu za unos. */
export const VRSTE_BOLA = [
  { id: 'tup',       ime: 'Tup' },
  { id: 'ostar',     ime: 'Oštar' },
  { id: 'pecenje',   ime: 'Pečenje' },
  { id: 'ukocenost', ime: 'Ukočenost' },
  { id: 'trnjenje',  ime: 'Trnjenje' }
];

/**
 * Boje jačine bola. Fiksne su i iste u svetlom i u tamnom režimu — po pravilu
 * iz dizajn-sistema da se boje podataka ne menjaju sa stanjem aplikacije.
 * Boja nikad ne stoji sama: uz obojen region uvek ide i broj, a na grafiku i
 * visina stubića.
 *
 * „Umerena" koristi --s-warn, ne --accent: akcenat je po dizajn-sistemu samo
 * hrom i nikad podatak. Uz to je razdvojivost od susedne „jake" provereno
 * bolja — ΔE kod deuteranopije 11,3 umesto 5,0 sa akcentom.
 */
export const STEPENI = [
  { do: 3,  boja: '#2E9E8F', ime: 'blaga'     },
  { do: 6,  boja: '#FAB219', ime: 'umerena'   },
  { do: 8,  boja: '#EC835A', ime: 'jaka'      },
  { do: 10, boja: '#D03B3B', ime: 'vrlo jaka' }
];

export function stepenZa(jacina) {
  return STEPENI.find(s => jacina <= s.do) ?? STEPENI[STEPENI.length - 1];
}
