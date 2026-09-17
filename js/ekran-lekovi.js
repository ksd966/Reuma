/**
 * Ekran lekova: šta se uzima danas, odbrojavanje biološke i spisak lekova.
 *
 * Aplikacija samo beleži. Ne predlaže doze, ne savetuje promenu terapije i ne
 * upozorava na uzajamna dejstva.
 */

import {
  NACINI, MESTA, REAKCIJE,
  lekovi, lekoviRasporeda,
  uzimanjaLeka, brojUzimanja, zabeleziUzimanje, ponistiUzimanje,
  zabeleziPrimenu, sledeceMesto, odbrojavanje, postaviBrojUzimanja,
  naReduNa, opisRasporeda, beleziPrimenu, beleziMesto
} from './lekovi.js';
import { napraviKalendar, imeKalendara, brojPodsetnika } from './kalendar.js';
import { posaljiDatoteku } from './izvoz.js';
import { bolPoDanuCiklusa } from './statistika.js';
import { punDatum, imeDana, jeDanas, kljucDana } from './skladiste.js';
import { stepenZa } from './telo/regioni.js';

const broj = (x) => (x == null ? '—' : String(x).replace('.', ','));
const danaRec = (n) => (n === 1 ? 'dan' : n < 5 ? 'dana' : 'dana');

export function napraviEkranLekova({ naOtvaranjeLeka, naJavljanje, naIzmenu }) {
  const el = document.getElementById('lekovi-sadrzaj');
  let kljuc = kljucDana();

  function iscrtaj(noviKljuc) {
    kljuc = noviKljuc ?? kljuc;
    el.replaceChildren();

    if (!lekovi().length) {
      el.appendChild(uputstvo());
      return;
    }
    const delovi = [
      odeljakDanas(),
      odeljakPoPotrebi(),
      odeljakOdbrojavanja(),
      odeljakSvi(),
      odeljakPodsetnika()
    ].filter(Boolean);
    el.append(...delovi);
  }

  function uputstvo() {
    const p = document.createElement('p');
    p.className = 'prazno-uputstvo';
    p.textContent =
      'Nijedan lek još nije dodat. Spisak se pamti, pa se posle unosi sa nekoliko ' +
      'dodira — stalni lekovi se samo potvrđuju, a kod biološke terapije se vidi ' +
      'odbrojavanje do sledeće doze.';
    return p;
  }

  function odeljak(naslov, deca) {
    const s = document.createElement('section');
    s.className = 'lek-odeljak';
    const h = document.createElement('h2');
    h.className = 'naslov-odeljka';
    h.textContent = naslov;
    s.append(h, ...deca);
    return s;
  }

  /* ── odbrojavanje (lekovi u ciklusu) ──────────────────────────────── */
  function odeljakOdbrojavanja() {
    const svi = lekoviRasporeda('ciklus');
    if (!svi.length) return null;
    const deca = [];
    for (const l of svi) {
      deca.push(karticaBioloske(l));
      const g = grafikCiklusa(l);
      if (g) deca.push(g);
    }
    return odeljak('Odbrojavanje', deca);
  }

  function karticaBioloske(l) {
    const o = odbrojavanje(l, kljuc);
    const k = document.createElement('article');
    k.className = 'bioloska';

    const naciniIme = NACINI.find(n => n.id === l.nacin)?.ime ?? '';
    const ciklusIme = opisRasporeda(l);

    if (!o) {
      k.innerHTML = `
        <p class="bioloska__ime">${l.naziv}</p>
        <p class="bioloska__pod">${[l.doza, naciniIme, ciklusIme].filter(Boolean).join(' · ')}</p>
        <p class="izv-prazno" style="margin-top:12px">
          Nijedna primena još nije zabeležena. Odbrojavanje počinje od prve.
        </p>`;
    } else {
      const kasni = o.preostalo < 0;
      if (kasni) k.classList.add('bioloska__kasni');
      const udeo = Math.max(0, Math.min(100, (o.danCiklusa / o.ciklus) * 100));
      const sledece = sledeceMesto(l.id);
      const mestoPoslednje = MESTA.find(m => m.id === o.poslednja.mesto)?.ime ?? '—';

      k.innerHTML = `
        <p class="bioloska__ime">${l.naziv}</p>
        <p class="bioloska__pod">${[l.doza, naciniIme, ciklusIme].filter(Boolean).join(' · ')}</p>
        <p class="bioloska__odbrojavanje">
          <span class="bioloska__broj tabular">${Math.abs(o.preostalo)}</span>
          <span class="bioloska__rec">${
            o.preostalo === 0 ? 'danas je dan primene'
            : kasni ? `${danaRec(Math.abs(o.preostalo))} kašnjenja`
            : `${danaRec(o.preostalo)} do sledeće`}</span>
        </p>
        <span class="bioloska__traka" aria-hidden="true"><i style="width:${udeo}%"></i></span>
        <dl class="bioloska__podaci">
          <div><dt>Poslednja primena</dt><dd>${punDatum(o.poslednja.datum)}</dd></div>
          <div><dt>Sledeća</dt><dd>${punDatum(o.sledeci)}</dd></div>
          <div><dt>Dan ciklusa</dt><dd class="tabular">${o.danCiklusa} od ${o.ciklus}</dd></div>
          <div><dt>Prethodno mesto</dt><dd>${mestoPoslednje}</dd></div>
          <div style="grid-column:1/3"><dt>Sledeće mesto po redu</dt><dd>${sledece.ime}</dd></div>
        </dl>`;
    }

    const dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.className = 'dugme dugme--glavno bioloska__radnje';
    dugme.style.width = '100%';
    dugme.textContent = 'Zabeleži primenu';
    dugme.addEventListener('click', () => otvoriPrimenu(l));
    k.appendChild(dugme);

    const izmeni = document.createElement('button');
    izmeni.type = 'button';
    izmeni.className = 'dugme dugme--tiho';
    izmeni.style.cssText = 'width:100%;margin-top:8px';
    izmeni.textContent = 'Izmeni lek';
    izmeni.addEventListener('click', () => naOtvaranjeLeka(l.id));
    k.appendChild(izmeni);

    return k;
  }

  /**
   * Bol u odnosu na dan ciklusa — prikaz koji lekar traži. Ako bol raste pred
   * sledeću dozu, to se vidi na prvi pogled.
   */
  function grafikCiklusa(l) {
    const r = bolPoDanuCiklusa(l.id, l.raspored?.ciklusDana, kljuc);
    if (!r) return null;

    const okvir = document.createElement('section');
    okvir.className = 'izv-blok';

    if (!r.dovoljno) {
      okvir.innerHTML = `<p class="izv-naslov">Bol u odnosu na dan ciklusa</p>
        <p class="izv-prazno">Još nema dovoljno zabeleženih dana unutar ciklusa.
        Prikaz se pojavljuje kad se skupi bar dva dana sa unosom.</p>`;
      return okvir;
    }

    const Š = 320, V = 104, DNO = 78, VRH = 8;
    const n = r.ciklusDana;
    const korak = Š / n;
    const sirina = Math.max(3, Math.min(korak - 2, 22));
    const y = (v) => DNO - (v / 10) * (DNO - VRH);
    const radijus = Math.min(4, sirina / 2);

    const marke = r.tacke.map((t, i) => {
      const x = i * korak + (korak - sirina) / 2;
      if (t.prosek == null) {
        return `<rect x="${x}" y="${DNO - 2}" width="${sirina}" height="2" rx="1"
                      fill="var(--line-strong)" opacity=".55"/>`;
      }
      const visina = Math.max(radijus * 2, DNO - y(t.prosek));
      return `<rect class="stub" data-i="${i}" x="${x}" y="${DNO - visina}"
                    width="${sirina}" height="${visina}" rx="${radijus}"
                    fill="${stepenZa(Math.max(1, Math.round(t.prosek))).boja}"/>`;
    }).join('');

    const mete = r.tacke.map((t, i) =>
      `<rect class="meta" data-i="${i}" x="${i * korak}" y="0" width="${korak}"
             height="${DNO}" fill="transparent"/>`).join('');

    const svakiN = Math.ceil(n / 8);
    const oznake = r.tacke.map((t, i) => (i % svakiN === 0 || i === n - 1)
      ? `<text class="oznaka" x="${i * korak + korak / 2}" y="${V - 4}"
               text-anchor="middle">${i}</text>` : '').join('');

    let rec;
    if (r.razlikaKrajeva == null) {
      rec = 'Nema dovoljno podataka za poređenje početka i kraja ciklusa.';
    } else if (r.razlikaKrajeva > 0.5) {
      rec = `Pri kraju ciklusa bol je u proseku za ${broj(r.razlikaKrajeva)} viši ` +
            `nego na početku (${broj(r.pocetakCiklusa)} → ${broj(r.krajCiklusa)}).`;
    } else if (r.razlikaKrajeva < -0.5) {
      rec = `Pri kraju ciklusa bol je u proseku za ${broj(Math.abs(r.razlikaKrajeva))} niži ` +
            `nego na početku (${broj(r.pocetakCiklusa)} → ${broj(r.krajCiklusa)}).`;
    } else {
      rec = `Bol je kroz ciklus ujednačen (${broj(r.pocetakCiklusa)} → ${broj(r.krajCiklusa)}).`;
    }

    okvir.innerHTML = `
      <p class="izv-naslov">Bol u odnosu na dan ciklusa</p>
      <svg class="ciklus-grafik" viewBox="0 0 ${Š} ${V}" role="img"
           aria-label="Prosečan bol po danu ciklusa, ${r.ciklusa} ${r.ciklusa === 1 ? 'ciklus' : 'ciklusa'}">
        <line class="osa" x1="0" y1="${DNO}" x2="${Š}" y2="${DNO}"/>
        ${marke}${oznake}${mete}
      </svg>
      <p class="izv-detalj" id="ciklus-detalj">Dan ciklusa — 0 je dan primene.</p>
      <p class="izv-poredjenje">${rec} Sabrano iz ${r.ciklusa}
        ${r.ciklusa === 1 ? 'ciklusa' : 'ciklusa'}.</p>`;

    const detalj = okvir.querySelector('#ciklus-detalj');
    for (const meta of okvir.querySelectorAll('rect.meta')) {
      meta.addEventListener('click', () => {
        const t = r.tacke[Number(meta.dataset.i)];
        detalj.textContent = t.prosek == null
          ? `Dan ${t.dan} — nema zabeleženih dana`
          : `Dan ${t.dan} — prosek ${broj(t.prosek)} od 10 (${t.brojDana} ${danaRec(t.brojDana)})`;
      });
    }
    return okvir;
  }

  /* ── šta je danas na redu ─────────────────────────────────────────── */

  /**
   * Jedan spisak za sve rasporede: dnevni, nedeljni i ciklus. Tableta se
   * potvrđuje kvadratićem, injekcija i infuzija otvaraju list sa mestom i
   * reakcijom — jer nose više od same potvrde.
   */
  function odeljakDanas() {
    const red = naReduNa(kljuc);
    if (!red.length) return null;

    const deca = red.map(({ lek: l, redni: redniBroj, vreme, uzeto, kasni }) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'doza';
      d.dataset.uzeto = uzeto ? 'da' : 'ne';
      if (kasni && !uzeto) d.dataset.kasni = 'da';
      d.setAttribute('aria-pressed', String(uzeto));

      const pod = [l.doza, vreme, kasni && !uzeto ? 'kasni' : null].filter(Boolean).join(' · ');
      d.innerHTML = `
        <span class="doza__kvadrat" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--na-jacini)"
               stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12.5 L9.5 18 L20 6.5"/>
          </svg>
        </span>
        <span class="doza__tekst">
          <span class="doza__ime">${l.naziv}</span>
          <span class="doza__pod">${pod}</span>
        </span>`;

      d.addEventListener('click', () => {
        if (beleziPrimenu(l)) {
          /* Injekcija nosi mesto i reakciju — to se ne staje u kvadratić. */
          if (!uzeto) otvoriPrimenu(l);
          return;
        }
        postaviBrojUzimanja(l.id, kljuc, uzeto ? redniBroj : redniBroj + 1);
        iscrtaj();
        naIzmenu?.();
      });
      return d;
    });

    return odeljak(jeDanas(kljuc) ? 'Danas na redu' : `Na redu — ${imeDana(kljuc)}`, deca);
  }

  /* ── po potrebi ───────────────────────────────────────────────────── */
  function odeljakPoPotrebi() {
    const svi = lekoviRasporeda('poPotrebi');
    if (!svi.length) return null;

    const deca = svi.map(l => {
      const danas = uzimanjaLeka(l.id, kljuc).length;
      const nedelja = brojUzimanja(l.id, kljuc, 7);
      const red = document.createElement('div');
      red.className = 'po-potrebi';
      red.innerHTML = `
        <p class="po-potrebi__ime">${l.naziv}</p>
        <p class="po-potrebi__pod">${l.doza ?? ''}</p>
        <p class="po-potrebi__broj tabular">danas ${danas}<br>nedelja ${nedelja}</p>`;

      const dugmad = document.createElement('div');
      dugmad.className = 'po-potrebi__dugmad';

      const manje = document.createElement('button');
      manje.type = 'button';
      manje.textContent = '−';
      manje.setAttribute('aria-label', `Poništi jedno uzimanje — ${l.naziv}`);
      manje.disabled = danas === 0;
      manje.addEventListener('click', () => { ponistiUzimanje(l.id, kljuc); iscrtaj(); naIzmenu?.(); });

      const vise = document.createElement('button');
      vise.type = 'button';
      vise.textContent = '+';
      vise.setAttribute('aria-label', `Zabeleži uzimanje — ${l.naziv}`);
      vise.addEventListener('click', () => { zabeleziUzimanje(l.id, kljuc); iscrtaj(); naIzmenu?.(); });

      dugmad.append(manje, vise);
      red.appendChild(dugmad);
      return red;
    });

    const naslov = odeljak('Po potrebi', deca);
    const nota = document.createElement('p');
    nota.className = 'uputstvo-levo';
    nota.style.marginTop = '2px';
    nota.textContent = 'Koliko je puta uzet lek po potrebi sam po sebi govori kako je nedelja prošla.';
    naslov.appendChild(nota);
    return naslov;
  }

  /* ── svi lekovi ───────────────────────────────────────────────────── */
  /* ── podsetnici u kalendar ────────────────────────────────────────── */

  /**
   * Prave notifikacije na iPhone-u traže server koji ih šalje, a dogovor je da
   * ništa ne napušta telefon. Kalendar radi isti posao bez servera: datoteka
   * se napravi ovde, telefon je uveze i dalje podseća sam.
   */
  function odeljakPodsetnika() {
    const koliko = brojPodsetnika();
    const okvir = document.createElement('div');
    okvir.className = 'podsetnici';

    const opis = document.createElement('p');
    opis.className = 'podsetnici__opis';
    opis.textContent = koliko
      ? 'Artron napravi datoteku sa rasporedom koji ste ovde uneli. Otvorite je ' +
        'i telefon je doda u Kalendar, pa dalje podseća sam — i kad Artron nije ' +
        'otvoren. Ništa ne ide na internet.'
      : 'Podsetnici se prave od rasporeda koji unesete: stalnim lekovima zadajte ' +
        'vreme uzimanja, a kod biološke zabeležite bar jednu primenu da bi se ' +
        'znalo kad je sledeća.';
    okvir.appendChild(opis);

    const dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.className = 'dugme';
    dugme.textContent = 'Napravi podsetnike za Kalendar';
    dugme.disabled = !koliko;
    okvir.appendChild(dugme);

    const ishod = document.createElement('p');
    ishod.className = 'podsetnici__ishod';
    ishod.setAttribute('role', 'status');
    okvir.appendChild(ishod);

    dugme.addEventListener('click', async () => {
      const k = napraviKalendar(kljucDana());
      const gotovo = await posaljiDatoteku(k.tekst, imeKalendara(), 'text/calendar;charset=utf-8');
      if (!gotovo) return;                       // korisnik zatvorio list za deljenje
      const preskoceno = k.preskoceno.length
        ? ` Bez podsetnika: ${k.preskoceno.join('; ')}.` : '';
      ishod.textContent =
        `Napravljeno — ${k.dogadjaja} ${k.dogadjaja === 1 ? 'podsetnik' : 'podsetnika'}` +
        ` u datoteci ${gotovo}.${preskoceno}`;
    });

    return odeljak('Podsetnici', [okvir]);
  }

  function odeljakSvi() {
    const deca = lekovi().map(l => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lek-red';
      const nacinIme = NACINI.find(n => n.id === l.nacin)?.ime ?? '';
      b.innerHTML = `
        <span class="lek-red__ime">${l.naziv}</span>
        <span class="lek-red__pod">${[l.doza, opisRasporeda(l)].filter(Boolean).join(' · ')}</span>
        <span class="lek-red__desno">${nacinIme}</span>`;
      b.addEventListener('click', () => naOtvaranjeLeka(l.id));
      return b;
    });
    return odeljak('Svi lekovi', deca);
  }

  /* ── list za primenu biološke ─────────────────────────────────────── */
  const listPrimena = document.getElementById('list-primena');
  const zastor = document.getElementById('zastor');
  const elPrimenaIme = document.getElementById('primena-ime');
  const elPrimenaPod = document.getElementById('primena-pod');
  const elDatum = document.getElementById('primena-datum');
  const elPredlog = document.getElementById('primena-predlog');
  const elMesto = document.getElementById('primena-mesto');
  const elMestoPolje = document.getElementById('primena-mesto-polje');
  const elReakcija = document.getElementById('primena-reakcija');
  const elBeleska = document.getElementById('primena-beleska');

  let primenaLek = null, izabranoMesto = null, izabranaReakcija = null;

  function napuniIzbore(el, opcije, izabrano, naIzbor) {
    el.replaceChildren(...opcije.map(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.ime;
      b.dataset.vrednost = o.id;
      b.setAttribute('aria-pressed', String(o.id === izabrano));
      b.addEventListener('click', () => {
        naIzbor(o.id);
        for (const d of el.children) d.setAttribute('aria-pressed', String(d.dataset.vrednost === o.id));
      });
      return b;
    }));
  }

  function otvoriPrimenu(l) {
    primenaLek = l;
    const predlog = sledeceMesto(l.id);
    /* Infuzija ide u venu — rotacija mesta tu nema smisla, pa se i ne pita. */
    const traziMesto = beleziMesto(l);
    izabranoMesto = traziMesto ? predlog.id : undefined;
    izabranaReakcija = 'nista';

    elPrimenaIme.textContent = l.naziv;
    elPrimenaPod.textContent = [l.doza, NACINI.find(n => n.id === l.nacin)?.ime].filter(Boolean).join(' · ');
    elDatum.value = kljuc;
    elDatum.max = kljucDana();
    elPredlog.textContent = `Po redu rotacije sledi: ${predlog.ime}`;
    elBeleska.value = '';

    elMestoPolje.hidden = !traziMesto;
    napuniIzbore(elMesto, MESTA, izabranoMesto, (v) => { izabranoMesto = v; });
    napuniIzbore(elReakcija, REAKCIJE, izabranaReakcija, (v) => { izabranaReakcija = v; });

    listPrimena.hidden = false;
    zastor.hidden = false;
    requestAnimationFrame(() => {
      listPrimena.dataset.otvoren = 'da';
      zastor.dataset.otvoren = 'da';
    });
  }

  function zatvoriPrimenu() {
    primenaLek = null;
    delete listPrimena.dataset.otvoren;
    delete zastor.dataset.otvoren;
    setTimeout(() => { listPrimena.hidden = true; zastor.hidden = true; }, 260);
  }

  document.getElementById('primena-odustani').addEventListener('click', zatvoriPrimenu);
  document.getElementById('primena-potvrdi').addEventListener('click', () => {
    if (!primenaLek) return;
    zabeleziPrimenu({
      lekId: primenaLek.id,
      datum: elDatum.value || kljucDana(),
      mesto: izabranoMesto,
      reakcija: izabranaReakcija,
      beleska: elBeleska.value.trim() || undefined
    });
    const ime = primenaLek.naziv;
    zatvoriPrimenu();
    iscrtaj();
    naJavljanje?.(`Primena zabeležena — ${ime}`);
  });

  return { iscrtaj, otvoriPrimenu, jeOtvorenList: () => !!primenaLek, zatvoriPrimenu };
}
