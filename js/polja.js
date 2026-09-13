/**
 * Šta se pita uz koji deo dana.
 *
 * Jutro, podne i veče ne nose ista pitanja — jutarnja ukočenost ima smisla
 * samo ujutru, a kakav je dan bio u celini može da se oceni tek uveče.
 * Sve je birano tako da se popuni sa nekoliko dodira, ne kucanjem.
 */

const OCENA5 = [
  { v: 1, ime: 'Vrlo loš' },
  { v: 2, ime: 'Loš' },
  { v: 3, ime: 'Osrednji' },
  { v: 4, ime: 'Dobar' },
  { v: 5, ime: 'Vrlo dobar' }
];

export const POLJA = {
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
      id: 'opterecenje', vrsta: 'klizac', ime: 'Opterećenje',
      opis: 'Koliko ste se do sada naprezali', min: 0, max: 10
    },
    { id: 'umor', vrsta: 'klizac', ime: 'Umor', min: 0, max: 10 }
  ],

  vece: [
    { id: 'umor', vrsta: 'klizac', ime: 'Umor', min: 0, max: 10 },
    { id: 'kvalitetDana', vrsta: 'izbor', ime: 'Kakav je bio dan u celini', opcije: OCENA5 }
  ]
};

/** Kratak ispis vrednosti za pregled dana. */
export function ispisi(poljeId, vrednost) {
  if (vrednost == null) return null;
  if (poljeId === 'ukocenost') {
    if (vrednost === 0) return 'bez ukočenosti';
    if (vrednost < 60) return `ukočenost ${vrednost} min`;
    if (vrednost >= 180) return 'ukočenost preko 2 h';
    return `ukočenost ${vrednost / 60} h`.replace('.5', ',5');
  }
  if (poljeId === 'san') return `san: ${OCENA5.find(o => o.v === vrednost)?.ime.toLowerCase()}`;
  if (poljeId === 'kvalitetDana') return `dan: ${OCENA5.find(o => o.v === vrednost)?.ime.toLowerCase()}`;
  if (poljeId === 'umor') return `umor ${vrednost}/10`;
  if (poljeId === 'opterecenje') return `opterećenje ${vrednost}/10`;
  return String(vrednost);
}
