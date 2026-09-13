/**
 * Model ljudskog tela — pravi se u kodu, ne učitava se ni jedan spoljni fajl.
 *
 * Zašto tako: gotov model sa 36 imenovanih delova ne postoji besplatno i sa
 * čistom licencom, a i najmanji bi bio megabajt naviše. Ovako model ne košta
 * ništa u veličini, pravi se za par milisekundi, a granice regiona su tačno
 * tamo gde ih mi postavimo.
 *
 * Mere su u metrima, telo je visoko 1,75 m i gleda ka +Z.
 * Strane su iz ugla osobe: leva strana tela je +X, desna je -X. Zato se u
 * pogledu spreda leva strana vidi na desnoj polovini ekrana — isto kao kad
 * lekar stoji naspram pacijenta.
 */

import { REGIONI } from './regioni.js';

/* Ključne tačke skeleta, postavljene po standardnim telesnim srazmerama za
   visinu od 1,75 m (rame na 0,818 visine, lakat 0,630, ručni zglob i prepone
   0,485, koleno 0,285). Sve ostalo se računa iz njih, pa se srazmere menjaju
   na jednom mestu. `s` je strana: +1 levo, -1 desno. */
const T = {
  temeY: 1.746, lobanjaY: 1.660, vilicaY: 1.572, tmzY: 1.588,
  vratDno: 1.400, vratVrh: 1.545,
  rame:      (s) => [s * 0.168, 1.428, 0.000],
  lakat:     (s) => [s * 0.194, 1.103, 0.014],
  rucni:     (s) => [s * 0.212, 0.849, 0.022],
  dlanKraj:  (s) => [s * 0.220, 0.745, 0.024],
  prstiKraj: (s) => [s * 0.224, 0.660, 0.026],
  kuk:       (s) => [s * 0.088, 0.862, 0.000],
  koleno:    (s) => [s * 0.098, 0.499, 0.008],
  skocni:    (s) => [s * 0.101, 0.072, 0.000],
  peta:      (s) => [s * 0.101, 0.036, -0.058],
  prstiNoge: (s) => [s * 0.101, 0.030, 0.150]
};

/* Presek trupa: (poluprečnik, visina). Obrne se oko uspravne ose pa se spljošti
   po dubini, jer je čovek osetno širi nego deblji. */
const PROFIL_TRUPA = [
  [0.010, 0.842], [0.072, 0.850], [0.112, 0.868], [0.131, 0.902],
  [0.130, 0.960], [0.116, 1.030], [0.112, 1.075], [0.122, 1.140],
  [0.138, 1.225], [0.145, 1.300], [0.142, 1.370], [0.120, 1.412],
  [0.075, 1.438], [0.030, 1.450]
];
const DUBINA_TRUPA = 0.68;

export function napraviTelo(THREE, boje) {
  const grupa = new THREE.Group();
  const UP = new THREE.Vector3(0, 1, 0);

  /** Materijal je mat — bez sjaja i odsjaja, kako dizajn-sistem traži. */
  const matNeutralno = new THREE.MeshLambertMaterial({ color: new THREE.Color(boje.neutralno) });
  const materijali = new Map();
  for (const r of REGIONI) {
    materijali.set(r.id, new THREE.MeshLambertMaterial({ color: new THREE.Color(boje.region) }));
  }

  const meshoviPoRegionu = new Map(REGIONI.map(r => [r.id, []]));
  const zaPogadjanje = [];

  function dodaj(geo, regionId, { pozicija, razmera, rotacija } = {}) {
    const mesh = new THREE.Mesh(geo, regionId ? materijali.get(regionId) : matNeutralno);
    if (pozicija) mesh.position.set(...pozicija);
    if (razmera) mesh.scale.set(...razmera);
    if (rotacija) mesh.rotation.set(...rotacija);
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

  const kugla = (r, regionId, poz, razmera) =>
    dodaj(new THREE.SphereGeometry(r, 24, 18), regionId, { pozicija: poz, razmera });

  /** Sužen ud između dve tačke; krajevi su ravni, ali ih pokrivaju kugle zglobova. */
  function ud(a, b, rGore, rDole, regionId) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const smer = new THREE.Vector3().subVectors(B, A);
    const duzina = smer.length();
    const geo = new THREE.CylinderGeometry(rGore, rDole, duzina, 20, 1, true);
    const mesh = dodaj(geo, regionId);
    mesh.position.copy(A).addScaledVector(smer, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, smer.normalize());
    return mesh;
  }

  /* ── glava i vrat ─────────────────────────────────────────────────── */
  /* Glava je od dva dela — lobanje i uže vilice ispod nje. Jedna kugla,
     ma kako razvučena, uvek ispadne jajolika. */
  kugla(0.084, null, [0, T.lobanjaY, 0], [1, 1.02, 1.08]);
  kugla(0.068, null, [0, T.vilicaY, 0.006], [1, 0.88, 1.02]);
  ud([0, T.vratDno, 0], [0, T.vratVrh, 0], 0.055, 0.050, 'vrat');
  for (const [s, id] of [[1, 'vilica-l'], [-1, 'vilica-d']]) {
    kugla(0.023, id, [s * 0.069, T.tmzY, 0.022], [0.85, 1.05, 1]);
  }

  /* ── trup ─────────────────────────────────────────────────────────── */
  const tacke = PROFIL_TRUPA.map(([r, y]) => new THREE.Vector2(r, y));
  const trup = new THREE.LatheGeometry(tacke, 28);
  trup.scale(1, 1, DUBINA_TRUPA);
  dodaj(trup, null);

  /* Kičma i krsta stoje na leđima (-Z), kao spljoštene trake uz površinu trupa.
     Zato se vide iz pogleda nazad i sa bokova, a spreda ih trup zaklanja. */
  const kicma = [
    ['kicma-gornja', 1.395, 1.175, 0.042, -0.092],
    ['kicma-donja',  1.175, 1.005, 0.040, -0.079],
    ['krsta',        1.005, 0.898, 0.044, -0.087]
  ];
  for (const [id, yGore, yDole, r, z] of kicma) {
    const sredina = (yGore + yDole) / 2;
    const visina = yGore - yDole;
    dodaj(new THREE.CapsuleGeometry(r, Math.max(visina - r * 2, 0.02), 6, 16), id,
      { pozicija: [0, sredina, z], razmera: [1.3, 1, 0.5] });
  }
  for (const [s, id] of [[1, 'si-zglob-l'], [-1, 'si-zglob-d']]) {
    kugla(0.034, id, [s * 0.044, 0.872, -0.084], [1, 1.15, 0.5]);
  }

  /* ── ruke ─────────────────────────────────────────────────────────── */
  for (const [s, suf] of [[1, 'l'], [-1, 'd']]) {
    const rame = T.rame(s), lakat = T.lakat(s), rucni = T.rucni(s);
    const dlan = T.dlanKraj(s), prsti = T.prstiKraj(s);

    ud([0, 1.455, -0.004], [s * 0.150, 1.432, -0.004], 0.050, 0.058, `rame-${suf}`);
    kugla(0.064, `rame-${suf}`, rame, [1, 1.02, 0.96]);
    ud(rame, lakat, 0.050, 0.039, `nadlaktica-${suf}`);
    kugla(0.045, `lakat-${suf}`, lakat, [1, 0.95, 1]);
    ud(lakat, rucni, 0.042, 0.031, `podlaktica-${suf}`);
    kugla(0.036, `rucni-zglob-${suf}`, rucni, [1, 0.82, 0.92]);

    /* Dlan je pljosnat kao prava šaka: širok po dubini, tanak po debljini. */
    ud(rucni, dlan, 0.040, 0.040, `saka-${suf}`).scale.set(0.40, 1, 1.10);
    kugla(0.040, `saka-${suf}`, [dlan[0], dlan[1] + 0.006, dlan[2]], [0.40, 0.60, 1.10]);

    /* Četiri prsta poređana po širini dlana, plus palac uz telo.
       Svi zajedno čine jedan region — „prsti šake". */
    const duzine = [0.074, 0.085, 0.081, 0.066];
    [-0.036, -0.012, 0.012, 0.035].forEach((dz, i) => {
      const koren = [dlan[0], dlan[1] - 0.004, dlan[2] + dz];
      const vrh = [prsti[0], dlan[1] - duzine[i], dlan[2] + dz * 1.1];
      ud(koren, vrh, 0.011, 0.008, `prsti-sake-${suf}`);
      kugla(0.008, `prsti-sake-${suf}`, vrh);
    });
    ud([dlan[0] - s * 0.010, dlan[1] + 0.040, dlan[2] - 0.030],
       [dlan[0] - s * 0.018, dlan[1] - 0.004, dlan[2] - 0.048], 0.012, 0.010, `prsti-sake-${suf}`);
  }

  /* ── noge ─────────────────────────────────────────────────────────── */
  for (const [s, suf] of [[1, 'l'], [-1, 'd']]) {
    const kuk = T.kuk(s), koleno = T.koleno(s), skocni = T.skocni(s);
    const peta = T.peta(s), prsti = T.prstiNoge(s);

    kugla(0.066, `kuk-${suf}`, kuk, [1, 0.98, 0.98]);
    ud(kuk, koleno, 0.078, 0.054, `butina-${suf}`);
    kugla(0.056, `koleno-${suf}`, koleno, [1, 0.96, 1.06]);
    ud(koleno, skocni, 0.056, 0.036, `list-${suf}`);
    /* Ispupčenje lista pozadi — da potkolenica ne bude puki konus. */
    kugla(0.048, `list-${suf}`, [skocni[0], 0.396, -0.026], [0.9, 1.5, 0.84]);
    kugla(0.040, `skocni-zglob-${suf}`, skocni, [1, 0.86, 0.92]);

    /* Stopalo leži po +Z; peta je iza skočnog zgloba, prsti ispred. */
    ud(peta, [prsti[0], prsti[1] + 0.004, prsti[2] - 0.010], 0.036, 0.033, `stopalo-${suf}`)
      .scale.set(1.06, 1, 0.70);
    kugla(0.034, `prsti-stopala-${suf}`, prsti, [1.1, 0.66, 0.80]);
  }

  /* Telo stoji tako da mu je težište u koordinatnom početku — kamera onda
     gleda u sredinu, a okretanje se vrti oko uspravne ose kroz kičmu. */
  grupa.position.y = -T.temeY / 2;

  return { grupa, materijali, meshoviPoRegionu, zaPogadjanje, visina: T.temeY };
}
