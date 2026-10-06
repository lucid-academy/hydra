# Hydra — dokument projektu gry

> Tytuł roboczy: **Hydra**. Dokument żyje: Piotr będzie go często zmieniał. Gdy kod przeczy dokumentowi, dokument ma pierwszeństwo, ale zanim cokolwiek zmienisz, zapytaj.

## 1. Wizja

Grasz hydrą z podziemnego bagna. Rycerze Zakonu Wiecznego Ognia z zamku na wzgórzu chcą ją spalić, a jej bagno wypalić do suchej ziemi. Hydra eksploruje podziemia, rośnie w siłę, rozmnaża się i broni leża. Gdy okrzepnie, wychodzi na powierzchnię pod osłoną mgły, gasi kapliczki Płomienia i odpycha ludzi. Przy tym kolejne pokolenia hydry odkrywają po kawałku tajemnicę Wielkiego Węża, który zaczął mówić do jej głów. Gra ma kilka zakończeń; zgaszenie Wiecznego Płomienia i przejęcie powierzchni to jedno z nich.

Gatunek: fabularny roguelite z pokoleniami, z naciskiem na odkrywanie świata: eksplorację, mini questy i tajemnicę Węża. (Decyzja Piotra z 2026-10-04; wcześniej nacisk był na bitwy.) Warstwa strategiczna to turowa mapa heksagonalna z odkrywaniem terenu jak w Cywilizacji. Walka to osobne starcia w czasie rzeczywistym z pauzą, jak w Tomb Guard: rzadsze, ale ważne. Mroczne fantasy z absurdalnym humorem, pixel art, gra w przeglądarce, wszystkie teksty w grze po angielsku.

### Filary (każda decyzja projektowa wspiera przynajmniej jeden)

1. **Głowy to drużyna.** Każda głowa to osobna postać z klasą, imieniem i charakterem. Ścięcie nie kończy walki, tylko zmienia skład. Głowy są najsilniejsze razem: ich ataki łączą się w combosy.
2. **Mgła przeciw ogniowi.** Na powierzchni hydra istnieje tylko tam, gdzie jest Mist. Zakon walczy ogniem. Konflikt z Zakonem to mgła kontra płomień.
3. **Eksploracja ma cenę, ale nie ma stopera.** Im więcej hydra odkrywa i zdobywa, tym szybciej Zakon się zbroi. Długie wyprawy po podziemiach są normą, a nie ryzykanctwem.
4. **Każdy run jest inny.** Generowana mapa, losowe głowy, eventy, modyfikatory runu.
5. **Poważny świat, absurdalni ludzie.** Humor bierze się z tego, że Zakon jest śmiertelnie poważny w idiotycznych sprawach.
6. **Świat do odkrycia.** Każde pokolenie odkrywa kawałek tajemnicy Węża: w lokacjach, mini questach, głosie Węża i rozmowach z Old Mother Toad. Śmierć hydry nie zeruje historii, tylko przekazuje ją następnemu pokoleniu. (Decyzja Piotra z 2026-10-04.)

### Świat

Decyzje Piotra z 2026-10-04. Gracz poznaje ten świat po kawałku, a części odpowiedzi jeszcze nie ma.

- **The Great Serpent** (Wielki Wąż) śpi, otulając swoim ciałem środek planety. Hydra szuka jego błogosławieństw. Może to on sprawia, że głowy rosną (§16, odrost).
- **Głos Węża.** Śpiący Wąż mówi do głów hydry, do każdej trochę inaczej. Głowy różnie rozumieją jego słowa i stąd często ich niezgoda. Komunikaty są niejasne i oniryczne, czasem brzmią jak zagadki i zdradzają fragmenty historii. Pojawiają się w głowach głów w podróży, w walce albo w czasie odpoczynku.
- **Old Mother Toad** pomaga je trochę interpretować, ale do niej Wąż nie mówi od dawna. Nie wie dlaczego, łaknie tej wiedzy i czasem cicho zazdrości głowom. O Hushed coś wie, ale niewiele.
- **The Hushed** zniknęli dawno temu. Nie wiadomo, czy byli humanoidami, czy bliżej im było do węży. Podtrzymywali rytm i melodię Węża, która według nich nadaje rytm i równowagę całemu światu; czy to prawda, nie wiadomo. Zostały po nich ryciny w starych księgach, artefakty i maszyny dźwiękowo-parowe (roboczo: grzane ciepłem z wnętrza planety, trzymały pieśń na właściwej częstotliwości).
- **Tajemnice do odkrycia w grze:** czy to przez zniknięcie Hushed hydra zaczęła słyszeć głosy? Dlaczego dopiero teraz, skoro Wąż tyle lat milczał, a Hushed zniknęli dawno temu? Czy bez ich interpretacji hydra zrozumie, co się dzieje? Odpowiedzi: `TODO(design)`.
- **The Discordant**, kultyści Węża: górnicy, grabarze i ludzie z predyspozycjami słyszą strzępki pieśni Węża. Hushed utrzymywali jej harmonię, a bez nich kakofonia dźwięków doprowadza tych ludzi do szaleństwa. Miejscami są jak kultyści Cthulhu. Każdy idzie własną drogą i inaczej wygląda: jedni się okaleczają, inni upodabniają do węża, jeszcze inni próbują połączyć się z muzyką. Trzy odłamy (nazwy robocze): **Wakers** chcą obudzić Węża, **the Ninefold** wspierają hydrę, a **the One Coil** atakują ją jako aberrację, bo „wąż jest tylko jeden".
- **Kultyści w grze: mała frakcja.** Są tylko w podziemiach, w małych grupach: jedni walczą z hydrą, inni jej pomagają. Nie mają Alertu ani wypraw, więc głównym wrogiem zostaje Zakon. Ich jednostki, spotkania i eventy: `TODO(design)`.
- **The Cinderkin:** owady z gorącej skały, które jedzą ciepło. Żyją w ulach z królową, a ule to katedry z zastygłej lawy. Ciągnie je każdy ogień, także ogień Zakonu. Łatwo przechodzą między warstwami, bo je topią. Ich cel jest nieznany; zachowują się nieco irracjonalnie, ale jak rój. Czy walczą w bitwach: `TODO(design)`.
- **Grzybnia** (Mycelium): grzyby i grzybnia, lekka psychodelia, współistnienie wszystkich żywych istot, wielowymiarowość. To ścieżka obok Węża, nie bezpośrednio z nim związana, ale ważna. Grzybnia łączy tak wiele, że ma z tego moc i zrozumienie. To potężna siła, której nikt jeszcze nie okiełznał. Pisać o niej z nutką tajemnicy.
- **Częstotliwości.** Grzybnia jest między innymi przewodnikiem po częstotliwościach. Odpowiednio zgrana pozwala wyraźniej słyszeć pieśń Węża, doznać błogości (bliss) i dostrzegać więcej niż zwykle. Częstotliwość Węża to jednak tylko jedna z wielu, więc czasem kakofonia innych wymiarów doprowadza do szaleństwa. Grzyby mogą więc być odpowiedzią, źródłem wiedzy, która wykracza poza świat Węża, ale dla wielu istot są też klątwą i szaleństwem. Inne wymiary i istoty z nich pojawiają się bardzo oszczędnie, jako ciekawostka.
- **Grzybnia, dopiski Claude** (z wiedzy o grzybach i psychodelikach, na prośbę Piotra):
  - **Widać dźwięk.** W grzybni częstotliwości widać jako kolory i wzory: spirale, kraty i pajęczyny, jak w wizjach po grzybach. Pieśń Węża ma kształt zwiniętej spirali.
  - **Słuchacz i miejsce.** Te same zarodniki jednej głowie dają błogość, a drugiej kakofonię. Zależy to od tego, kto słucha i gdzie.
  - **Jedno ciało.** Pod zarodnikami głowy na chwilę czują się jednym ciałem i pierwszy raz się zgadzają. Potem kłócą się, która zgodziła się pierwsza.
  - **Klątwa.** Istotę, która usłyszała za dużo naraz, grzybnia przerasta od środka i prowadzi, dokąd chce, jak prawdziwy grzyb Ophiocordyceps, który steruje mrówkami.
  - **Ciekawostka.** W kręgach grzybów czas płynie inaczej, a czasem coś patrzy z drugiej strony.

## 2. Referencje

- **Tomb Guard** (Studio Siege, demo na Steamie, 2026): główna referencja walki, eventów i stylu. Real-time z pauzą, drużyna z klasami i specjalizacjami, walka aż do bossa, eventy z ryzykiem, błogosławieństwa, odblokowania przez wyzwania, śmierć jako normalna część gry. Pixel art widziany z góry.
- **Cywilizacja:** ruch po heksach, odsłanianie mapy, mgła wojny na terenach już odkrytych.
- **Heroes of Might and Magic II:** podział na mapę przygody i osobny ekran bitwy. Wygląd hydry (nasza jest mroczniejsza).
- **Hades:** dialogi z dużym portretem i tekstem, postacie reagujące na to, co się wydarzyło, śmierć jako postęp fabuły.
- **Sunless Sea:** wzór całości dla fabularnego roguelite'a: eksploracja nieznanego, małe historie przypięte do miejsc, kilka zakończeń, następca po śmierci. Nie bierzemy stamtąd walki na doczepkę: u nas bitwy są rzadsze, ale ważne. (Decyzja Piotra z 2026-10-04.)
- **Into the Breach:** wygląd bitwy. Plansza widziana pod skosem, wyraźne pola, postacie lekko poruszające się na swoim polu. U nas pola to heksy, a walka toczy się w czasie rzeczywistym, nie w turach.
- **FTL:** pauza w czasie rzeczywistym: zatrzymujesz, wydajesz rozkazy, puszczasz.
- **Songs of Conquest:** docelowy styl warstwy eksploracji (mapy przygody).
- **Key art** (okładka gry): źródło palety i klimatu.

## 3. Słownik (obowiązuje w kodzie i w tekstach)

| Termin | Znaczenie |
|---|---|
| Body | Tułów hydry. Jego śmierć oznacza śmierć hydry. |
| Head | Głowa, jednostka w walce. 3 na start, maksymalnie 9. |
| Stump | Kikut po ściętej głowie. |
| Severing | Ścięcie głowy. |
| Regrowth | Odrost: z kikuta wyrastają dwie nowe głowy. |
| Cauterize | Przypalenie kikuta ogniem, blokuje odrost. |
| Scar | Blizna po przypalonym kikucie. |
| Hatchling Head | Świeżo odrośnięta głowa: poziom 1, losowa klasa, losowa przypadłość. |
| Quirk | Przypadłość głowy (cecha z plusem, minusem albo absurdem). |
| Status | Efekt nałożony na człowieka przez atak (Corroded, Terrified, Soaked, Stunned, Seized, Entranced). |
| Combo | Połączenie ataków dwóch głów albo ataku ze statusem, daje dodatkowy efekt. |
| Mist | Mgła hydry: zasób i teren na powierzchni. |
| Visibility | Wiedza gracza o mapie (mgła wojny): Unexplored / Remembered / Visible. |
| Alert | Czujność Zakonu, 0–100. |
| Expedition | Wyprawa Zakonu idąca na leże. |
| Great Burning | Wielkie Palenie: szturm Zakonu na leże na koniec aktu, z bossem. |
| Order of the Eternal Flame | Zakon Wiecznego Ognia, główna frakcja ludzi i główny wróg hydry. |
| Eternal Flame | Wieczny Płomień w katedrze na zamku. Jego zgaszenie to zwycięstwo. |
| Flame Shrine | Kapliczka Płomienia na powierzchni, podtrzymuje Wieczny Płomień. |
| The Discordant | Kultyści Węża, mała frakcja ludzi w podziemiach. Rozstrojona pieśń Węża doprowadza ich do szaleństwa. |
| Great Serpent | Wielki Wąż. Śpi owinięty wokół środka planety i przez sen mówi do głów hydry. |
| The Hushed | Rasa, która dawno zniknęła. Podtrzymywała rytm i melodię Węża. |
| Cinderkin | Roje owadów z głębin, które jedzą ciepło i przetapiają się między warstwami. |
| Mycelium | Grzybnia, przewodnik po częstotliwościach. Pozwala wyraźniej słyszeć pieśń Węża i dostrzegać więcej, ale wielu istotom niesie szaleństwo. |
| Lair | Leże hydry. |
| Ring | Pierścień podziemi wokół leża. Umowny: nierówny kształt, własne biomy, od sąsiada oddziela go pas litej skały. |
| Threshold | Próg: przejście między pierścieniami tej samej warstwy. Większość trzeba znaleźć albo otworzyć. Inne niż Passage, które łączy warstwy. |
| Remains | Zwłoki w ślepym zaułku: trochę łupu i jedno zdanie o tym, kto tu zginął. |
| Egg / Broodling | Jajo / wyklute młode. |
| Mutation | Dziedziczna cecha przechodząca na potomków. |
| Lineage Grimoire | Księga zaklęć rodu, przechodzi na potomków. |
| Hidden Egg | Ukryte jajo, jedyny zapis rodu. Pozwala uratować ród przed wymarciem. |
| Generation | Jedno życie hydry, czyli jeden run. |
| Lineage | Ród, ciąg pokoleń. |

**Uwaga:** Mist i mgła wojny to dwie zupełnie różne rzeczy. W kodzie mgła hydry to zawsze `mist`, a wiedza gracza o mapie to zawsze `visibility`. Nigdy nie nazywaj widoczności „fog".

## 4. Struktura gry

Trzy poziomy pętli:

**Tura:** ruch po mapie heksagonalnej, odkrywanie, decyzje. Wejście na heks z ludźmi uruchamia bitwę.

**Run, czyli jedno pokolenie:** hydra startuje w leżu na nowej, wygenerowanej mapie. Eksploruje, odkrywa kawałki tajemnicy Węża (lokacje, mini questy, głos Węża), walczy, zbiera, znosi jaja, buduje komnaty. Czujność Zakonu rośnie razem z tym, co hydra robi i zdobywa. Wyprawy atakują leże, a gaszenie kapliczek na powierzchni czujność obniża. Gdy czujność dojdzie do maksimum, Zakon ogłasza Great Burning: szturm na leże pod wodzą Mistrza Zakonu (boss). Przetrwanie otwiera kolejny akt: Zakon się wzmacnia (nowe typy wrogów), w podziemiach otwiera się głębsza warstwa, a Alert zaczyna od nowa. Run trwa, dopóki hydra żyje.

**Ród:** po śmierci wybierasz jedno z ocalałych jaj. Nowa hydra zaczyna od aktu 1 na nowej mapie, ale dziedziczy mutacje i zaklęcia rodu (sekcja 12). Wiedza o świecie przechodzi na kolejne pokolenia, więc tajemnica Węża odsłania się po kawałku przez cały ród (co z nią po wymarciu rodu: §16).

**Zakończenia:** gra ma kilka zakończeń związanych z Wężem. Zgaszenie Wiecznego Płomienia i przejęcie powierzchni (sekcja 5.7) to jedno z nich. Pozostałe: `TODO(design)` (propozycje w §16).

## 5. Mapa heksagonalna (warstwa strategiczna)

### 5.1 Warstwy
Dwie osobne mapy heksagonalne: **Underground** (podziemia) i **Surface** (powierzchnia). Łączą je **Passages** (zapadliska, studnie, krypty), czyli heksy przejścia między warstwami. W podziemiach hydra porusza się swobodnie. Na powierzchnię wychodzi tylko przez Passage i tylko na heksy z Mist.

**Podziemia aktu 1 to pierścienie** (decyzja Piotra z 2026-10-04): leże w środku i trzy **Rings** wokół niego (roboczo do 8, 14 i 20 heksów od leża), każdy groźniejszy od poprzedniego. Pierścienie są umowne: mają nierówny kształt i bywają przesunięte względem leża. Oddzielają je pasy litej skały, przez które prowadzi tylko kilka **Thresholds** (§9). Leże łączy się z pierścieniem 1 kilkoma szerokimi wyjściami. Głębsze warstwy przychodzą z kolejnymi aktami (§4).

### 5.2 Tury i ruch
- Warstwa strategiczna jest turowa. Hydra to jeden żeton na mapie.
- Hydra ma punkty ruchu na turę (startowo 6, roboczo; do M2b było 5). Koszt wejścia na heks zależy od terenu (roboczo: woda 1, błoto 1, korzenie 2, sól 3, lita skała nieprzechodnia).
- Przycisk **End Turn** uruchamia turę świata: ruszają się ludzkie jednostki, Mist na powierzchni zanika, jaja się wykluwają, mogą pojawić się eventy. Sam upływ tur podnosi Alert minimalnie albo wcale (sekcja 8).
- Na powierzchni obowiązuje cykl dnia i nocy liczony w turach (roboczo 6 tur dnia, 4 tury nocy).

### 5.3 Widoczność (jak w Cywilizacji)
Każdy heks ma jeden z trzech stanów:
- **Unexplored:** czarny, nic nie wiadomo.
- **Remembered:** odkryty wcześniej, teraz poza zasięgiem wzroku. Widać przyciemniony teren i obiekty stałe. Ludzie są pokazani jako „ostatnio widziani": wyblakła ikona z informacją, ile tur temu.
- **Visible:** w zasięgu wzroku (startowo 3 heksy od hydry, roboczo; do M2b były 2). Wszystko aktualne.

Zasięg wzroku zmieniają klasy głów, przypadłości, mutacje, kapliczki i noc. Broodlingi-zwiadowcy też odsłaniają mapę. Przesłuchany jeniec może odsłonić jej fragment.

### 5.4 Zawartość heksów
- **Encounter:** grupa ludzi, wejście oznacza bitwę.
- **Event:** scena z wyborami.
- **Shrine:** podziemna kapliczka z błogosławieństwem, zwykle z haczykiem.
- **Spell Cache:** zaklęcie, czyli umiejętność aktywna.
- **Resource:** złoża Muck, źródła Moisture. W ślepych zaułkach bywa podwójne złoże (**Rich Deposit**).
- **Remains:** zwłoki w ślepym zaułku, trochę łupu i jedno zdanie.
- **Guarded Hoard:** zapas zasobów w ślepym zaułku, a przed nim spotkanie.
- **Location:** miejsce z własną zasadą: landmark, lokacja biomu albo rzadkie miejsce (§9).
- **Nest Site:** miejsce pod komnatę leża.
- **Passage:** przejście między warstwami.
- **Threshold:** przejście między pierścieniami (rodzaje w §9).
- **Lair:** leże.
- **Outpost:** umocniony punkt Zakonu.
- **Flame Shrine:** kapliczka Płomienia (tylko na powierzchni).
- **Hazard:** wypalona strefa, sól, pułapka.

### 5.5 Ludzie na mapie
Patrole i wyprawy poruszają się po heksach w turze świata. Gracz widzi je tylko w zasięgu wzroku. Po bitwie posłaniec biegnie do zamku; jeśli dotrze, Alert skacze, więc warto go przechwycić. Wyprawa, która dojdzie do leża, wywołuje bitwę obronną.

### 5.6 Powierzchnia i Mist
- Hydra może wejść tylko na heks z Mist.
- Akcja **Exhale Mist** pokrywa mgłą sąsiednie heksy i kosztuje Moisture.
- Mist zanika co turę: szybciej w dzień, wolniej w nocy. Wiatr i kapłani z kadzielnicami rozwiewają ją szybciej.
- Jeśli mgła pod hydrą zniknie, hydra jest **Exposed**: traci HP co turę i ma kary w bitwie, dopóki nie wróci do mgły.
- Inne cele najazdów: wieże strażnicze, młyny, wsie, obozy Zakonu. Zniszczenie celu daje łupy albo jeńców.

### 5.7 Płomienie i zwycięstwo
- Na powierzchni płoną **Flame Shrines**, kapliczki podtrzymujące Wieczny Płomień w katedrze na zamku.
- Zgaszenie kapliczki: bitwa ze strażą, potem kapliczka gaśnie, Alert spada, a heks i jego okolica stają się terytorium hydry z trwałą mgłą (Mist tam nie zanika). Tak rośnie dominacja hydry nad powierzchnią.
- Zakon próbuje rozpalać kapliczki na nowo: oddziały Torchbearers idą po mapie do zgaszonych kapliczek. Można je przechwycić.
- Gdy zgaśnie dość kapliczek (roboczo: wszystkie), zamek staje się celem ostatecznego szturmu. Zgaszenie Wiecznego Płomienia to jedno z zakończeń gry: mgła kładzie się na całej krainie.

### 5.8 Technicznie
Współrzędne osiowe (axial q, r), heksy pointy-top, algorytmy według przewodnika Red Blob Games „Hexagonal Grids". Wszystkie operacje na heksach (sąsiedzi, dystans, zasięg, linia wzroku, zamiana piksel↔heks) w czystym TypeScripcie, pokryte testami.

## 6. Walka (warstwa taktyczna)

### 6.1 Zasady ogólne
- Bitwy są rzadsze niż w pierwszym planie, ale ważne. (Decyzja Piotra z 2026-10-04: fabularny roguelite.)
- Osobna scena: plansza z heksów widziana pod skosem (jak plansza w Into the Breach, tylko z heksów), generowana z szablonu zależnego od terenu heksu (zalana jaskinia, krypta, pole we mgle, dziedziniec kapliczki itd.). Postacie stoją na swoich polach i lekko się poruszają, także wtedy, gdy nic nie robią.
- Czas rzeczywisty z pauzą (jak w FTL). Bitwa zaczyna się w pauzie. Spacja to pauza: w pauzie wydajesz rozkazy, po wznowieniu wszystko się dzieje. Prędkości gry: 1× i 0,5×.
- Symulacja walki działa w stałym kroku (20 tików na sekundę), niezależnie od liczby klatek. Pauza to po prostu zatrzymanie tików.
- Ruch po heksach. Każdy człowiek zajmuje jeden heks i przechodzi z heksu na heks, a krok trwa określony czas. Zasięgi ataków i efektów liczone są w heksach. (Decyzja po playteście M1; wcześniej ruch był swobodny.)

### 6.2 Hydra w walce
- **Body:** duże, wolne, z własnym HP. Zajmuje 7 heksów (środek i sześć dookoła) i zaczyna bitwę na środku planszy, więc ludzie mogą je otoczyć, a głowy atakują we wszystkie strony. Śmierć Body to śmierć hydry i koniec pokolenia. Porusza się na rozkaz (prawy klik albo tapnięcie w wolne pole), krok po kroku i tylko wtedy, gdy pola, na które wchodzi, są wolne.
- **Heads:** każda głowa to jednostka z HP, klasą, poziomem, imieniem i przypadłością. Głowy nie zajmują heksów: wyrastają dookoła Body. Głowa atakuje tylko w zasięgu szyi od Body, liczonym w heksach; zasięg to jedna z rzeczy, które odróżniają klasy głów. Ma atak podstawowy i umiejętności z czasem odnowienia. Atak podstawowy działa sam, gdy wróg wejdzie w zasięg (wyjątek: Lick Tendera sam leczy też najbardziej ranną głowę, §6.9). Umiejętności używa tylko gracz, kliknięciem; głowa nigdy nie użyje ich sama.
- Szyje rysowane proceduralnie jako łańcuch segmentów od Body do pozycji głowy, więc głowa widocznie „sięga" do celu.
- Sterowanie: wybór głowy klawiszami 1–9 albo kliknięciem, umiejętności Q/W/E, kliknięcie celu. Rozkazy można kolejkować w pauzie. Kilka głów naraz: Ctrl albo Shift + kliknięcie w głowy lub ich karty, albo przycisk „All heads” (klawisz A); rozkaz dostają wtedy wszystkie zaznaczone. Od początku projektujemy tak, żeby dało się grać dotykiem: duży przycisk pauzy, tapnięcie wybiera, kolejne tapnięcie wskazuje cel.

### 6.3 Ścinanie, odrost, przypalanie (rdzeń gry)
- Głowa z 0 HP zostaje ścięta i zostaje po niej Stump.
- Po czasie odrostu (roboczo 6 s) z kikuta wyrastają **dwie Hatchling Heads**: poziom 1, losowa klasa z odblokowanej puli, losowa przypadłość, wygenerowane imię. Liczba głów nigdy nie przekracza 9.
- Człowiek z ogniem (Torchbearer, zaklęcia ognia) może **przypalić** kikut: stoi przy nim kilka sekund („kanałuje"). Przypalony kikut nie odrasta do końca bitwy i zostaje blizną, którą leczy odpoczynek w leżu albo kapliczka.
- Głowy zbierają doświadczenie między bitwami i na poziomach 3 i 5 wybierają specjalizację (jak w Tomb Guard). Stracić weterana boli, ale w zamian dostajesz dwie młode głowy. To jest główne napięcie gry.

### 6.4 Klasy głów
Komplet to 9 klas (decyzja Piotra z 2026-10-04). Głowy dzielą się na trzy grupy: jedne przygotowują cel (nakładają status), drugie go kończą, trzecie pilnują hydry. Przygotowują: Acid Spitter, Mist Breather, Screamer, Strangler i Lantern. Kończą: Biter i Glutton. Pilnuje hydry: Tender. The Spare robi, co chce. Dobra drużyna ma po trochu z każdej grupy, a pauza służy do składania ich w odpowiedniej kolejności. Umiejętności każdej klasy są w §6.9.

- **Biter:** walka wręcz, duże obrażenia. Odpowiedź na rycerzy (razem z kwasem) i Tithe Collectora. Charakter: dumny prostak, dla którego każdy problem to problem niedostatecznie pogryziony. *„I bit him. You're welcome."*
- **Acid Spitter:** atak z dystansu, obrażenia w czasie, zdziera pancerz. Odpowiedź na rycerzy i Brazier Bearera. Charakter: zadufany pedant, poprawia inne głowy i liczy, ile pancerza już zjadł. *„Corrosion is a process. You wouldn't understand."*
- **Mist Breather:** tworzy chmury mgły na arenie. Hydrę w chmurze trudniej trafić, ludzie w niej zwalniają, a ogień w chmurze słabnie. Odpowiedź na Torchbearera, Brazier Bearera i Crossbowmana. Charakter: senny poeta, mówi z przerwami i przysypia w środku zdania. *„Everything is... softer... in the mist."*
- **Screamer:** obszarowy strach i ogłuszenie, przerywa kanałowanie (w tym przypalanie). Odpowiedź na Torchbearera i Censer Priesta. Charakter: diwa, mówi wielkimi literami i obraża się, gdy krzyczy ktoś inny. *„I WAS NOT SHOUTING. THIS IS MY INSIDE VOICE."*
- **Glutton:** zjada powalonych ludzi, leczy Body, je też ogień. Odpowiedź na Brazier Bearera i Torchbearera. Charakter: smakosz, ocenia ludzi jak dania, a Zakon jak restaurację. *„Is he seasoned? He smells seasoned."*
- **The Spare:** bezużyteczna głowa. Nic nie robi, czasem robi coś absurdalnego. Jeśli dożyje, ma najlepsze specjalizacje w grze. Charakter: zagubiona i życzliwa, pewna, że pomaga. *„Hello. Am I a head? I think I'm a head."*
- **Strangler:** najdłuższa szyja w grze: chwyta, trzyma i przyciąga ludzi. Odpowiedź na Crossbowmana, Tithe Collectora, Censer Priesta i szarżę rycerza. Charakter: cichy, uprzejmy dusiciel, przeprasza, kiedy dusi. *„Shh. Just a little squeeze."*
- **Tender:** leczy głowy, przyspiesza odrost i broni kikutów przed przypaleniem. Odpowiedź na Torchbearera i Headhuntera. Charakter: troskliwa i bardzo upierdliwa niania, do wszystkich mówi „dear”, także do ludzi, których liże. *„Who did this to your neck? Sit still, Kevin."* (Kevin to inna głowa z tej samej bitwy.)
- **Lantern:** wabi ludzi fałszywym światłem. Odpowiedź na Torchbearera, Censer Priesta i Crossbowmana. Charakter: fałszywy kaznodzieja, mówi łagodnie i namaszczenie. *„Come closer, brother. The light forgives."* Zakon bierze każde światło za znak z niebios: *„A sign! Brother, a sign!"*

Pula startowa: pierwsze sześć klas. Czy Strangler, Tender i Lantern są w puli od startu, czy do odblokowania: otwarte pytanie w §16.

### 6.5 Synergie i combosy
- Głowy działają najlepiej razem. Ataki mają **tagi** (bite, acid, mist, scream, devour, coil, lick, light), a trafienia nakładają na ludzi **statusy** (Corroded, Terrified, Soaked, Stunned, Seized, Entranced). Combo powstaje, gdy atak z odpowiednim tagiem trafi cel z odpowiednim statusem albo gdy dwie głowy trafią ten sam cel w krótkim oknie czasu (roboczo 1,5 s).
- **Seized:** człowiek owinięty szyją Stranglera nie chodzi, nie atakuje i nie kanałuje, a pozostałe głowy zadają mu o 25% więcej. Chwyt pęka, gdy Strangler oberwie (roboczo 8 obrażeń).
- **Entranced:** człowiek stoi i wpatruje się w światło Lanterna, nie atakuje i nie kanałuje. Każde obrażenie go budzi. Censer Priest zdejmuje go jak każdy status.
- Pauza jest do tego stworzona: zatrzymujesz walkę, ustawiasz kolejność ataków kilku głów, puszczasz i patrzysz, jak się składają. To główna umiejętność gracza, tak jak w Tomb Guard.
- Combo ma być widać i czuć: nazwa wyskakuje nad celem, krótkie spowolnienie, czasem komentarz głów (*„That was my idea." / „It was not."*).
- Combosy (siedem pierwszych i dwanaście dodanych 2026-10-04):

| Combo | Jak | Efekt |
|---|---|---|
| Corrode & Crush | Acid Spitter nakłada Corroded, potem Biter gryzie | duże obrażenia, pancerz celu pęka na stałe |
| Acid Fog | kwas wpluty w chmurę Mist | chmura przez kilka sekund zadaje ludziom obrażenia |
| Smother | chmura Mist na Torchbearerze | pochodnia gaśnie, przez kilka sekund nie przypali kikuta |
| Panic Feast | Glutton na celu z Terrified i niskim HP | zjada go od razu, bez powalania |
| Echo Scream | dwa Screamery krzyczą w odstępie do 1 s | podwójny zasięg ogłuszenia; głowy kłócą się, która była głośniej |
| Pincer | dwa Bitery gryzą ten sam cel z przeciwnych stron | cel się przewraca |
| Twin Bond | dwie głowy z tego samego kikuta atakują ten sam cel | premia do obrażeń; gdy jedna zginie, druga wpada losowo w szał albo w żałobę |
| Hold Still | Biter gryzie cel Seized | podwójne obrażenia, chwyt trwa 1 s dłużej |
| Room Service | Glutton na celu Seized z HP poniżej 50% | zjada go od razu |
| Wrung Out | Coil na celu Soaked | dodatkowe obrażenia, po puszczeniu Stunned 2 s |
| Voices in the Fog | krzyk w chmurę mgły | wszyscy w chmurze Terrified 3 s, rycerze Stunned 1 s |
| Brittle | Sonic Crack w cel Corroded | pancerz pęka na stałe i odpryski ranią ludzi obok |
| Pickled | Glutton zjada cel Corroded | podwójne leczenie Body |
| Slobber | Lick w cel Soaked | cel się poślizguje, Stunned 2 s |
| Rude Awakening | krzyk w cel Entranced | Stunned 3 s, działa też na rycerzy |
| Anointing | kwas w cel Entranced | Zakon bierze kwas za święty olej: trans trwa dalej, Corroded 2× dłużej |
| Marsh Light | Beacon w chmurze mgły | wabi o 2 heksy dalej, a Torchbearer, który wejdzie, gubi pochodnię |
| Sanctuary | Beacon przy ludziach Terrified | uciekają do światła i klękają (Entranced) |
| Triplet Bond | trzy głowy z jednego kikuta w ten sam cel | większa premia niż Twin Bond |

- Kto na czym robi combo:
  - Corroded (nakłada Acid Spitter): Biter robi Corrode & Crush, Screamer Brittle, Glutton Pickled.
  - Mgła i Soaked (Mist Breather): Acid Spitter robi Acid Fog, Screamer Voices in the Fog, Strangler Wrung Out, Tender Slobber, Lantern Marsh Light. Sama chmura na Torchbearerze to Smother.
  - Terrified (Screamer): Glutton robi Panic Feast, Lantern Sanctuary.
  - Seized (Strangler): Biter robi Hold Still, Glutton Room Service.
  - Entranced (Lantern): Screamer robi Rude Awakening, Acid Spitter Anointing.
  - Bez statusu: Pincer (dwa Bitery), Echo Scream (dwa Screamery), Twin Bond i Triplet Bond (głowy z jednego kikuta).
- Każda głowa ma co najmniej dwa combosy, a każdy status co najmniej dwóch odbiorców. Żadna głowa nie gra sama.
- Próbki komentarzy po combo:
  - Hold Still. STRANGLER: *„I've got him."* BITER: *„I know. I can see him."*
  - Pickled. GLUTTON: *„Marinated. Thank you."* ACID SPITTER: *„It's called corrosion."*
  - Anointing. TORCHBEARER, rozpuszczając się: *„Holy oil! I am anointed!"*
  - Triplet Bond, gdy jedna głowa zginie: *„That was your fault." / „It was nobody's fault." / „It was your fault."*
- The Spare w dowolnym combo dokłada losowy, absurdalny efekt.
- Specjalizacje, mutacje i zaklęcia mogą dodawać nowe combosy i wzmacniać istniejące.
- Zakon ma kontry: Censer Priest zdejmuje statusy, Brazier Bearer rozprasza mgłę, rycerze są odporni na strach, a Headhunter rozbija chwyt Stranglera i poluje na kruchą Tender.
- Combosy żyją w danych (JSON): warunki (status, tagi, okno czasu, klasy głów) i efekt. Nowy combo to nowy wpis, bez zmian w kodzie.
- Odkryte combosy trafiają do kodeksu, nieodkryte widać jako „???". To zachęca do eksperymentów w kolejnych runach.

### 6.6 Ludzie: Zakon Wiecznego Ognia
- **Man-at-Arms:** podstawowy zbrojny Zakonu.
- **Headhunter:** topór, premia do obrażeń przeciw głowom, poluje właśnie na nie.
- **Torchbearer:** brat świecki z pochodnią, przypala kikuty, cel priorytetowy. Przestrzega godzin zakonnych, więc czasem przerywa walkę, żeby odmówić modlitwę o pełnej godzinie.
- **Crossbowman:** atak z dystansu.
- **Censer Priest:** rozwiewa mgłę, zdejmuje statusy, wzmacnia sojuszników.
- **Brazier Bearer:** stawia kosze żarowe, które wysuszają arenę (na suchym Body zwalnia) i rozpraszają chmury mgły.
- **Tithe Collector:** jeśli ucieknie z areny, zabiera dziesięć procent twoich zasobów. Wystawia pokwitowanie.
- **Knight of the Eternal Flame:** pancerny, szarżuje, odporny na strach.
- **Bossowie:** Mistrzowie Zakonu, na końcu Wielki Mistrz strzegący Wiecznego Płomienia.

### 6.7 Teren areny
Woda (Body szybsze, powolne leczenie), błoto, suchy grunt (Body wolniejsze), chmury Mist, kosze żarowe.

### 6.8 Koniec bitwy
- Wygrana: wszyscy ludzie martwi albo uciekli. Przegrana: śmierć Body.
- Odwrót: Body wychodzi krawędzią areny, ucieczka z karą.
- Po bitwie: doświadczenie, łupy, jeńcy. Jeńca można zjeść (Bones, leczenie) albo przesłuchać (dialog, informacja, odsłonięcie fragmentu mapy).
- Stan głów (ścięte, nowe, blizny, doświadczenie) przechodzi na mapę.

### 6.9 Umiejętności i drzewko talentów
- Każda głowa ma atak podstawowy, 3 umiejętności (skille) i umiejętność ostateczną (ult). Na bitwę wybiera się 2 z 3 skilli (klawisze Q i W). Ult (klawisz E) jest dostępny, jeśli hydra znajdzie odpowiednie zaklęcie albo kapliczkę. (Decyzja Piotra z 2026-10-04; wcześniej 2–4 umiejętności i 1–2 na bitwę.)
- Skille rozwija się w drzewku talentów i można je ulepszać. W drzewku rozwija się też całą hydrę: mutacje, szybszy ruch, regeneracja itd. Drzewko i specjalizacje są jeszcze do zaprojektowania.
- Liczby niżej są robocze i trafią do danych (`src/data/`), nie do kodu.

**Biter**
- Atak **Bite:** zasięg 2, wręcz.
- **Crunch:** jedno ugryzienie za 2,5× obrażeń.
- **Lockjaw:** wgryza się i trzyma cel w miejscu 3 s. Cel dalej walczy, ale nie chodzi i nie ucieknie (Tithe Collector).
- **Thrash:** szarpie celem i odrzuca go o 2 heksy. Jeśli cel wpadnie na innego człowieka, obaj są Stunned 1 s.
- Ult **Frenzy:** przez 6 s gryzie 3× szybciej, a każde zabójstwo leczy go o 10 HP.

**Acid Spitter**
- Atak **Spit:** zasięg 5, nakłada Corroded.
- **Acid Pool:** kałuża kwasu na heksie i sześciu sąsiednich na 6 s. Kto w niej stoi, jest Corroded.
- **Melt:** zdejmuje celowi cały pancerz na 8 s. Pochodnia celu gaśnie.
- **Spray:** wachlarz plwociny, Corroded na najwyżej 3 celach.
- Ult **Acid Rain:** przez 6 s kwas pada na całą arenę: wszyscy ludzie są Corroded, kosze żarowe gasną, a chmury mgły zamieniają się w Acid Fog.

**Mist Breather**
- Atak **Breath:** zasięg 3, zostawia chmurę mgły (promień 1, 6 s, ludzie w niej są Soaked).
- **Fog Bank:** duża chmura (promień 2) na 10 s. Kusznicy nie widzą przez nią celu.
- **Douse:** gasi kosz żarowy albo pochodnię, a heks pod nim na 10 s staje się wodą.
- **Drift:** przesuwa wszystkie swoje chmury o 2 heksy w wybraną stronę.
- Ult **Great Fog:** mgła na całej arenie przez 10 s.

**Screamer**
- Atak **Screech:** zasięg 3, Terrified 1,5 s, przerywa kanałowanie, w tym przypalanie.
- **Howl:** strach w promieniu 2 wokół celu, Terrified 3 s. Rycerze są odporni.
- **Sonic Crack:** fala w stożku, Stunned 2 s. Działa też na rycerzy.
- **Rally Cry:** pozostałe głowy atakują o 25% szybciej przez 5 s.
- Ult **Banshee Wail:** Terrified 4 s na całej arenie, rycerze Stunned 1 s, każde kanałowanie przerwane, kadzielnice Censer Priestów pękają.

**Glutton**
- Atak **Gnaw:** zasięg 2, wręcz. Powalonego człowieka zjada i leczy Body.
- **Gulp:** od razu zjada człowieka poniżej 30% HP (rycerza poniżej 15%).
- **Eat Fire:** zjada pochodnię albo kosz żarowy. Ogień gaśnie, a Glutton dostaje zgagi i traci trochę HP.
- **Regurgitate:** wypluwa zbroję zjedzonego człowieka: duże obrażenia i Stunned 2 s. Jeden ładunek z każdego posiłku.
- Ult **Bottomless:** przez 8 s sam zjada każdego człowieka w zasięgu, który ma poniżej 30% HP. Potem śpi 4 s.

**The Spare**
- Atak **Nibble:** zasięg 1. Zwykle nic nie robi, czasem daje losowy efekt (np. cel jest Stunned, bo się zdziwił).
- Cecha bierna **Bad Idea:** raz na bitwę, w losowym momencie i nigdy w pauzie, przejmuje sterowanie na 2 s i wydaje losowy rozkaz.
- **Copycat:** powtarza ostatni skill innej głowy z połową siły. Może przez to odpalić combo.
- **Be Adorable:** ludzie w promieniu 2 przestają walczyć na 2 s. Rycerze też, bo są dobrze wychowani.
- **Rummage:** wyciąga z bagna losową rzecz: garść ślimaków (leczy głowę), zgniłe jajo (chmura, Stunned), rybę (Glutton się cieszy) albo kamień (nic).
- Ult **Multiheadeverse:** losowo działa albo nie. Gdy działa, przy każdym człowieku na chwilę pojawia się półprzezroczysta głowa z innego wymiaru: duże obrażenia, a słabszych rozrywa. Gdy nie działa, głowy się pojawiają, rozglądają, przepraszają i znikają.
- Specjalizacje z poziomu 5, najlepsze w grze, powstaną razem z drzewkiem talentów.

**Strangler**
- Atak **Lash:** zasięg 4, najdłuższa szyja w grze.
- **Coil:** owija cel szyją, Seized 3 s.
- **Yank:** przyciąga cel o 3 heksy w stronę Body, np. kusznika z tylnej linii prosto pod zęby Bitera.
- **Toss:** rzuca trzymanym człowiekiem o 3 heksy. W innego człowieka: obaj są Stunned 2 s. W kosz żarowy: kosz się przewraca i gaśnie. Można też wrzucić go w chmurę mgły albo w kałużę kwasu.
- Ult **Great Squeeze:** chwyta naraz do 3 ludzi na 5 s, a ich pancerz pęka na stałe.

**Tender**
- Atak **Lick:** zasięg 2. Sama liże najbardziej ranną głowę i ją leczy (wyjątek od §6.2). Gdy nikt nie jest ranny albo gdy wskażesz człowieka, liże człowieka: prawie bez obrażeń, ale z tagiem lick.
- **Mend:** leczy głowę o 40% HP i zdejmuje z niej złe efekty.
- **Kiss It Better:** kikutu nie da się przypalić przez 6 s, a postęp przypalania wraca do zera.
- **Hurry Up:** wybrany kikut odrasta 2× szybciej.
- Ult **Triplets:** najbliższy odrost daje 3 głowy zamiast 2. Limit 9 głów zostaje.
- Słabość: mało HP, więc Headhunter jest dla niej groźny, a Torchbearer przypali kikut, jeśli spóźnisz się z Kiss It Better.

**Lantern**
- Atak **Flash:** zasięg 3, Entranced 1 s.
- **Beacon:** zapala światło na heksie na 6 s. Ludzie w promieniu 3 idą do niego i klękają (Entranced).
- **Miracle:** jeden człowiek Entranced na 5 s. Przerywa przypalanie i modlitwę.
- **Flare:** rozbłysk w promieniu 2, Entranced 2 s. Kusznicy przez 4 s pudłują co drugi strzał.
- Ult **Procession:** wszyscy ludzie poza rycerzami i bossami idą gęsiego i śpiewając na wskazany heks, np. do kałuży kwasu albo w chmurę mgły.

## 7. Leże i królestwo

- Leże to heks-baza. Tam hydra odpoczywa (leczenie, usuwanie blizn), znosi jaja, buduje komnaty i zarządza głowami (specjalizacje).
- Zasoby (trzy, to decyzja ostateczna): **Muck** (budowa), **Moisture** (paliwo mgły), **Bones** (z ludzi; jaja i wzrost).
- **Jaja** kosztują Bones i Muck, po kilku turach wykluwają się w **Broodlingi**: obrońców w bitwie o leże albo zwiadowców na mapie (mały żeton, odsłania teren, może zginąć). Niewyklute jaja to kandydaci na następne pokolenie.
- **Komnaty** buduje się na Nest Sites w sąsiedztwie leża, każda poszerza terytorium (jak granice w Cywilizacji): Brood Pool (więcej jaj), Mist Well (więcej Moisture), Bone Pit, Trophy Wall (morale), Shrine Grotto.
- Bitwa obronna toczy się na arenie leża, z Broodlingami i efektami komnat. Przegrana obrona oznacza, że Zakon niszczy jaja i komnaty, łącznie z możliwością zniszczenia wszystkich jaj.

## 8. Alert (czujność Zakonu)

- Skala 0–100. Rośnie przede wszystkim od tego, co hydra robi: odkrywanie nowych heksów (bardzo mało), otwieranie kapliczek i Spell Caches, bitwy, posłańcy docierający do zamku, pokazywanie się na powierzchni. Sam upływ tur podnosi go minimalnie albo wcale.
- Podziemia mają być miejscem długich wypraw. **Cel balansu:** gracz odkrywa roboczo 40–80 heksów podziemi, zanim pierwsza wyprawa ruszy na leże. Presja ma być tłem, nie stoperem.
- Progi: częstsze patrole, potem wyprawy na leże, potem nowe typy wrogów, a przy 100 Great Burning, czyli boss aktu.
- Spada po zgaszeniu kapliczki Płomienia, przechwyceniu posłańców i w niektórych eventach (heretycki mnich rozpowiada, że potwór z bagien to tylko przypowieść).
- Pasek Alertu jest zawsze widoczny.

## 9. Generator podziemi i zmienność runów

- Generator jest deterministyczny, działa z ziarna (seed). Wszystkie losowania w symulacji idą przez własny generator liczb losowych z ziarnem, nigdy przez `Math.random()`.
- Seed jest widoczny w menu pauzy, a parametr URL `?seed=` odtwarza run (do testów i do dzielenia się mapą ze znajomymi).
- Podziemia są duże (roboczo promień 20, czyli 1261 heksów w akcie 1), bo mają wystarczyć na długie wyprawy.
- Biomy podziemi: Flooded Caves, Root Tangle, Old Crypts (ludzkie katakumby), Salt Mines (sucho i groźnie), Fungal Deeps.
- Powierzchnia ma osobny generator: zamek z katedrą Wiecznego Płomienia na wzgórzu po przeciwnej stronie, kapliczki Płomienia rozsiane po krainie, wsie, pola, las, rzeka, obozy Zakonu. Mgła startowo tylko przy wyjściach z Passages.

### 9.1 Kształt świata (od M2c)
Decyzja Piotra z 2026-10-04, szczegóły i schemat w dokumencie Claude „Hydra: generator świata (M2c)”. Generator działa jak w Terrarii: stały szkielet, a reszta losowana od nowa w każdym pokoleniu. Gracz uczy się reguł, nie mapy.
- **Kroki:** szkielet pierścieni, pasy skał, jaskinie, kręte korytarze, ślepe zaułki, biomy, progi, wyjątkowe miejsca, obiekty, dekoracje i podpowiedzi, walidator. Świat, który łamie regułę, losuje się od nowa z kolejnym ziarnem.
- **Pierścienie** (§5.1): granice falują o 2–3 heksy i bywają przesunięte względem leża, więc w jedną stronę do następnego pierścienia jest blisko, w inną daleko. Pierścień ma co najmniej 3 heksy szerokości.
- **Jaskinie i korytarze:** komory połączone krętymi korytarzami o szerokości 1–2 heksów, z kilkoma pętlami. Spotkanie w korytarzu na jeden heks to wąskie gardło.
- **Ślepe zaułki:** w każdym leży dokładnie jedna rzecz: Remains, Shrine, Rich Deposit, Guarded Hoard albo Draught Crack, później też Spell Cache (M2a) i Event (M5).

### 9.2 Biomy pierścieni
Udziały i wagi są robocze i żyją w danych.

| Pierścień | Biomy główne | Wtrącenia |
|---|---|---|
| 1 | Flooded Caves i Root Tangle, każdy 30–70% pierścienia | Old Crypts, Salt Mines |
| 2 | Old Crypts i Salt Mines, każdy 30–70% | Fungal Deeps, Flooded Caves, Root Tangle |
| 3 | Fungal Deeps | Old Crypts, Salt Mines, Flooded Caves, Root Tangle |

Wtrącenie to cała komora w obcym biomie, zawsze z jedną rzeczą z tego biomu. Ma zaskakiwać i zapowiadać, co czeka dalej.

### 9.3 Thresholds
Na granicy pierścieni stoją 2–4 progi, co najmniej 1/5 obwodu od siebie. Zawsze jest wśród nich Draught Crack, więc żadna granica nie wymaga klucza.

| Threshold | Jak przejść | Od kiedy |
|---|---|---|
| Draught Crack | wygląda jak skała; przeciąg na sąsiednich heksach zdradza miejsce, a stanięcie obok odsłania szczelinę | M2c |
| Rubble Choke | kopanie przez 1–2 tury | M2c |
| Root Wall | [Biter] przegryza korzenie | M2c |
| Salt Plug | [Acid Spitter] rozpuszcza sól | M2c |
| Smouldering Seam | [Mist Breather] dusi żar mgłą | M2c |
| Sealed Door | krok mini questu | M5 |
| Cinder Bore | event przywołuje Cinderkin, które przetapiają skałę | M5 |

- Progi na klasy głów działają jak wybory w eventach wymagające klasy (§10). Z M2a dojdą progi dla nowych klas.
- Znalezisko z powierzchni albo przesłuchany jeniec może pokazać ukryty próg (M4).
- **Cinderkin** (decyzja Piotra z 2026-10-04): nie w pierścieniu 1. Pierwsze wyjście z pierścienia 1 gracz zawsze znajduje sam, potem Cinderkin mogą otworzyć jeden dodatkowy próg na run. Rój ciągnie do ciepła, więc event wymaga czegoś gorącego. Jest nieprzewidywalny: przetapia skałę w jednym z najcieńszych miejsc pasa w pobliżu, a tunel parzy przez kilka tur.

### 9.4 Miejsca, podpowiedzi i pamięć świata
- **Pula miejsc:** landmark widoczny z daleka (jeden na każdy biom główny, zawsze), lokacje biomu (1–2 na biom, losowane z jego puli) i rzadkie miejsca (0–2 na świat, każde z szansą roboczo 10–20%): **Cinder Scar** (stary tunel Cinderkin, darmowy dodatkowy próg), **The Lost Survey** (zwłoki mierników Zakonu i mapa, która pokazuje ukryty próg), **The Hushed Stair** (zamknięte schody w dół, zapowiedź głębszej warstwy).
- **Podpowiedzi:** przeciąg przy ukrytym progu i echa: na krawędzi znanej mapy jedno zdanie, które zdradza, co jest za zakrętem.
- **Świat pamięta ród (M6):** miejsca potrzebne do rozpoczętego mini questu pojawiają się na pewno, a miejsca, których ród jeszcze nie widział, mają większą szansę. Ten sam seed i ta sama wiedza rodu dają ten sam świat.
- **Świat zmienia się w trakcie gry:** zawał odcina korytarz, woda podtapia przejście, Cinderkin wytapiają nowe. Przyjdzie z eventami (M5) i Zakonem (M3).

### 9.5 Rozmieszczenie obiektów
- leże w środku mapy,
- kapliczki nie bliżej niż N heksów od leża,
- co najmniej 2 Passages na powierzchnię: jeden w pierścieniu 1, drugi w pierścieniu 2 albo 3, więc powierzchnia bywa ryzykownym objazdem (M4),
- siła spotkań zależy od pierścienia, gęstość od biomu,
- Spell Caches preferują ślepe zaułki (nagroda za eksplorację).

### 9.6 Zmienność runów
- Warstwy zmienności: układ mapy, rozmieszczenie obiektów, pula eventów, przypadłości nowych głów, skład wypraw Zakonu oraz jeden losowy **modyfikator runu**:
  - Drought: mgła zanika szybciej.
  - Wet Year: więcej wody, więcej Moisture.
  - A Generous Bequest: Zakon dostał spadek. Więcej wrogów, lepsze łupy.
  - Plague of Frogs: do ustalenia, ma być dziwnie.
  - Feast of Saint Cinder: Zakon świętuje, Alert rośnie wolniej.
  - Mycelium Bloom: wtrącenia Fungal Deeps w każdym pierścieniu, także w pierwszym.
  - Old Workings: stary szyb Zakonu przecina pierścienie 2 i 3 prostym korytarzem. Darmowy próg, ale wzdłuż szybu więcej spotkań z Zakonem.
- Walidator: test generuje co najmniej 1000 seedów i sprawdza reguły z tej sekcji: każdy pierścień osiągalny od leża bez kluczy, liczby progów i obiektów, żaden ślepy zaułek nie jest pusty, szerokość pierścieni, częstość rzadkich miejsc, brak kolizji obiektów i ten sam świat z tego samego seeda.

## 10. Eventy

- Jak w Tomb Guard: tekst i wybory z ryzykiem i nagrodą. Niektóre wybory wymagają głowy danej klasy, niektóre kosztują zasoby, niektóre to hazard.
- Eventy żyją w danych (JSON): warunki (warstwa, biom, akt, zakres Alertu, obecne klasy głów), wybory, wyniki (zmiany zasobów, przypadłość, mutacja, nowa głowa, bitwa, dialog, odsłonięcie mapy, przedmiot).
- **Mini questy** (decyzja Piotra z 2026-10-04): krótkie łańcuchy eventów przypięte do miejsc i postaci. Kolejny krok odblokowuje flaga z poprzedniego, a postęp przechodzi na kolejne pokolenia. Szczegóły: `TODO(design)`.
- Przykład tonu i struktury:

> *A novice of the Order of the Eternal Flame is inspecting your swamp for heresy. He has a checklist.*
> - **Eat him.** +Bones, Alert +5.
> - **[Screamer] Answer his questions.** He faints. Alert −5.
> - **Ask about indulgences.** −20 Muck. Gain *Indulgence*: once per run, an Expedition turns back while your case is under review.

## 11. Dialogi (w stylu Hadesa)

- Prezentacja: przyciemnione tło, duży portret (popiersie) po lewej albo prawej, plakietka z imieniem, tekst pojawiający się litera po literze, kliknięcie przewija dalej, czasem wybór.
- Kto mówi: głowy (ich kłótnie to główny silnik komedii), Old Mother Toad (strażniczka leża i mentorka, pamięta wszystkie pokolenia, pomaga tłumaczyć głos Węża), jeńcy, Mistrzowie Zakonu (wejścia bossów), przodkowie przy zmianie pokolenia i Wielki Wąż, który mówi do głów przez sen (sekcja 1, „Świat").
- Wyzwalacze: po bitwie (reakcja na to, co się stało: ścięcie, odrost, przypalenie), nowy biom, pierwszy wróg danego typu, zgaszona kapliczka, zmiana pokolenia, boss. Głos Węża przychodzi w podróży, w walce i w czasie odpoczynku.
- Kluczowa zasada z Hadesa: kwestie mają warunki i priorytety, a flagi pilnują, żeby się nie powtarzały. Gracz ma czuć, że gra zauważyła, co zrobił.
- Wszystkie kwestie w danych (JSON), nie w kodzie.

## 12. Pokolenia i dziedzictwo

- Po śmierci hydry: ekran pokolenia, wybór jednego z ocalałych jaj. Nowe pokolenie zaczyna od aktu 1 na nowej mapie.
- Postęp w życiu hydry przechodzi na potomków na dwa sposoby:
  - **Mutations:** dziedziczne cechy. Hydra zdobywa je w trakcie życia (kapliczki, zjedzeni bossowie, zgaszone płomienie, dziwne eventy), a jaja dziedziczą część z nich. Każde jajo pokazuje, które mutacje niesie, np. *Thick-necked* (+20% HP głów), *Fireproof Scales* (przypalanie trwa dłużej), *Paranoid* (+1 zasięg wzroku, −1 głowa na start). Mutacje mogą mieć minusy.
  - **Lineage Grimoire:** zaklęcia znalezione w trakcie życia można w leżu wpisać do księgi rodu. Potomek zaczyna z wybranymi zaklęciami z księgi. Liczba miejsc w księdze rośnie powoli.
- **Hidden Egg, czyli zapis rodu:** gdy rodowi dobrze się wiedzie, gracz może w leżu poprosić Old Mother Toad, żeby ukryła jedno jajo w sekretnym miejscu. Jajo zapamiętuje dziedzictwo rodu z tej chwili (mutacje i księgę zaklęć). Naraz może istnieć tylko jedno ukryte jajo i nie da się go podmienić na nowsze, więc moment ukrycia to prawdziwa decyzja. Po wykorzystaniu można ukryć następne.
- **Wymarcie rodu:** gdy hydra umiera, a nie ma żadnego jaja (bo nie zdążyła ich znieść albo wyprawa zniszczyła wszystkie), gracz dostaje wybór:
  - **End the Lineage:** ród się kończy i trafia do Księgi Rodów. Nowy ród zaczyna bez mutacji i zaklęć, odblokowania konta zostają.
  - **Miraculous Intervention:** dostępna tylko, gdy istnieje ukryte jajo. Old Mother Toad wyciąga je z kryjówki i ród trwa dalej z dziedzictwem zapisanym w jaju. Wszystko, co ród zdobył po ukryciu jaja, przepada.
- Dwie warstwy postępu: **dziedzictwo rodu** (mutacje, księga zaklęć; przepada, gdy ród wymrze) i **odblokowania konta** (na stałe: nowe klasy głów, eventy, kapliczki, modyfikatory, zdobywane przez wyzwania jak w Tomb Guard).
- **Wiedza o świecie** (odkryte tajemnice, postęp mini questów) przechodzi na kolejne pokolenia. Czy przetrwa wymarcie rodu: §16. (Decyzja Piotra z 2026-10-04.)
- **Księga Rodów:** kronika pokoleń z epitafiami, np. *„Morwenna II. Slain by a tithe collector. He gave her a receipt."*

## 13. Styl wizualny

- Pixel art w HD, jak w Songs of Conquest: gra rysuje obraz w rozdzielczości ekranu, a pixel art jest w nim ostrą teksturą. Piksele grafik zostają kwadratowe przy każdym zoomie, a światło, cienie, ciemność i tekst są w pełnej rozdzielczości. Grafiki mają dwa razy więcej pikseli niż przy dawnych 640×360 (np. dekoracja mapy 28×32 px zamiast 14×16), więc zostaje w nich więcej szczegółów z obrazków Piotra. Malowane portrety w dialogach są w pełnej rozdzielczości (niżej). (Decyzja Piotra z 2026-10-05; wcześniej wewnętrzna rozdzielczość 640×360, skalowanie całkowite, bez wygładzania.)
- Wzór stylu: okładka gry (key art od Piotra) i Hades. Hydra jest mroczna i groźna, bardziej wężowa niż smocza. Humor jest w kwestiach, nie w wyglądzie. Body zostanie przerobione w tym stylu. (Decyzja Piotra z 2026-10-04.)
- Paleta z key artu. Podziemia są zimne: głęboki turkus, bagienna zieleń, czerń, chorobliwie żółtozielona bioluminescencja. Hydra jest jak na okładce i portretach głów: łuski ze starego, oliwkowego brązu w czarnej siatce, kremowe płyty brzucha, ciemny mech, bursztynowe oczy; na zimnej planszy odcina się ciepłem, a od Zakonu tym, że jest ciemna i przygaszona. (Decyzja Piotra z 2026-10-04; wcześniej hydra była zimna jak podziemia.) Zakon i powierzchnia są ciepli: złoto, pomarańcz, czerwone chorągwie, ogień. Mist to granica między tymi światami: blada, zielonkawoszara, półprzezroczysta. Konflikt gry jest dosłownie widoczny: ciepłe światło płomieni przeciw zimnej mgle.
- Kolory grafik zostają takie, jak je narysował GPT: import nie sprowadza ich do stałej palety. Spójność trzymają stały blok stylu w promptach i wzory z gry. Paleta z samej okładki (ciepły zachód słońca) zabierała podziemiom turkus i fiolet, a rycerzom czerwone płaszcze; pełniejsza zostawiała mapę prawie bez zmian, ale zdejmowała z głów kolory klas. Do palety wracamy, gdy będą narysowane wszystkie głowy i Zakon. (Decyzja Piotra z 2026-10-06.)
- Hydra: sprite Body, proceduralne szyje i własny sprite głowy dla każdej klasy (głowa i osobno żuchwa, profil, pysk w prawo). Animacje są w kodzie, więc nowa klasa to dalej tylko nowy obrazek, bez nowej animacji. Głów nie barwimy, poza mignięciem przy trafieniu. (Decyzja Piotra z 2026-10-04; wcześniej jedna szara głowa barwiona kolorem klasy.)
- Każda klasa głowy ma jedną cechę sylwetki, żeby rozpoznać ją po samym kształcie, i jeden kolor, który trafia na karty, ramki i akcenty na obrazkach:

| Głowa | Cecha sylwetki | Kolor klasy |
|---|---|---|
| Biter | najmasywniejsza czaszka, blizny, bełt w łuku brwiowym | #5f9a4a |
| Acid Spitter | kaptur kobry, świecące gruczoły kwasu | #b7d13a |
| Mist Breather | pierzaste skrzela zamiast kolców, mgła z pyska | #8fb3a8 |
| Screamer | kościane piszczałki zamiast grzebienia, rozwarte szczęki | #e3d6b4 |
| Glutton | rozdęte gardło z połkniętym rycerzem | #b5614a |
| The Spare | mała i krzywa, jedno oko ślepe | #d28fa4 |
| Strangler | najdłuższa i najniższa, fioletowe pręgi | #7d68b0 |
| Tender | szeroka głowa ropuchy, świecący śluz | #3fb8a6 |
| Lantern | wędka ze świecącą bańką | #8cc8f0 |

- Bitwa widziana pod skosem: plansza z heksów jak gruba płyta, postacie stojące. Warstwa eksploracji docelowo w stylu Songs of Conquest.
- Mapa w stylu Songs of Conquest (decyzja Piotra z 2026-10-05, etap „Wygląd mapy”, §15): ziemia jest jedną powierzchnią bez widocznej siatki i szwów między heksami, z nieregularnymi granicami terenów i spokojnymi teksturami, na których odcinają się rzeczy. Rzeczy mają cień pod sobą. Zasięg ruchu to jedna linia wokół obszaru i ścieżka do wskazanego heksa, a nie obwódka na każdym heksie. Podziemia są ciemne, a światło dają hydra, świecące grzyby i miejsca. Brzeg poznanej mapy łagodnie ginie w ciemności.
- Portrety w dialogach (głowy, Old Mother Toad, jeńcy, Mistrzowie Zakonu, przodkowie): malowane, w stylu okładki i Hadesa (mocne kontury, płaskie plamy koloru, ostre światło), wycięte z tła i pokazywane w pełnej rozdzielczości ekranu nad grą pixelową. Portret głowy jest też wzorem, z którego powstaje pixelowa głowa do bitwy. (Decyzje Piotra z 2026-10-04; wcześniej portrety miały być pixelowymi popiersiami.)
- The Hushed widać tylko na niewyraźnych grafikach, jak ryciny ze starych ksiąg: nie do końca wiadomo, czy to humanoidy, czy bliżej im do węży. (Decyzja Piotra z 2026-10-04.)
- Napisy w kroju „Księga”, jak ze starej drukowanej księgi: tytuły, nazwy i okrzyki w bitwie krojem IM Fell English SC, dłuższe teksty (opisy miejsc, błogosławieństwa, Game Over) krojem Alegreya, reszta interfejsu (paski, karty głów, przyciski, komunikaty) krojem Alegreya Sans. Kroje są na licencji OFL; to wyjątek od zasady darmowych paczek CC0 (niżej). (Decyzja Piotra z 2026-10-06, etap „Wygląd mapy”; wcześniej czcionki systemowe przeglądarki.)
- Grafika na start: zastępcza (generowana w kodzie) i darmowe paczki CC0; czcionki mogą być na licencji OFL. Docelowe sprite'y i portrety robi Piotr w GPT, dlatego wymiary i kadrowanie każdej grafiki muszą być spisane w `docs/ASSETS.md`.

## 14. Humor: zasady pisania

- Świat jest ponury i poważny. Zakon jest śmiertelnie poważny w sprawach absurdalnych: śluby, relikwie z certyfikatami autentyczności, grafiki dyżurów przy płomieniu, odpusty, godziny zakonne, przepisy przeciwpożarowe zakonu czczącego ogień.
- Głowy hydry to komiczny chór: kłócą się, mają ambicje, mylą się.
- Deadpan i krótko. Bez współczesnych memów i internetowego slangu. Łamanie czwartej ściany rzadko i celowo.
- Główna frakcja ludzi: **Order of the Eternal Flame**. Rycerze, bracia świeccy z pochodniami, kapłani z kadzielnicami, poborcy dziesięciny. Motto: *„The Flame never sleeps."*
- Druga, mała frakcja: **The Discordant**, kultyści Węża (sekcja 1, „Świat"). Obłąkani, miejscami jak kultyści Cthulhu.
- Próbki tonu:
  - Boss: *„Grand Master Ignatius Vell. By the Eternal Flame, this swamp is hereby declared kindling."*
  - Kapliczka Płomienia: *„The Flame never sleeps. Brother Aldric, its keeper, very much does."*
  - Po odroście: *NEW HEAD: „Where are we?" / OTHER NEW HEAD: „Who are you?" / GERALD: „Ask Kevin. Oh. Right."*
  - Podziemna kapliczka: *„A shrine to a frog god nobody remembers. The offering bowl holds one coin and a note: 'IOU one sacrifice. — Management.'"*
  - Old Mother Toad: *„I have buried eleven of you. You are not my favourite."*

## 15. Kamienie milowe

Zasada: po każdym etapie gra jest wdrożona i grywalna pod linkiem, a Claude Code zatrzymuje się na playtest.

**Kolejność od 2026-10-04** (decyzja Piotra po zmianie kierunku na fabularny roguelite, sekcja 1): M2c, M5, M6, M2a, M3, M4, M7. Etapy zachowują swoje nazwy, więc numery nie oznaczają już kolejności. 2026-10-05 Piotr wstawił po M2c etap „Wygląd mapy”.

**M0: fundament.** Projekt (Vite + TypeScript + Phaser 4), testy, skrypt do zrzutów ekranu, repo na GitHubie, automatyczne wdrożenie na GitHub Pages. Ekran startowy dostępny pod linkiem.

**M1: pierwszy grywalny kawałek, czyli cała pętla w najcieńszej wersji.**
1. Mała mapa podziemi (heksy, promień ok. 8–10) z ziarna, prosty teren (woda, błoto, skała), trzy stany widoczności, żeton hydry, punkty ruchu, End Turn, licznik tur i Alert (na razie rośnie od odkrywania i bitew).
2. Kilka heksów spotkań, wejście na taki heks uruchamia bitwę. Jeden typ znajdźki (Muck).
3. Bitwa: Body i 3 głowy (Biter, Acid Spitter, Mist Breather) przeciw zbrojnym, Headhunterom i Torchbearerom. Pauza i rozkazy, ścinanie, odrost, przypalanie, wygrana i przegrana, powrót na mapę ze zmienionym składem głów. System statusów i trzy pierwsze combosy: Corrode & Crush, Acid Fog, Smother.
4. Minimalny interfejs: lista głów z HP, pasek Alertu, przycisk pauzy.

Gotowe, gdy: da się rozegrać kilka bitw pod linkiem, testy przechodzą, a zrzuty mapy i bitwy leżą w `docs/screens/`.

**M1b: bitwa na heksach (po playteście M1).** Plansza z heksów widziana pod skosem, Body na 7 heksach na środku, ludzie chodzą z heksu na heks i otaczają hydrę, bitwa zaczyna się w pauzie. Zasady z M1 (ścinanie, odrost, przypalanie, statusy, combosy) bez zmian.

**M2** (po playteście M1b podzielony na części; najpierw M2b):

- **M2b: podziemia na serio.** Pełny generator z biomami i walidatorem, duża mapa w stylu Songs of Conquest, leże, kapliczki, Spell Caches, zasoby.
- **M2c: mapa do odkrywania.** Przebudowa mapy z M2b pod eksplorację (decyzja Piotra z 2026-10-04, dokumenty Claude „Hydra: eksploracja, biomy i świat” i „Hydra: generator świata (M2c)”). Zakres: pierścienie z pasami skał (§5.1, §9), kręte korytarze i ślepe zaułki z zawartością, biomy pierścieni z wtrąceniami, Thresholds (Draught Crack, Rubble Choke i progi na trzy klasy głów, które są już w grze), Remains, Rich Deposit, Guarded Hoard, landmarki, lokacje z nagrodami, które już działają, i rzadkie miejsca, przeciągi i echa, ruch 6 i wzrok 3, ok. 20 spotkań, modyfikatory Wet Year, Mycelium Bloom i Old Workings w generatorze (na razie włączane parametrem URL), walidator na 1000 seedach, grafika zastępcza i prompty do GPT. Sealed Door i Cinder Bore przyjdą z M5, znaleziska z powierzchni z M4, pamięć rodu z M6.
- **M2a: głowy.** Pozostałe klasy głów i ich combosy, kodeks combosów, doświadczenie i specjalizacje, umiejętności i drzewko talentów (6.9).

**Wygląd mapy (HD).** Gra w rozdzielczości ekranu z pixel artem w podwójnej gęstości i mapa w stylu Songs of Conquest (oba punkty w §13). Najpierw mapa pod osobnym linkiem (`?hd=1`) do porównania z obecną, potem bitwa i interfejs; na koniec HD zostaje jedynym trybem. Grafiki Piotra wchodzą w podwójnej gęstości z tych samych plików w `art/raw/`. (Decyzja Piotra z 2026-10-05.)

**M3: Zakon kontratakuje.** Alert z progami, patrole i posłańcy na mapie, wyprawy, obrona leża, jaja i Broodlingi, Great Burning jako boss aktu.

**M4: powierzchnia.** Passages, Mist, dzień i noc, kapliczki Płomienia (gaszenie, trwała mgła, ponowne rozpalanie przez Zakon), stan Exposed.

**M5: eventy, mini questy i dialogi.** Wszystkie trzy systemy (dialogi z malowanymi portretami i głosem Węża) i pierwsza porcja treści.

**M6: pokolenia.** Ekran pokolenia, mutacje, księga zaklęć rodu, ukryte jajo i wybór przy wymarciu rodu, odblokowania, Księga Rodów, zapis gry. Wiedza o świecie przechodzi na kolejne pokolenia. Ponieważ M6 idzie przed M3, zaczyna w prostej wersji, bez jaj (przyjdą z M3).

**M7 i dalej: finał i szlif.** Szturm na zamek i zwycięstwo, dźwięk, podmiana grafiki, balans, pełne sterowanie dotykowe.

## 16. Otwarte pytania (decyduje Piotr, nie zgadywać)

- Ile kapliczek Płomienia trzeba zgasić, żeby zamek stał się celem (roboczo: wszystkie).
- **Odrost (pomysł Piotra po playteście M1b):** nowe głowy są mniejsze i na początku zadają połowę obrażeń, żeby odrost nie dawał od razu siły. Głowy potem rosną, i dlatego z czasem hydra jest mocna. Do ustalenia: od czego rosną (doświadczenie z walk, błogosławieństwa, czas).
- **Głos Węża w walce:** czy bitwa staje na czas komunikatu jak przy dialogu (§11), czy to krótka kwestia bez pauzy?
- **Zakończenia:** które i jak się do nich dochodzi? Propozycja Claude: obudzić Węża (z Wakers), nastroić pieśń na nowo i zająć miejsce Hushed, pójść za grzybnią poza świat Węża, zgasić Wieczny Płomień.
- **Wiedza o świecie po wymarciu rodu:** przepada razem z rodem (jak mutacje) czy zostaje na stałe (jak odblokowania konta)? Propozycja Claude: zostaje, bo Old Mother Toad pamięta wszystkie pokolenia, a tajemnica ma się składać przez całą grę.
- **Pula głów:** które klasy są w puli od startu, a które trzeba odblokować (odblokowania konta, §12)? Propozycja Claude: sześć pierwszych od startu, a Strangler, Tender i Lantern do odblokowania. Sposób odblokowania do ustalenia.
- **Świat dnia:** jeden seed dziennie, ten sam dla wszystkich graczy, jak w Spelunky. Czy go chcemy i kiedy? Propozycja Claude: później, np. po M5, bo łatwo go dodać.
