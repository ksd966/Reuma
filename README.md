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
  označenog regiona dok je korisnik ne dodirne. Dugme za prepis bira najbliži
  izvor: raniji deo istog dana ako postoji („Kao jutros"), inače isti deo
  prethodnog dana („Kao juče").
- **Najčešći regioni** — kratak red mesta koja se najčešće označavaju, iznad
  modela; jedan dodir otvara list za to mesto, bez okretanja tela.
- **Još pitanja** — ukočenost, san, umor i ostalo stoje sklopljeni, pa je
  „Sačuvaj" odmah nadohvat. Razviju se sami kad unos već nosi odgovore.
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
- **Lekovi** — raspored i način uzimanja su nezavisni, pa svaka terapija ima
  gde da stane: svaki dan (1–3 puta), određenim danima u nedelji, na svakih N
  dana, ili po potrebi; tableta, injekcija ili infuzija. Lekovi u ciklusu
  nose odbrojavanje i grafik bola po danu ciklusa, injekcije rotaciju mesta.
- **Danas na redu** — ono što po rasporedu pada na taj dan, i na ekranu Dan i
  na ekranu Lekovi, iz istog izvora.
- **Dnevnik** — svi dani u jednom spisku, najnoviji gore, sa sva tri unosa u
  jednom redu i sažetkom: gde je bolelo, šta je još zabeleženo, koji lekovi.
  Dodir na dan otvara taj dan za izmenu.
- **Podsetnici u Kalendar** — Artron napravi `.ics` datoteku od rasporeda koji
  je već unet u Lekove; telefon je uveze i dalje podseća sam, i kad Artron nije
  otvoren.
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

### Lekovi

Spisak lekova se pamti, pa se posle unosi sa nekoliko dodira — ono što je na
redu se samo potvrdi, a lek po potrebi ide na jedan dodir plusa. **Koliko je puta uzet lek
po potrebi sam po sebi govori kako je nedelja prošla**, pa se broji i dnevno i
za sedam dana unazad.

Kod lekova u ciklusu se vidi odbrojavanje do sledeće doze, koji je dan
ciklusa, i — kod injekcija — **koje mesto primene sledi po redu rotacije** — aplikacija ga sama
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

### Šta je skinuto sa ekrana

Izmereno na dva meseca unosa sa oba režima uključena:

| Ekran | Skrolovanja | Kontrola |
|---|---|---|
| Unos | 3,9 → **2,3** | 65 → **28** |
| Dnevnik | 7,7 → **1,0** | — |
| Lekovi | 3,2 → **2,1** | 13 → **10** |

**Unos** je nosio skelu koja je korisna prvih par dana pa zauvek zauzima mesto:
legenda boja, legenda oblika i uputstvo za okretanje modela. Sada stoje iza
dugmeta „Šta znače boje", a izbor se pamti u `localStorage`.

**Dodatna pitanja** se više ne otvaraju sama kad odgovori postoje — odgovori
stoje ispisani na liniji prekidača („san: osrednji · umor 4/10"), pa se vidi da
ništa nije izgubljeno bez razvijanja pet pitanja i dve table brojeva.

**Dnevnik** je bio spisak bez ijednog načina da se nešto nađe — za godinu dana
oko 45 ekrana skrolovanja. Sada je podrazumevani prikaz mesec: mreža dana, svaki
obojen po prosečnom bolu i sa upisanim brojem, dodir otvara taj dan. Spisak je
ostao kao drugi prikaz.

**Lekovi** drže otvoreno samo ono što je danas na redu i lek po potrebi.
Odbrojavanje je izgubilo mrežu od pet polja — prethodno i sledeće mesto uboda
su ponavljali ono što list za primenu ionako kaže, u trenutku kad se mesto
zaista bira; ostatak stoji u jednom redu. Grafik ciklusa, spisak svih lekova i
podsetnici su sklopljeni: to je pregled i podešavanje, ne svakodnevna upotreba.

Sklapanje je sada jedna komponenta (`js/sklopivo.js`). Na nju su prevedeni i
spisak regiona i „Još pitanja", koji su do tada bili prepisani rukom — jedan u
HTML-u, drugi u JavaScriptu. Odeljci koji to traže pamte stanje u
`localStorage`; to je udobnost ovog telefona, ne podatak, pa ne ide u dnevnik
koji se izvozi i u kopiju.

**Ekran Dan** je preslagan oko jednog težišta. Ranije su vrh činila tri
odvojena reda — traka sa danom, naslov odeljka, pa linija sa preostalim — pa
ekran nije imao odakle da počne. Sada je to jedan blok: ime dana krupno, datum,
i ispod crte šta je od tog dana ostalo. Kad ništa ne preostaje, linija to i
kaže („Sve je zabeleženo za danas") umesto da se sakrije — inače se ne zna da
li je sve urađeno ili se linija prosto nije pojavila. Prvog dana se ne
prikazuje uopšte, jer uvodna rečenica kaže isto i još objasni šta se otvara.

Kartice delova dana nose traku u boji jačine na vrhu — ista boja koju nosi i
broj ispod, pa se dan čita pre nego što se pročitaju brojevi. Popunjena
kartica stoji kao kartica, prazna kao mesto koje je tek čeka: bez podloge i bez
senke. Ranije je bilo obrnuto — popunjena je bila siva a prazna bela, pa je
prazna više padala u oči. Kartice pišu i gde je bolelo („Leva šaka") umesto
„1 region". Dugme „Ništa me ne boli" se sklanja kad nema šta da upiše.

Datum se više ne ponavlja u gornjoj traci, potvrđena doza nema zelenu ivicu oko
celog reda (kvačica je dovoljna), a od četiri velika naslova odeljka na ovom
ekranu ostao je jedan.

### Raspored leka, a ne „vrsta"

Ranije su lekovi bili podeljeni na stalne, po potrebi i biološke — i ta podela
je ćutke nosila raspored. „Stalni" je značilo *svaki dan*, „biološka" *svakih N
dana + injekcija + rotacija mesta*. **Metotreksat nije imao gde da stane:**
nedeljna tableta, najčešći lek u reumatologiji. Jedini način je bio prijaviti
ga kao biološku terapiju sa ciklusom od 7 dana, pa bi tableta dobila rotaciju
mesta uboda.

Sada su to tri nezavisne osobine:

| | |
|---|---|
| **raspored** | `dnevno` (1–3 puta), `nedeljno` (dani u nedelji), `ciklus` (svakih N dana), `poPotrebi` |
| **način** | `tableta`, `injekcija`, `infuzija` |
| **doza** | slobodan tekst, onako kako je korisnik otkucao |

Od načina zavisi **šta se beleži**: tableta se potvrđuje kvadratićem, injekcija
nosi mesto uboda sa rotacijom i reakciju, infuzija reakciju ali ne i mesto —
ide u venu, rotacija tu nema smisla. Od rasporeda zavisi **kada se lek pojavi**
kao „danas na redu".

Zapisi se i dalje čuvaju na dva mesta, jer nose različite podatke: `uzimanja`
za tablete, `primene` za injekcije i infuzije. `dogadjajiLeka()` ih spaja u
jedan niz, pa odbrojavanje, grafik ciklusa i izvoz ne moraju da znaju koje je
koje.

Lekovi uneti u ranijoj verziji prevode se pri pokretanju (`migrirajLekove()`) —
stalni u dnevni raspored, biološki u ciklus sa injekcijom, po potrebi ostaje
kako jeste. Zabeležena uzimanja i primene se ne diraju.

Dozе se štikliraju po svom mestu u danu, ne odozgo: dodir na večernju dozu
označava večernju, a ne jutarnju.

### Zašto podsetnici idu kroz Kalendar

Prave notifikacije — one koje zazvone i kad aplikacija nije otvorena — na
iPhone-u traže server koji ih šalje. To bi značilo da podaci napuštaju telefon
i da neko taj server plaća, pa je otpalo.

Kalendar radi isti posao bez ijednog servera. Artron od unetog rasporeda
napravi `.ics` datoteku (`js/kalendar.js`), telefon je uveze, i dalje podseća
sam. Stalni lekovi dobijaju dnevno ponavljanje u zadato vreme, biološka
ponavljanje na dužinu ciklusa računato od poslednje zabeležene primene.
Godinu dana unapred — dovoljno da se ne misli na to, dovoljno kratko da se
zastarela terapija sama ugasi u kalendaru.

Zapis prati RFC 5545: redovi se prelamaju na 75 **okteta** (ne znakova — „č",
„ć", „š" i „ž" zauzimaju po dva, a prelom ne sme da padne usred znaka), a
tačka-zarez, zarez i obrnuta kosa crta se štite. Vreme se piše bez oznake
vremenske zone — lek se uzima u osam ujutru tamo gde je korisnik. Oznaka
(`UID`) je stabilna, pa ponovni uvoz osvežava postojeće podsetnike umesto da
ih udvostruči.

Lekovima bez rasporeda se ne izmišlja termin: stalni bez zadatog vremena i
biološka bez ijedne zabeležene primene se preskaču, a koji su preskočeni i
zašto piše ispod dugmeta.

U podsetnik ulazi samo ono što je korisnik sam uneo. Aplikacija ne predlaže
doze i ne savetuje terapiju — to piše i u opisu svakog događaja.

Datoteka se prvo nudi kroz list za deljenje (`navigator.share`): aplikacija
dodata na početni ekran nema prozor za preuzimanje, pa je deljenje jedini put
do Kalendara. Gde deljenja nema, ostaje obično preuzimanje. Isti put koriste i
CSV izvoz i kopija podataka.

### Razdvajanje površina

Tri tona iz dizajn-sistema, redom: `--ground` za stranu, `--surface` za
karticu, `--surface-2` za kontrolu unutar kartice. Ranije je sve bilo na
`--surface`, pa se dugme nije razlikovalo od podloge ispod sebe, a na ekranu
unosa kartice uopšte nije ni bilo — sve je stajalo na istoj ravni.

Dva tokena nose razliku:

- `--ivica-kartice` — u tamnom režimu `--line-strong`, jer na skoro crnoj
  podlozi razdvaja ivica; u svetlom `--line`, jer bi jača bila gruba.
- `--dizanje` — senka koja u svetlom režimu nosi glavni posao razdvajanja, a u
  tamnom je jedva prisutna, jer senka na crnom ne radi ništa.

Bez stakla, blura i sjaja — kako dizajn-sistem traži.

### Paleta

Hrom je hladan — duboko plavo-sivo, meko plavi akcenat. Nije ukus nego posledica:
boje jačine bola idu od zelene preko žute do crvene, pa je raniji **žuti akcenat
sedeo tačno na „umerenoj"** (kontrast 1,2 — praktično ista boja). Dugme „Sačuvaj"
se mešalo sa podatkom. Plavo se ni sa jednom bojom jačine ne meša (3,9 prema
najbližoj), pa akcenat i podatak više ne mogu da se pobrkaju.

Uz paletu idu i dva tokena koja rešavaju po jednu stvarnu grešku:

- `--na-accentu` — tekst na punom akcentu. Ranije je bio tvrdo upisan `#14171A`,
  pa je u svetlom režimu davao **tamno na tamnom** (3,8 — ispod praga).
- `--na-jacini` — tekst na boji jačine ili statusa. Ne menja se sa paletom, jer
  se ni te boje ne menjaju.

Izuzetak nosi sama boja jačine: tamno na crvenoj daje 3,7, ispod praga za sitan
tekst, pa `STEPENI` u `js/telo/regioni.js` uz svaku boju nosi i `naBoji` — belo
na „vrlo jakoj" (4,8), tamno na ostale tri. Sve četiri sada prolaze 4,5.

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
js/sklopivo.js          sklopiv odeljak koji pamti da li je otvoren
js/trajnost.js          IndexedDB, trajno skladište, stanje čuvanja
js/kopija.js            čuvanje u datoteku i vraćanje iz nje
js/polja.js             šta se pita uz koji deo dana, po režimu
js/podesavanja.js       izbor režima praćenja
js/dan.js               tri polja za dan, tok dana i lični zbir
js/statistika.js        sažimanje dnevnika u izveštaj za period
js/izvestaj.js          ekran izveštaja i grafici
js/dnevnik.js           spisak svih dana
js/izvoz.js             izvoz u CSV za lekara i slanje datoteke
js/kalendar.js          podsetnici za lekove kao .ics za Kalendar
js/lekovi.js            raspored, način, šta je danas na redu, odbrojavanje
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
