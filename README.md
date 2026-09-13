# Artron

Lični dnevnik reumatskih bolova. Radi u pregledaču, instalira se na početni
ekran telefona, i **svi podaci ostaju na telefonu** — nema servera i ništa ne
napušta uređaj.

Artron beleži i prikazuje. Ne postavlja dijagnozu, ne savetuje terapiju i nije
medicinski uređaj.

## Šta je do sada napravljeno

- **Mapa tela** — telo u tri dimenzije, okreće se prstom ili dugmadima za četiri
  pogleda (napred, nazad, levi i desni bok). 36 regiona, svaki zaseban i
  imenovan; dodir otvara list odozdo sa jačinom 0–10 i vrstom bola.
- **Spisak regiona** — isti unos bez okretanja modela; to je ujedno i put kojim
  čitač ekrana dolazi do svih regiona.
- Ljuska po dizajn-sistemu, manifest, ikonice, splash i service worker.

## Šta tek dolazi

Tri dnevna unosa (jutro, podne, veče), režimi za upalni reumatizam i
fibromijalgiju, lekovi i biološka terapija sa odbrojavanjem, dnevnik, vremenski
okidači preko Open-Meteo, i izvoz u CSV i JSON.

## Kako radi model tela

Model se **pravi u kodu**, ne učitava se ni jedan spoljni fajl — gotov ljudski
model sa 36 imenovanih delova ne postoji besplatno i sa čistom licencom, a i
najmanji bi bio megabajt naviše. Trup je rotaciono telo sa profilnom krivom,
udovi su sužene kapsule, a zglobovi su ispupčene kugle — pa se meta za prst i
anatomija poklapaju. Srazmere su postavljene po standardnim telesnim merama za
visinu od 1,75 m i menjaju se na jednom mestu, u tabeli `T` u
`js/telo/telo-model.js`.

## Pokretanje

Statična aplikacija, bez build koraka:

```
npx http-server -p 8080 .
```

Za instalaciju na telefon potreban je HTTPS. Na GitHub Pages: *Settings → Pages
→ Deploy from a branch*. Sve putanje u kodu su relativne, pa radi i iz
podfoldera.

**Instalacija na iPhone:** otvoriti adresu u Safariju → *Podeli* → *Add to Home
Screen*. Prvo otvaranje ostaviti desetak sekundi na mreži, da se keširaju fajlovi.

## Struktura

```
index.html              jedna strana, ekrani se smenjuju
css/osnova.css          tokeni, ponašanje kao aplikacija, bezbedne zone
css/komponente.css      kartica, list odozdo, klizač, spisak, legenda
js/app.js               pokretanje i povezivanje delova
js/unos.js              list odozdo za unos bola
js/telo/regioni.js      36 regiona sa imenima; boje jačine
js/telo/telo-model.js   geometrija tela
js/telo/mapa-tela.js    crtanje, okretanje, biranje prstom, oznake
js/vendor/three.js      three.js r186, MIT, svedeno na korišćene delove
sw.js                   rad bez mreže
```

## Zavisnosti

Jedna: [three.js](https://threejs.org) r186, pod MIT licencom (`js/vendor/three-LICENSE.txt`).
Svedena je na delove koje Artron stvarno koristi — 543 KB fajla, oko 133 KB
preko mreže. Nijedan font se ne skida sa mreže; koristi se sistemski, na
iPhone-u SF Pro.

Izgled i ponašanje prate `DIZAJN-SISTEM.md` iz
[ksd966/vremenska-prognoza](https://github.com/ksd966/vremenska-prognoza).
