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
  čitač ekrana dolazi do svih regiona. Sklopljen je dok ne zatreba, da ne gura
  ostatak unosa daleko nadole.
- **Kratak unos** — kod hroničnog bola ista mesta bole iz dana u dan, pa jedan
  unos staje u tri dodira: „Kao juče" prepiše poslednji unos za isti deo dana,
  jačina se popravi ako treba, pa „Sačuvaj". Kad se unosi region po region,
  dodir na broj u listu **čuva i zatvara** — zato su vrsta bola i stanje zgloba
  iznad brojeva, a ne ispod. Ukupna jačina se sama izvodi iz najjačeg
  označenog regiona dok je korisnik ne dodirne.
- **Tri unosa dnevno** — jutro, podne i veče, svaki sa svojom ukupnom jačinom
  bola i svojom mapom tela. Jutro nosi jutarnju ukočenost i san, podne
  opterećenje i umor, veče umor i kakav je dan bio u celini. Unos može i
  naknadno, za raniji deo dana ili za prethodne dane.
- **Tok dana** — sva tri unosa jedan pored drugog i grafik koji pokazuje da li
  je gore ujutru ili uveče.
- **Dva režima** — upalni reumatizam i fibromijalgija, može i oba istovremeno.
  Režim menja samo šta se pita pri unosu, ne izgled aplikacije.
- **Ništa me ne boli** — jedan dodir beleži dan bez bolova. Popunjava samo one
  delove dana koji su već stigli (o veču se u devet ujutru ne može ništa reći)
  i ne dira ono što je već uneto; uz javljanje ide i „Poništi". Dan bez bolova
  je podatak koliko i bolan dan — bez njega se u izveštaju ne vidi razlika
  između „bilo je dobro" i „nisam stigao da unesem".
- **Izveštaji** — nedelja, mesec, šest meseci i godina: prosečan bol uz
  poređenje sa prethodnim periodom, dana sa unosom, dana bez bolova, najjači
  dan, trend, tok dana u proseku i najčešće pogođeni regioni.
- **Lekovi** — tri vrste, jer se različito prate: stalni sa potvrdom da su
  uzeti, po potrebi sa brojačem dnevno i nedeljno, i biološka terapija sa
  odbrojavanjem, rotacijom mesta primene i grafikom bola po danu ciklusa.
- **Dnevnik** — svi dani u jednom spisku, najnoviji gore, sa sva tri unosa u
  jednom redu i sažetkom: gde je bolelo, šta je još zabeleženo, koji lekovi.
  Dodir na dan otvara taj dan za izmenu.
- **Izvoz za lekara** — dnevnik i lekovi u CSV, tabela koja se otvara u Excelu.
- **Trajno čuvanje i kopija** — podaci idu u IndexedDB, sa `localStorage` kao
  ogledalom, i mogu se sačuvati u datoteku i vratiti iz nje.
- Ljuska po dizajn-sistemu, manifest, ikonice, splash i service worker.

### Kako se podaci čuvaju

`localStorage` na iPhone-u **nije trajan** — Safari briše podatke sajta posle
sedam dana nekorišćenja. Za dnevnik koji se vodi godinama to je neprihvatljivo,
pa podaci stoje na tri mesta:

1. **IndexedDB** — glavno mesto; veći prostor i prvi na redu za zadržavanje kad
   sistem čisti. Aplikacija instalirana na početni ekran je uz to izuzeta iz
   sedmodnevnog brisanja.
2. **`localStorage`** — ogledalo, da se stanje pročita odmah pri pokretanju i da
   postoji rezerva ako IndexedDB zakaže. Pri pokretanju se čitaju oba mesta i
   uzima novije, pa prelazak sa starog načina čuvanja i oporavak posle brisanja
   jednog od njih rade sami od sebe.
3. **Datoteka koju korisnik sam sačuva** — jedino što preživi brisanje
   aplikacije i zamenu telefona. Podešavanja pokazuju kad je poslednja kopija
   napravljena, a pregled dana podseća kad je prošlo više od mesec dana.

Uz to se traži dozvola za trajno skladište (`navigator.storage.persist`), čime
podaci prestaju da budu kandidat za automatsko brisanje kad ponestane prostora.
Podešavanja pošteno prikazuju da li je dozvola data.

Vraćanje iz kopije **spaja** dane umesto da ih zameni — vraćanje starije kopije
ne sme da obriše ono što je u međuvremenu uneto.

### Lekovi i biološka terapija

Spisak lekova se pamti, pa se posle unosi sa nekoliko dodira — stalni se samo
potvrde, a lek po potrebi ide na jedan dodir plusa. **Koliko je puta uzet lek
po potrebi sam po sebi govori kako je nedelja prošla**, pa se broji i dnevno i
za sedam dana unazad.

Kod biološke terapije se vidi odbrojavanje do sledeće doze, koji je dan
ciklusa, i **koje mesto primene sledi po redu rotacije** — aplikacija ga sama
predlaže, a može se izabrati i drugo. Beleži se reakcija na mestu primene i
tegobe posle nje.

Najvažniji prikaz je **bol u odnosu na dan ciklusa**: za svaki dan ciklusa
(0 je dan primene) sabiraju se svi zabeleženi dani koji su na tom mestu u
ciklusu. Ako bol raste pred sledeću dozu, to se vidi na prvi pogled i piše
rečenicom — to je podatak koji lekar traži.

Lek se ne briše nego sklanja: zabeležena uzimanja ostaju u dnevniku, jer je i
prestanak terapije podatak.

**Aplikacija ne predlaže doze, ne savetuje promenu terapije i ne upozorava na
uzajamna dejstva lekova.** Samo beleži ono što unesete.

### Izveštaji

Trend se sažima prema dužini perioda: nedelja i mesec po danu, šest meseci po
nedelji, godina po mesecu. Dani bez unosa se **ne popunjavaju nulom** — na
grafiku ostaju kao tanka crtica na osnovi i ne ulaze u prosek, jer bi prosek od
nepostojećih dana bio izmišljen podatak. Visina stubića nosi jačinu, a boja je
samo pojačava.

### Boje jačine bola

Četiri stepena, fiksna u oba režima: `#2E9E8F` blaga, `#FAB219` umerena,
`#EC835A` jaka, `#D03B3B` vrlo jaka. Umerena namerno **nije** `--accent` —
akcenat je po dizajn-sistemu samo hrom i nikad podatak. Razdvojivost je
proverena, ne procenjena: ΔE kod deuteranopije 11,3 (sa akcentom je bilo 5,0).
Boja nigde ne stoji sama — uz nju uvek ide broj, oblik ili visina stubića.

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

### Izvoz

Dnevnik i lekovi izvoze se u CSV sa tačka-zarezom kao razdvojnikom i sa BOM-om
na početku — tako Excel na našim podešavanjima otvara tabelu bez pitanja i ne
prikazuje č, ć, š, ž i đ kao smeće. CSV je za čitanje i pokazivanje lekaru; za
vraćanje podataka služi kopija u JSON-u.

## Šta tek dolazi

Vremenski okidači preko Open-Meteo: uz svaki unos se pamti kakvo je vreme bilo,
pa se prati promena pritiska, vlažnost i nagla promena temperature.

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

Ako WebGL na uređaju nije dostupan, umesto praznog pravougaonika stoji poruka,
a unos se obavlja iz spiska regiona — potpuno isto. Platno se osvežava tek
pošto je ekran prikazan: dok je sakriven nema veličinu, a oslanjati se samo na
`ResizeObserver` nije pouzdano.

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
js/skladiste.js         stanje, datumi, izvedene mere, izvoz i uvoz
js/skala.js             tabla brojeva 0–10, zajednička za sve mere
js/trajnost.js          IndexedDB, trajno skladište, stanje čuvanja
js/kopija.js            čuvanje u datoteku i vraćanje iz nje
js/polja.js             šta se pita uz koji deo dana, po režimu
js/podesavanja.js       izbor režima praćenja
js/dan.js               tri polja za dan, tok dana i lični zbir
js/statistika.js        sažimanje dnevnika u izveštaj za period
js/izvestaj.js          ekran izveštaja i grafici
js/dnevnik.js           spisak svih dana
js/izvoz.js             izvoz u CSV za lekara
js/lekovi.js            lekovi, uzimanja, primene, odbrojavanje, rotacija
js/ekran-lekovi.js      spisak, odbrojavanje i grafik ciklusa
js/ekran-lek.js         unos i izmena jednog leka
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
