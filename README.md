# Artron

Lični dnevnik reumatskih bolova. Radi u pregledaču, instalira se na početni
ekran telefona, i **svi podaci ostaju na telefonu** — nema servera i ništa ne
napušta uređaj. Dan se beleži kroz tri odvojena unosa — jutro, podne i veče —
jer se bol menja tokom dana, a to je ono što lekar pita.

Artron beleži i prikazuje. Ne postavlja dijagnozu, ne savetuje terapiju i nije
medicinski uređaj.

## Šta je do sada napravljeno

- **Mapa tela** — telo u tri dimenzije, okreće se prstom ili dugmadima za četiri
  pogleda (napred, nazad, levi i desni bok). 36 regiona, svaki zaseban i
  imenovan; dodir otvara list odozdo sa jačinom 0–10 i vrstom bola.
- **Spisak regiona** — isti unos bez okretanja modela; to je ujedno i put kojim
  čitač ekrana dolazi do svih regiona.
- **Tri unosa dnevno** — jutro, podne i veče, svaki sa svojom ukupnom jačinom
  bola i svojom mapom tela. Jutro nosi jutarnju ukočenost i san, podne
  opterećenje i umor, veče umor i kakav je dan bio u celini. Unos može i
  naknadno, za raniji deo dana ili za prethodne dane.
- **Tok dana** — sva tri unosa jedan pored drugog i grafik koji pokazuje da li
  je gore ujutru ili uveče.
- **Dva režima** — upalni reumatizam i fibromijalgija, može i oba istovremeno.
  Režim menja samo šta se pita pri unosu, ne izgled aplikacije.
- Ljuska po dizajn-sistemu, manifest, ikonice, splash i service worker.

### Režimi

**Upalni reumatizam** dodaje uz svaki zglob na mapi tela oteklinu, toplinu i
crvenilo. Otečen zglob se beleži zasebno od bolnog, jer zglob ume da bude
otečen a da ne boli, i obrnuto. Na mapi se razlikuje **oblikom, ne bojom** —
kvadrat umesto kruga — pa se razaznaje i u crno-belom i kod daltonizma.

**Fibromijalgija** dodaje umor zasebno (jer ume da bude teži od samog bola),
neosvežavajući san, maglu u glavi, osetljivost na dodir, buku i svetlo, te
glavobolju i probleme sa varenjem.

Kad je bar jedan režim uključen, pregled dana pokazuje **lični zbir za
praćenje**: broj bolnih područja, broj otečenih zglobova, prosek umora i magle.
To su brojevi koje je korisnik sam uneo, sabrani da bi mogao da uporedi jedan
dan sa drugim. Nije dijagnostički skor i ne primenjuje nikakve zvanične
kriterijume — tumačenje je na lekaru.

## Šta tek dolazi

Lekovi i biološka terapija sa odbrojavanjem, dnevnik po danima, vremenski
okidači preko Open-Meteo, i izvoz u CSV i JSON.

## Kako radi model tela

Model se **pravi u kodu**, ne učitava se ni jedan spoljni fajl — gotov ljudski
model sa 36 imenovanih delova ne postoji besplatno i sa čistom licencom, a i
najmanji bi bio megabajt naviše.

Udovi su **neprekidne cevi promenljive debljine** (`js/telo/cev.js`): kroz niz
tačaka se provuče jedna površina koja se zadeblja na ramenu, bicepsu, kolenu i
listu. Regioni su trake duž te iste površine, a normale se računaju pre
deljenja — zato se na prelazu sa butine na koleno ne vidi nikakav šav. Trup i
glava su rotaciona tela sa profilnom krivom, spljoštena po dubini jer je čovek
širi nego deblji. Srazmere prate standardne telesne mere za visinu 1,75 m
(rame na 0,818 visine, lakat 0,630, ručni zglob i prepone 0,485, koleno 0,285).
Ukupno oko 9.500 trouglova, model se sklopi za četrdesetak milisekundi.

### Tačke regiona

Tačka koja se gađa prstom **ne izvodi se iz geometrije** — postavljena je
namerno na površinu tela, uz normalu. Sredina geometrije bi kod vrata, ramena i
kukova pala unutar tela, pa bi tačka uvek ispadala zaklonjena. Većina regiona
ima tri tačke (napred-spolja, sa strane, pozadi-spolja), pa svaki region ima
tačku okrenutu ka gledaocu iz sva četiri pogleda; prikazuje se ona najokrenutija
koju ništa ne zaklanja. Kičma ima samo zadnju — spreda je trup stvarno zaklanja.

Prst pogađa u tri koraka: tačka na 22 px, pa zrak kroz telo, pa najbliža tačka
u krugu od 44 px. Promašaj za koji piksel tako ne prođe bez ičega.

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
css/ekrani.css          pregled dana i unos
js/app.js               pokretanje i prelaz između ekrana
js/skladiste.js         localStorage, datumi, izvedene mere
js/polja.js             šta se pita uz koji deo dana, po režimu
js/podesavanja.js       izbor režima praćenja
js/dan.js               tri polja za dan i tok dana
js/unos-dana.js         unos za jedan deo dana
js/unos.js              list odozdo za unos bola u jednom regionu
js/telo/regioni.js      36 regiona sa imenima; boje jačine
js/telo/cev.js          cev promenljive debljine, osnova za udove
js/telo/telo-model.js   geometrija tela i tačke regiona
js/telo/mapa-tela.js    crtanje, okretanje, biranje prstom, tačke
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
