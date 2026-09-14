/**
 * Izveštaj za period — nedelja, mesec, šest meseci, godina.
 *
 * Sve što se ovde vidi izračunato je iz unetog. Dani bez unosa se ne
 * popunjavaju ničim i ne ulaze u prosek; kad podataka nema, stoji da ih nema,
 * a ne nula.
 *
 * Na grafiku visina stubića nosi jačinu, a boja je samo pojačava — po pravilu
 * iz dizajn-sistema da značenje nikad ne počiva samo na boji.
 */

import { PERIODI, izvestaj } from './statistika.js';
import { imeDana, punDatum, rezim, DELOVI } from './skladiste.js';
import { imeRegiona, stepenZa } from './telo/regioni.js';

const brojSrpski = (x) => (x == null ? '—' : String(x).replace('.', ','));

export function napraviEkranIzvestaja() {
  const elPeriodi = document.getElementById('periodi');
  const elSadrzaj = document.getElementById('izvestaj-sadrzaj');
  let izabraniPeriod = PERIODI[1];      // mesec je podrazumevan
  let kraj = null;

  for (const p of PERIODI) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.ime;
    b.dataset.period = p.id;
    b.addEventListener('click', () => { izabraniPeriod = p; iscrtaj(kraj); });
    elPeriodi.appendChild(b);
  }

  function iscrtaj(noviKraj) {
    kraj = noviKraj;
    for (const b of elPeriodi.children) {
      b.setAttribute('aria-pressed', String(b.dataset.period === izabraniPeriod.id));
    }
    const r = izvestaj(kraj, izabraniPeriod, rezim());
    elSadrzaj.replaceChildren();

    if (!r.danaSaUnosom) {
      elSadrzaj.appendChild(blok('Izveštaj', `
        <p class="izv-prazno">
          Za ovaj period nema nijednog unosa. Zabeležite bar jedan dan pa se
          ovde pojavljuju prosek, trend i najčešće pogođeni regioni.
        </p>`));
      return;
    }

    elSadrzaj.append(
      glavno(r), plocice(r), trend(r), tokDana(r), najcesci(r), ograda()
    );
  }

  function blok(naslov, html) {
    const el = document.createElement('section');
    el.className = 'izv-blok';
    el.innerHTML = `<p class="izv-naslov">${naslov}</p>${html}`;
    return el;
  }

  /* ── prosek za period, uz poređenje sa prethodnim ─────────────────── */
  function glavno(r) {
    const boja = r.prosekBola > 0 ? stepenZa(Math.round(r.prosekBola)).boja : 'var(--muted)';
    let poredjenje;
    if (r.danaPrethodni < 3) {
      poredjenje = `Nema dovoljno ranijih unosa za poređenje sa prethodnim
                    periodom — treba bar tri zabeležena dana.`;
    } else {
      const razlika = Math.round((r.prosekBola - r.prosekPrethodni) * 10) / 10;
      const smer = razlika === 0 ? 'isto kao' : razlika < 0 ? 'manje nego' : 'više nego';
      const koliko = razlika === 0 ? '' : `${brojSrpski(Math.abs(razlika))} `;
      poredjenje = `${koliko}${smer} prethodnih ${r.danaUkupno} dana
                    (prosek ${brojSrpski(r.prosekPrethodni)}, ${r.danaPrethodni} zabeleženih dana).`;
    }
    return blok('Prosečan bol', `
      <p class="izv-glavno">
        <span class="izv-glavno__broj tabular" style="color:${boja}">${brojSrpski(r.prosekBola)}</span>
        <span class="izv-glavno__od">od 10</span>
      </p>
      <p class="izv-poredjenje">${poredjenje}</p>`);
  }

  /* ── pločice ──────────────────────────────────────────────────────── */
  function plocice(r) {
    const stavke = [
      ['Dana sa unosom', `${r.danaSaUnosom}`, `od ${r.danaUkupno} u periodu`],
      ['Dana bez bolova', `${r.danaBezBolova}`,
        r.danaSaUnosom ? `${Math.round((r.danaBezBolova / r.danaSaUnosom) * 100)} % zabeleženih` : ''],
      r.najjaciDan
        ? ['Najjači bol', `${r.najjaciDan.najjaciBol}`, punDatum(r.najjaciDan.kljuc)]
        : ['Najjači bol', '—', 'nije zabeležen'],
      ['Unosa ukupno', `${r.brojUnosa}`, `${DELOVI.length} moguća po danu`]
    ];
    if (r.prosekUmora != null) stavke.push(['Prosek umora', brojSrpski(r.prosekUmora), 'od 10']);
    if (r.prosekMagle != null) stavke.push(['Prosek magle', brojSrpski(r.prosekMagle), 'od 10']);
    if (r.oteklihUkupno != null) stavke.push(['Otečenih zglobova', `${r.oteklihUkupno}`, 'različitih u periodu']);
    if (r.prosekUkocenosti != null) stavke.push(['Jutarnja ukočenost', `${r.prosekUkocenosti}`, 'minuta u proseku']);

    const el = document.createElement('div');
    el.className = 'plocice';
    el.innerHTML = stavke.map(([ime, broj, dod]) => `
      <article class="plocica">
        <p class="plocica__ime">${ime}</p>
        <p class="plocica__broj tabular">${broj}</p>
        <p class="plocica__dodatak">${dod}</p>
      </article>`).join('');
    return el;
  }

  /* ── trend ────────────────────────────────────────────────────────── */
  function trend(r) {
    const S = r.stubici;
    const Š = 320, V = 108, DNO = 84, VRH = 8;
    const korak = Š / S.length;
    const sirina = Math.max(3, Math.min(korak - 2, 26));
    const y = (v) => DNO - (v / 10) * (DNO - VRH);
    const radijus = Math.min(4, sirina / 2);

    const marke = S.map((s, i) => {
      const x = i * korak + (korak - sirina) / 2;
      if (s.vrednost == null) {
        /* Dan bez unosa nije nula — ostaje samo tanka crtica na osnovi. */
        return `<rect x="${x}" y="${DNO - 2}" width="${sirina}" height="2" rx="1"
                      fill="var(--line-strong)" opacity=".55"/>`;
      }
      const visina = Math.max(radijus * 2, DNO - y(s.vrednost));
      return `<rect class="stub" data-i="${i}" data-izabran="da"
                    x="${x}" y="${DNO - visina}" width="${sirina}" height="${visina}"
                    rx="${radijus}" fill="${stepenZa(Math.max(1, Math.round(s.vrednost))).boja}"/>`;
    }).join('');

    /* Meta za prst je cela kolona, šira od samog stubića. */
    const mete = S.map((s, i) => `
      <rect class="meta" data-i="${i}" x="${i * korak}" y="0" width="${korak}" height="${DNO}"
            fill="transparent"/>`).join('');

    const svakiN = Math.ceil(S.length / 8);
    const oznake = S.map((s, i) => (i % svakiN === 0 || i === S.length - 1)
      ? `<text class="oznaka" x="${i * korak + korak / 2}" y="${V - 4}" text-anchor="middle">${
          izabraniPeriod.id === 'nedelja' ? s.slovo : s.oznaka}</text>`
      : '').join('');

    const el = blok(`Trend — ${izabraniPeriod.ime.toLowerCase()}`, `
      <svg class="trend" viewBox="0 0 ${Š} ${V}" role="img"
           aria-label="Trend prosečnog bola, ${S.filter(s => s.vrednost != null).length} zabeleženih tačaka">
        <line class="osa" x1="0" y1="${DNO}" x2="${Š}" y2="${DNO}"/>
        ${marke}${oznake}${mete}
      </svg>
      <p class="izv-detalj" id="trend-detalj">Dodirni stubić da vidiš vrednost.</p>`);

    const detalj = el.querySelector('#trend-detalj');
    const stubovi = [...el.querySelectorAll('rect.stub')];
    for (const meta of el.querySelectorAll('rect.meta')) {
      meta.addEventListener('click', () => {
        const i = Number(meta.dataset.i);
        const s = S[i];
        for (const st of stubovi) {
          st.dataset.izabran = (Number(st.dataset.i) === i || false) ? 'da' : 'ne';
        }
        detalj.textContent = s.vrednost == null
          ? `${s.naslov} — nema unosa`
          : `${s.naslov} — prosek ${brojSrpski(s.vrednost)} od 10` +
            (izabraniPeriod.grupa === 'dan' ? '' : ` (${s.danaSaUnosom} zabeleženih dana)`);
      });
    }
    return el;
  }

  /* ── tok dana u proseku ───────────────────────────────────────────── */
  function tokDana(r) {
    const redovi = DELOVI.map(d => {
      const p = r.poDelu[d.id];
      const boja = p.prosek > 0 ? stepenZa(Math.round(p.prosek)).boja : 'var(--dim)';
      return `<div>
        <dt>${d.ime}</dt>
        <dd class="tabular" style="color:${p.prosek == null ? 'var(--dim)' : boja}">${brojSrpski(p.prosek)}</dd>
        <span class="traka"><i style="width:${((p.prosek ?? 0) / 10) * 100}%;background:${boja}"></i></span>
      </div>`;
    }).join('');
    return blok('Tok dana u proseku', `<dl class="tok-proseka">${redovi}</dl>`);
  }

  /* ── najčešće pogođeni regioni ────────────────────────────────────── */
  function najcesci(r) {
    if (!r.najcesci.length) {
      return blok('Najčešće pogođeni regioni',
        '<p class="izv-prazno">U ovom periodu nije označen nijedan region.</p>');
    }
    const vrh = r.najcesci.slice(0, 8);
    const najvise = vrh[0].broj;
    const redovi = vrh.map(x => {
      const udeo = (x.broj / najvise) * 100;
      const boja = stepenZa(Math.min(10, Math.round((x.broj / r.danaSaUnosom) * 10))).boja;
      return `<div class="regioni-red">
        <span class="regioni-red__ime">${imeRegiona(x.id)}</span>
        <span class="regioni-red__broj">${x.broj} ${x.broj === 1 ? 'dan' : 'dana'}${
          x.oteklo ? ` · otečen ${x.oteklo}` : ''}</span>
        <span class="regioni-red__traka"><i style="width:${udeo}%;background:${boja}"></i></span>
      </div>`;
    }).join('');
    return blok(`Najčešće pogođeni regioni${r.najcesci.length > 8 ? ' — prvih 8' : ''}`, redovi);
  }

  function ograda() {
    const el = document.createElement('p');
    el.className = 'podnozje';
    el.textContent =
      'Ovo je lični zbir za praćenje — vaši brojevi, sabrani da biste mogli da ' +
      'uporedite jedan period sa drugim i pokažete ih lekaru. Nije dijagnostički ' +
      'skor i ne primenjuje nikakve zvanične kriterijume.';
    return el;
  }

  return { iscrtaj, naslov: () => `Izveštaj · ${imeDana(kraj) === 'danas' ? 'do danas' : `do ${punDatum(kraj)}`}` };
}
