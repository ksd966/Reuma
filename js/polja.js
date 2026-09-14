/**
 * Šta se pita uz koji deo dana.
 *
 * Osnovna pitanja idu uvek. Režim dodaje svoja — fibromijalgija traži umor,
 * maglu u glavi i osetljivost, jer su tamo često teži od samog bola. Upalni
 * režim ne dodaje pitanja ovde, nego uz svaki zglob na mapi tela: oteklinu,
 * toplinu i crvenilo.
 *
 * Sve je birano tako da se popuni sa nekoliko dodira, ne kucanjem.
 */

const OCENA5 = [
  { v: 1, ime: 'Vrlo loš' },
  { v: 2, ime: 'Loš' },
  { v: 3, ime: 'Osrednji' },
  { v: 4, ime: 'Dobar' },
  { v: 5, ime: 'Vrlo dobar' }
];

const OSNOVNA = {
  jutro: [
    {
      id: 'ukocenost', vrsta: 'izbor',
      ime: 'Jutarnja ukočenost',
      opis: 'Koliko je trajala od buđenja dok se niste razgibali',
      opcije: [
        { v: 0, ime: 'Nema' }, { v: 5, ime: '5 min' }, { v: 15, ime: '15 min' },
        { v: 30, ime: '30 min' }, { v: 45, ime: '45 min' }, { v: 60, ime: '1 h' },
        { v: 90, ime: '1,5 h' }, { v: 120, ime: '2 h' }, { v: 180, ime: 'Preko 2 h' }
      ]
    },
    { id: 'san', vrsta: 'izbor', ime: 'Kakav je bio san', opcije: OCENA5 }
  ],

  podne: [
    {
      id: 'opterecenje', vrsta: 'mera', ime: 'Opterećenje',
      opis: 'Koliko ste se do sada naprezali', min: 0, max: 10
    },
    { id: 'umor', vrsta: 'mera', ime: 'Umor', min: 0, max: 10 }
  ],

  vece: [
    { id: 'umor', vrsta: 'mera', ime: 'Umor', min: 0, max: 10 },
    { id: 'kvalitetDana', vrsta: 'izbor', ime: 'Kakav je bio dan u celini', opcije: OCENA5 }
  ]
};

/* Kod fibromijalgije umor i magla u glavi umeju da budu teži od samog bola,
   pa se prate zasebno i svaki put. */
const MAGLA = {
  id: 'magla', vrsta: 'mera', ime: 'Magla u glavi',
  opis: 'Koliko vam je bilo teško da se skoncentrišete', min: 0, max: 10
};

const FIBRO = {
  jutro: [
    {
      id: 'neosvezavajucSan', vrsta: 'prekidac', ime: 'Neosvežavajući san',
      opis: 'Spavali ste, ali se niste odmorili'
    },
    { id: 'umor', vrsta: 'mera', ime: 'Umor', min: 0, max: 10 },
    MAGLA
  ],
  podne: [
    MAGLA,
    {
      id: 'osetljivost', vrsta: 'viseizbor', ime: 'Osetljivost',
      opis: 'Šta vam je danas smetalo više nego inače',
      opcije: [
        { v: 'dodir', ime: 'Dodir' },
        { v: 'buka', ime: 'Buka' },
        { v: 'svetlo', ime: 'Svetlo' }
      ]
    }
  ],
  vece: [
    MAGLA,
    { id: 'glavobolja', vrsta: 'prekidac', ime: 'Glavobolja' },
    { id: 'varenje', vrsta: 'prekidac', ime: 'Problemi sa varenjem' }
  ]
};

/** Pitanja za jedan deo dana, po izabranom režimu. */
export function poljaZa(deo, rezim) {
  const osnovna = OSNOVNA[deo] ?? [];
  if (!rezim?.fibro) return osnovna;
  const vecPostoji = new Set(osnovna.map(p => p.id));
  return [...osnovna, ...(FIBRO[deo] ?? []).filter(p => !vecPostoji.has(p.id))];
}

/** Sva pitanja koja se ikad mogu javiti — za čitanje starih unosa. */
export const SVA_POLJA = [
  ...Object.values(OSNOVNA).flat(),
  ...Object.values(FIBRO).flat()
].filter((p, i, a) => a.findIndex(x => x.id === p.id) === i);

/* U akuzativu, jer stoje iza „osetljivost na…". */
const OSETLJIVOST_NA = { dodir: 'dodir', buka: 'buku', svetlo: 'svetlo' };

/** „dodir", „dodir i buku", „dodir, buku i svetlo". */
function nabroj(reci) {
  if (reci.length <= 1) return reci.join('');
  return `${reci.slice(0, -1).join(', ')} i ${reci[reci.length - 1]}`;
}

/** Kratak ispis vrednosti za pregled dana. */
export function ispisi(poljeId, vrednost) {
  if (vrednost == null) return null;
  switch (poljeId) {
    case 'ukocenost':
      if (vrednost === 0) return 'bez ukočenosti';
      if (vrednost < 60) return `ukočenost ${vrednost} min`;
      if (vrednost >= 180) return 'ukočenost preko 2 h';
      return `ukočenost ${String(vrednost / 60).replace('.', ',')} h`;
    case 'san':
      return `san: ${OCENA5.find(o => o.v === vrednost)?.ime.toLowerCase()}`;
    case 'kvalitetDana':
      return `dan: ${OCENA5.find(o => o.v === vrednost)?.ime.toLowerCase()}`;
    case 'umor':          return `umor ${vrednost}/10`;
    case 'opterecenje':   return `opterećenje ${vrednost}/10`;
    case 'magla':         return `magla u glavi ${vrednost}/10`;
    case 'neosvezavajucSan': return vrednost ? 'san nije osvežio' : 'san je osvežio';
    case 'glavobolja':    return vrednost ? 'glavobolja' : null;
    case 'varenje':       return vrednost ? 'problemi sa varenjem' : null;
    case 'osetljivost':
      return vrednost.length
        ? `osetljivost na ${nabroj(vrednost.map(v => OSETLJIVOST_NA[v] ?? v))}`
        : null;
    default:
      return String(vrednost);
  }
}
