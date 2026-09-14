/**
 * Cev sa promenljivim poluprečnikom — osnovni alat za pravljenje udova.
 *
 * Ud se ne sklapa od valjaka i kugli koje se preklapaju, jer se tu uvek vidi
 * šav na spoju. Umesto toga se provuče jedna neprekidna cev kroz niz tačaka,
 * a debljina se menja duž nje: zadebljanje na ramenu, bicepsu, kolenu, listu.
 *
 * Granice regiona padaju unutar te iste cevi. Normale se računaju preko cele
 * cevi pre deljenja, pa je osvetljenje neprekidno i preko granice — koleno i
 * butina dele istu površinu, samo su različito obojeni.
 *
 * Svaka tačka nosi:
 *   p      [x,y,z] položaj
 *   ra     poluprečnik po prvoj osi preseka (kod uspravnog uda to je širina)
 *   rb     poluprečnik po drugoj osi (dubina); ako se izostavi, presek je krug
 *   region kojem regionu pripada traka OD ove tačke DO sledeće
 */

const GORE = [0, 1, 0];
const NAPRED = [0, 0, 1];

const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const skalar = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vektorski = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
function jedinicni(a) {
  const d = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / d, a[1] / d, a[2] / d];
}

/**
 * @returns {{pozicije:Float32Array, normale:Float32Array, trake:{region:string|null, od:number, do:number}[]}}
 *          `trake` pokazuju koji raspon trouglova pripada kom regionu.
 */
export function napraviCev(tacke, { segmenata = 24, zatvoriPocetak = true, zatvoriKraj = true } = {}) {
  const n = tacke.length;

  /* Pravci duž putanje; na krajevima se uzima jednostrana razlika. */
  const pravci = tacke.map((_, i) => {
    const a = tacke[Math.max(0, i - 1)].p;
    const b = tacke[Math.min(n - 1, i + 1)].p;
    return jedinicni(minus(b, a));
  });

  /* Okviri preseka se prenose duž cevi, da se ne uvrne na krivinama. */
  const osaA = [], osaB = [];
  for (let i = 0; i < n; i++) {
    const t = pravci[i];
    let a;
    if (i === 0) {
      /* Početni okvir: uzmi osu koja nije skoro paralelna sa pravcem. */
      const oslonac = Math.abs(skalar(t, NAPRED)) > 0.9 ? GORE : NAPRED;
      a = jedinicni(vektorski(t, oslonac));
    } else {
      /* Prethodnu osu obori u ravan upravnu na novi pravac. */
      const p = osaA[i - 1];
      const k = skalar(p, t);
      a = jedinicni([p[0] - t[0] * k, p[1] - t[1] * k, p[2] - t[2] * k]);
    }
    osaA.push(a);
    osaB.push(jedinicni(vektorski(t, a)));
  }

  /* Temena prstenova. */
  const prstenovi = [];
  for (let i = 0; i < n; i++) {
    const { p, ra, rb = ra } = tacke[i];
    const a = osaA[i], b = osaB[i];
    const prsten = [];
    for (let k = 0; k < segmenata; k++) {
      const u = (k / segmenata) * Math.PI * 2;
      const ca = Math.cos(u) * ra, cb = Math.sin(u) * rb;
      prsten.push([
        p[0] + a[0] * ca + b[0] * cb,
        p[1] + a[1] * ca + b[1] * cb,
        p[2] + a[2] * ca + b[2] * cb
      ]);
    }
    prstenovi.push(prsten);
  }

  /* Kapice na krajevima — obična tačka u osi, da cev ne bude šuplja. */
  const kapaPocetak = tacke[0].p;
  const kapaKraj = tacke[n - 1].p;

  /* Normale se skupljaju po temenu preko CELE cevi, pa je osvetljenje
     neprekidno i tamo gde se menja region. */
  const zbirN = prstenovi.map(p => p.map(() => [0, 0, 0]));
  const dodajN = (i, k, nv) => {
    const c = zbirN[i][k % segmenata];
    c[0] += nv[0]; c[1] += nv[1]; c[2] += nv[2];
  };

  const trouglovi = [];   // [[i,k],[i,k],[i,k]] preko indeksa prstena
  const trake = [];

  for (let i = 0; i < n - 1; i++) {
    const od = trouglovi.length;
    for (let k = 0; k < segmenata; k++) {
      const k2 = (k + 1) % segmenata;
      /* Redosled temena mora da daje normalu koja gleda NAPOLJE. Obrnut
         redosled okreće cev naopako: prednje strane se odseku, pa se kroz
         telo vidi njegova unutrašnja strana. */
      trouglovi.push([[i, k], [i + 1, k2], [i + 1, k]]);
      trouglovi.push([[i, k], [i, k2], [i + 1, k2]]);
    }
    trake.push({ region: tacke[i].region ?? null, od, do: trouglovi.length });
  }

  /* Normale iz površine trouglova. */
  const teme = ([i, k]) => prstenovi[i][k];
  for (const tr of trouglovi) {
    const [A, B, C] = tr.map(teme);
    const nv = jedinicni(vektorski(minus(B, A), minus(C, A)));
    for (const [i, k] of tr) dodajN(i, k, nv);
  }
  for (const prsten of zbirN) for (let k = 0; k < prsten.length; k++) {
    prsten[k] = jedinicni(prsten[k]);
  }

  /* Nesaželjena geometrija: po tri temena na trougao, da se trake mogu
     razdvojiti po regionima a da normale ostanu iste na spoju. */
  const pozicije = [], normale = [];
  for (const tr of trouglovi) {
    for (const [i, k] of tr) {
      const v = prstenovi[i][k], nv = zbirN[i][k];
      pozicije.push(v[0], v[1], v[2]);
      normale.push(nv[0], nv[1], nv[2]);
    }
  }

  /* Kapice se dodaju kao posebne trake uz region prvog i poslednjeg pojasa. */
  function kapa(iPrsten, vrh, obrni, region) {
    const od = pozicije.length / 9;
    const osn = jedinicni(minus(vrh, prstenovi[iPrsten][0]));
    void osn;
    for (let k = 0; k < segmenata; k++) {
      const k2 = (k + 1) % segmenata;
      const A = vrh, B = prstenovi[iPrsten][obrni ? k2 : k], C = prstenovi[iPrsten][obrni ? k : k2];
      const nv = jedinicni(vektorski(minus(B, A), minus(C, A)));
      for (const v of [A, B, C]) {
        pozicije.push(v[0], v[1], v[2]);
        normale.push(nv[0], nv[1], nv[2]);
      }
    }
    trake.push({ region, od, do: pozicije.length / 9 });
  }

  if (zatvoriPocetak) kapa(0, kapaPocetak, true, tacke[0].region ?? null);
  if (zatvoriKraj) kapa(n - 1, kapaKraj, false, tacke[n - 2]?.region ?? null);

  return {
    pozicije: new Float32Array(pozicije),
    normale: new Float32Array(normale),
    trake
  };
}
