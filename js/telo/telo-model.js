/**
 * Model ljudskog tela — pravi se u kodu, ne učitava se ni jedan spoljni fajl.
 *
 * Gotov model sa 36 imenovanih delova ne postoji besplatno i sa čistom
 * licencom, a i najmanji bi bio megabajt naviše. Ovako model ne košta ništa u
 * veličini, pravi se za par milisekundi, a granice regiona su tačno tamo gde
 * ih mi postavimo.
 *
 * Udovi su neprekidne cevi promenljive debljine (vidi `cev.js`) — zadebljaju
 * na ramenu, bicepsu, kolenu i listu, a regioni su trake duž iste površine,
 * pa se na prelazu ne vidi šav. Trup i glava su rotaciona tela sa profilnom
 * krivom, spljoštena po dubini jer je čovek širi nego deblji.
 *
 * Mere su u metrima, telo je visoko 1,75 m i gleda ka +Z.
 * Strane su iz ugla osobe: leva strana tela je +X, desna je -X. Zato se u
 * pogledu spreda leva strana vidi na desnoj polovini ekrana — isto kao kad
 * lekar stoji naspram pacijenta.
 *
 * Srazmere prate standardne telesne mere za visinu 1,75 m: rame na 0,818
 * visine, lakat 0,630, ručni zglob i prepone 0,485, koleno 0,285.
 */

import { REGIONI } from './regioni.js';
import { napraviCev } from './cev.js';

export const VISINA = 1.75;

/* Presek trupa: (poluprečnik, visina), obrne se oko uspravne ose. */
const PROFIL_TRUPA = [
  [0.012, 0.838], [0.062, 0.844], [0.100, 0.856], [0.124, 0.876],
  [0.134, 0.906], [0.133, 0.948], [0.124, 0.996], [0.114, 1.042],
  [0.111, 1.078], [0.116, 1.116], [0.127, 1.168], [0.138, 1.226],
  [0.145, 1.282], [0.146, 1.330], [0.141, 1.378], [0.128, 1.412],
  [0.104, 1.436], [0.068, 1.452], [0.030, 1.460]
];

/* Presek glave: lobanja koja se sužava ka bradi. */
const PROFIL_GLAVE = [
  [0.004, 1.748], [0.034, 1.744], [0.060, 1.731], [0.076, 1.708],
  [0.085, 1.676], [0.087, 1.642], [0.085, 1.610], [0.078, 1.582],
  [0.067, 1.556], [0.053, 1.535], [0.038, 1.521], [0.022, 1.512],
  [0.006, 1.508]
];

const DUBINA_TRUPA = 0.70;
const DUBINA_GLAVE = 1.14;

/** Ruka od ramena do ručnog zgloba; `s` je strana (+1 levo, -1 desno). */
const ruka = (s, f) => [
  { p: [s * 0.166, 1.474, 0.000], ra: 0.044, region: `rame-${f}` },
  { p: [s * 0.172, 1.430, 0.000], ra: 0.058, region: `rame-${f}` },
  { p: [s * 0.175, 1.362, 0.003], ra: 0.055, region: `nadlaktica-${f}` },
  { p: [s * 0.182, 1.262, 0.006], ra: 0.050, region: `nadlaktica-${f}` },
  { p: [s * 0.189, 1.168, 0.010], ra: 0.044, region: `lakat-${f}` },
  { p: [s * 0.194, 1.103, 0.014], ra: 0.047, region: `lakat-${f}` },
  { p: [s * 0.199, 1.046, 0.016], ra: 0.045, region: `podlaktica-${f}` },
  { p: [s * 0.205, 0.958, 0.019], ra: 0.040, region: `podlaktica-${f}` },
  { p: [s * 0.209, 0.892, 0.021], ra: 0.034, region: `rucni-zglob-${f}` },
  { p: [s * 0.212, 0.849, 0.022], ra: 0.033, rb: 0.030, region: `rucni-zglob-${f}` },
  { p: [s * 0.214, 0.818, 0.024], ra: 0.022, rb: 0.038, region: `saka-${f}` }
];

/** Šaka: široka preko zglobova prstiju, tanka po debljini — kao prava, i
    okrenuta tako da se nadlanica vidi spreda, pa je lako pogoditi prstom. */
const saka = (s, f) => [
  { p: [s * 0.214, 0.822, 0.024], ra: 0.036, rb: 0.020, region: `saka-${f}` },
  { p: [s * 0.218, 0.785, 0.026], ra: 0.045, rb: 0.019, region: `saka-${f}` },
  { p: [s * 0.221, 0.752, 0.028], ra: 0.045, rb: 0.018, region: `saka-${f}` },
  { p: [s * 0.223, 0.728, 0.029], ra: 0.040, rb: 0.015, region: `saka-${f}` }
];

/** Noga od kuka do skočnog zgloba. */
const noga = (s, f) => [
  { p: [s * 0.088, 0.912, 0.000], ra: 0.070, region: `kuk-${f}` },
  { p: [s * 0.088, 0.862, 0.000], ra: 0.080, region: `kuk-${f}` },
  { p: [s * 0.090, 0.800, 0.002], ra: 0.078, region: `butina-${f}` },
  { p: [s * 0.093, 0.700, 0.004], ra: 0.072, region: `butina-${f}` },
  { p: [s * 0.096, 0.602, 0.006], ra: 0.063, region: `butina-${f}` },
  { p: [s * 0.097, 0.546, 0.008], ra: 0.058, region: `koleno-${f}` },
  { p: [s * 0.098, 0.499, 0.009], ra: 0.058, region: `koleno-${f}` },
  { p: [s * 0.099, 0.455, 0.006], ra: 0.052, region: `list-${f}` },
  { p: [s * 0.100, 0.398, 0.000], ra: 0.056, rb: 0.058, region: `list-${f}` },
  { p: [s * 0.101, 0.320, -0.004], ra: 0.049, region: `list-${f}` },
  { p: [s * 0.101, 0.220, -0.004], ra: 0.039, region: `list-${f}` },
  { p: [s * 0.101, 0.150, -0.002], ra: 0.033, region: `skocni-zglob-${f}` },
  { p: [s * 0.101, 0.098, 0.000], ra: 0.035, rb: 0.032, region: `skocni-zglob-${f}` },
  { p: [s * 0.101, 0.062, 0.002], ra: 0.030, rb: 0.028, region: `skocni-zglob-${f}` }
];

/** Stopalo leži po +Z: peta iza skočnog zgloba, prsti ispred. */
const stopalo = (s, f) => [
  { p: [s * 0.101, 0.046, -0.064], ra: 0.028, rb: 0.022, region: `stopalo-${f}` },
  { p: [s * 0.101, 0.040, -0.030], ra: 0.036, rb: 0.032, region: `stopalo-${f}` },
  { p: [s * 0.102, 0.035, 0.020], ra: 0.039, rb: 0.031, region: `stopalo-${f}` },
  { p: [s * 0.102, 0.030, 0.078], ra: 0.038, rb: 0.026, region: `stopalo-${f}` },
  { p: [s * 0.102, 0.026, 0.124], ra: 0.036, rb: 0.021, region: `prsti-stopala-${f}` },
  { p: [s * 0.102, 0.024, 0.160], ra: 0.031, rb: 0.017, region: `prsti-stopala-${f}` },
  { p: [s * 0.102, 0.024, 0.178], ra: 0.018, rb: 0.011, region: `prsti-stopala-${f}` }
];

/** Kosina od vrata ka ramenu; pripada regionu ramena jer tu ljudi i pokazuju. */
const trapez = (s, f) => [
  { p: [0.000, 1.452, -0.032], ra: 0.044, region: `rame-${f}` },
  { p: [s * 0.076, 1.452, -0.024], ra: 0.052, region: `rame-${f}` },
  { p: [s * 0.150, 1.438, -0.008], ra: 0.058, region: `rame-${f}` }
];

const vrat = [
  { p: [0, 1.374, 0], ra: 0.062, region: 'vrat' },
  { p: [0, 1.428, 0], ra: 0.056, region: 'vrat' },
  { p: [0, 1.492, 0], ra: 0.052, region: 'vrat' },
  { p: [0, 1.538, 0], ra: 0.050, region: 'vrat' }
];

/* Kičma i krsta stoje kao greben na leđima (-Z): vide se iz pogleda nazad i
   sa bokova, a spreda ih trup zaklanja. */
const kicma = [
  [[[0, 1.392, -0.094], [0, 1.290, -0.098], [0, 1.180, -0.090]], 0.044, 0.020, 'kicma-gornja'],
  [[[0, 1.180, -0.090], [0, 1.092, -0.079], [0, 1.008, -0.078]], 0.041, 0.019, 'kicma-donja'],
  [[[0, 1.008, -0.078], [0, 0.956, -0.084], [0, 0.898, -0.090]], 0.046, 0.020, 'krsta']
];

/** Prsti šake: četiri prsta preko dlana plus palac; svi su jedan region. */
function prstiSake(s, f) {
  const cevi = [];
  const koren = [s * 0.223, 0.728, 0.029];
  const duzine = [0.059, 0.073, 0.077, 0.066];
  /* Prsti se šire po širini šake; palac je izdvojen ka telu i malo napred. */
  [0.031, 0.011, -0.010, -0.030].forEach((dx, i) => {
    const y = koren[1] - duzine[i];
    cevi.push([
      { p: [koren[0] + s * dx, koren[1] + 0.004, koren[2]], ra: 0.0105, region: `prsti-sake-${f}` },
      { p: [koren[0] + s * dx * 1.06, y + 0.016, koren[2] + 0.002], ra: 0.0098, region: `prsti-sake-${f}` },
      { p: [koren[0] + s * dx * 1.10, y, koren[2] + 0.003], ra: 0.0082, region: `prsti-sake-${f}` }
    ]);
  });
  cevi.push([
    { p: [s * 0.192, 0.772, 0.030], ra: 0.0135, region: `prsti-sake-${f}` },
    { p: [s * 0.180, 0.746, 0.040], ra: 0.0120, region: `prsti-sake-${f}` },
    { p: [s * 0.172, 0.726, 0.046], ra: 0.0098, region: `prsti-sake-${f}` }
  ]);
  return cevi;
}

/* ── tačke regiona ───────────────────────────────────────────────────────
 *
 * Tačka je mesto koje se gađa prstom i gde stoji broj jačine. Ne izvodi se iz
 * geometrije, nego se postavlja namerno NA površinu tela, uz normalu — sredina
 * geometrije bi kod vrata, ramena i kukova pala unutar tela, pa bi tačka uvek
 * ispadala zaklonjena.
 *
 * Većina regiona ima dve tačke: spreda-spolja i pozadi-spolja. Tako svaki
 * region ima tačku okrenutu ka gledaocu iz sva četiri pogleda; prikazuje se
 * ona koja je okrenuta napred. Kičma i krsta imaju samo zadnju, jer ih spreda
 * zaklanja trup — i tako i treba.
 */

/**
 * Tačka na površini uda, na uglu `stepeni` oko ose: 0° je napred (+Z),
 * 90° je ka spolja. Normala se računa iz preseka, pa je tačna i kad presek
 * nije krug (šaka je široka a tanka, kičma je spljoštena uz leđa).
 */
function naUdu(putanja, indeks, stepeni, s) {
  const { p, ra, rb = ra } = putanja[indeks];
  const a = (stepeni * Math.PI) / 180;
  const u = Math.sin(a), v = Math.cos(a);
  const n = [(s * u) / ra, 0, v / rb];
  const d = Math.hypot(n[0], n[2]) || 1;
  return {
    p: [p[0] + s * ra * u, p[1], p[2] + rb * v],
    n: [n[0] / d, 0, n[2] / d]
  };
}

/** Tačka postavljena rukom, sa zadatom normalom. */
const rucno = (p, n) => {
  const d = Math.hypot(...n) || 1;
  return { p, n: n.map(x => x / d) };
};

/* Koji indeks na putanji uda nosi tačku kog regiona, i pod kojim uglovima.
   Tri ugla po regionu — napred-spolja, sa strane, pozadi-spolja — pa ud ima
   tačku okrenutu ka gledaocu iz sva četiri pogleda. Bez bočne tačke koleno i
   list nestanu čim se telo okrene u profil, iako se jasno vide. Prvi ugao u
   nizu bira se kad se više njih vidi. */
const NA_RUCI = [
  ['rame',        1, [46, 90, 134]],
  ['nadlaktica',  3, [50, 90, 130]],
  ['lakat',       5, [46, 90, 134]],
  ['podlaktica',  7, [50, 90, 130]],
  ['rucni-zglob', 9, [46, 90, 134]]
];
const NA_NOZI = [
  ['kuk',          1, [54, 90, 126]],
  ['butina',       3, [50, 90, 130]],
  ['koleno',       6, [6, 90, 174]],    // koleno se oseća spreda
  ['list',         8, [174, 90, 6]],    // list je pozadi
  ['skocni-zglob', 12, [60, 90, 120]]
];

/** @returns {Map<string, {p:number[], n:number[]}[]>} */
export function napraviTacke() {
  const tacke = new Map();
  const stavi = (id, niz) => tacke.set(id, niz);

  stavi('vrat', [
    rucno([0, 1.468, 0.054], [0, 0.18, 1]),
    rucno([0, 1.468, -0.054], [0, 0.18, -1]),
    /* Bočne tačke stoje napred-bočno, na grlu: trapezni mišić je iza vrata,
       pa bi tačke tačno sa strane u profilu pale iza njegovog ispupčenja. */
    rucno([0.036, 1.505, 0.042], [0.60, 0.15, 0.79]),
    rucno([-0.036, 1.505, 0.042], [-0.60, 0.15, 0.79])
  ]);
  stavi('kicma-gornja', [rucno([0, 1.290, -0.120], [0, 0.1, -1])]);
  stavi('kicma-donja', [rucno([0, 1.092, -0.100], [0, 0.1, -1])]);
  stavi('krsta', [rucno([0, 0.954, -0.106], [0, 0.1, -1])]);

  for (const [s, f] of [[1, 'l'], [-1, 'd']]) {
    stavi(`vilica-${f}`, [rucno([s * 0.082, 1.590, 0.026], [s * 0.86, 0.1, 0.5])]);
    stavi(`si-zglob-${f}`, [rucno([s * 0.048, 0.872, -0.100], [s * 0.3, 0, -0.95])]);

    const r = ruka(s, f), n = noga(s, f);
    for (const [osnova, i, uglovi] of NA_RUCI) {
      stavi(`${osnova}-${f}`, uglovi.map(u => naUdu(r, i, u, s)));
    }
    for (const [osnova, i, uglovi] of NA_NOZI) {
      stavi(`${osnova}-${f}`, uglovi.map(u => naUdu(n, i, u, s)));
    }

    const sk = saka(s, f);
    stavi(`saka-${f}`, [naUdu(sk, 2, 0, s), naUdu(sk, 2, 90, s), naUdu(sk, 2, 180, s)]);
    stavi(`prsti-sake-${f}`, [
      rucno([s * 0.234, 0.668, 0.032], [s * 0.15, 0, 0.99]),
      rucno([s * 0.264, 0.672, 0.029], [s * 0.99, 0, 0.1]),
      rucno([s * 0.234, 0.668, 0.026], [s * 0.15, 0, -0.99])
    ]);

    /* Stopalo leži vodoravno, pa mu tačke gledaju naviše — kamera stoji iznad
       nivoa stopala i vidi ih i spreda i sa strane. */
    stavi(`stopalo-${f}`, [
      rucno([s * 0.102, 0.064, 0.020], [s * 0.2, 0.82, 0.54]),
      rucno([s * 0.101, 0.052, -0.074], [s * 0.1, 0.5, -0.86])
    ]);
    stavi(`prsti-stopala-${f}`, [
      rucno([s * 0.102, 0.042, 0.152], [s * 0.15, 0.62, 0.77]),
      rucno([s * 0.102, 0.030, 0.176], [s * 0.15, 0.3, 0.94])
    ]);
  }

  return tacke;
}

export function napraviTelo(THREE, boje) {
  const grupa = new THREE.Group();

  /* Materijal je mat — bez sjaja i odsjaja, kako dizajn-sistem traži. */
  const matNeutralno = new THREE.MeshLambertMaterial({ color: new THREE.Color(boje.neutralno) });
  const materijali = new Map(
    REGIONI.map(r => [r.id, new THREE.MeshLambertMaterial({ color: new THREE.Color(boje.region) })])
  );

  const meshoviPoRegionu = new Map(REGIONI.map(r => [r.id, []]));
  const zaPogadjanje = [];

  function dodajGeometriju(geo, regionId) {
    const mesh = new THREE.Mesh(geo, regionId ? materijali.get(regionId) : matNeutralno);
    if (regionId) {
      mesh.userData.region = regionId;
      meshoviPoRegionu.get(regionId).push(mesh);
      zaPogadjanje.push(mesh);
    } else {
      mesh.userData.neutralno = true;
    }
    grupa.add(mesh);
    return mesh;
  }

  /** Cev se iseče na po jedan mesh za svaki region duž nje. */
  function dodajCev(tacke, opcije) {
    const { pozicije, normale, trake } = napraviCev(tacke, opcije);
    const spojene = new Map();
    for (const t of trake) {
      const kljuc = t.region ?? '';
      if (!spojene.has(kljuc)) spojene.set(kljuc, []);
      spojene.get(kljuc).push(t);
    }
    for (const [kljuc, delovi] of spojene) {
      const brojTemena = delovi.reduce((z, t) => z + (t.do - t.od) * 3, 0);
      const p = new Float32Array(brojTemena * 3);
      const nn = new Float32Array(brojTemena * 3);
      let o = 0;
      for (const t of delovi) {
        const od = t.od * 9, duz = (t.do - t.od) * 9;
        p.set(pozicije.subarray(od, od + duz), o);
        nn.set(normale.subarray(od, od + duz), o);
        o += duz;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
      dodajGeometriju(geo, kljuc || null);
    }
  }

  /** Rotaciono telo iz profilne krive, spljošteno po dubini. */
  function dodajObrtno(profil, dubina, segmenata, regionId) {
    const geo = new THREE.LatheGeometry(profil.map(([r, y]) => new THREE.Vector2(r, y)), segmenata);
    geo.scale(1, 1, dubina);
    geo.computeVertexNormals();   // posle spljoštenja stare normale više ne važe
    return dodajGeometriju(geo, regionId);
  }

  function dodajKuglu(r, regionId, poz, razmera) {
    const geo = new THREE.SphereGeometry(r, 22, 16);
    const mesh = dodajGeometriju(geo, regionId);
    mesh.position.set(...poz);
    if (razmera) mesh.scale.set(...razmera);
    return mesh;
  }

  /* ── glava, vilični zglobovi, vrat ────────────────────────────────── */
  dodajObrtno(PROFIL_GLAVE, DUBINA_GLAVE, 32, null);
  for (const [s, f] of [[1, 'l'], [-1, 'd']]) {
    dodajKuglu(0.023, `vilica-${f}`, [s * 0.070, 1.590, 0.020], [0.85, 1.05, 1]);
  }
  dodajCev(vrat, { segmenata: 24 });

  /* ── trup i kičma ─────────────────────────────────────────────────── */
  dodajObrtno(PROFIL_TRUPA, DUBINA_TRUPA, 34, null);
  for (const [putanja, ra, rb, id] of kicma) {
    dodajCev(putanja.map(p => ({ p, ra, rb, region: id })), { segmenata: 18 });
  }
  for (const [s, f] of [[1, 'l'], [-1, 'd']]) {
    dodajKuglu(0.034, `si-zglob-${f}`, [s * 0.044, 0.872, -0.082], [1, 1.2, 0.55]);
  }

  /* ── ruke i noge ──────────────────────────────────────────────────── */
  for (const [s, f] of [[1, 'l'], [-1, 'd']]) {
    dodajCev(trapez(s, f), { segmenata: 20 });
    dodajCev(ruka(s, f), { segmenata: 24 });
    dodajCev(saka(s, f), { segmenata: 22 });
    for (const prst of prstiSake(s, f)) dodajCev(prst, { segmenata: 12 });
    dodajCev(noga(s, f), { segmenata: 26 });
    dodajCev(stopalo(s, f), { segmenata: 20 });
  }

  /* Telo stoji tako da mu je sredina u koordinatnom početku — kamera onda
     gleda u sredinu, a okretanje se vrti oko uspravne ose kroz kičmu. */
  grupa.position.y = -VISINA / 2;

  return { grupa, materijali, meshoviPoRegionu, zaPogadjanje, visina: VISINA };
}
