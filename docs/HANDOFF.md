# Handoff: stan prac nad Hydrą

Stan na 2026-10-24 (M4 zbudowany na polecanych odpowiedziach i wdrożony, czeka na odpowiedzi i playtest Piotra; M3, M5, M6 i M2a też czekają na playtest). Ten plik streszcza dotychczasową pracę, żeby następna sesja mogła ją podjąć bez czytania całej rozmowy. Źródłem prawdy pozostają `GAME_DESIGN.md` (projekt gry) i `CLAUDE.md` (zasady pracy). Tutaj jest stan na dziś i to, czego w tych plikach nie ma.

- Gra: https://lucid-academy.github.io/hydra/
- Repo: https://github.com/lucid-academy/hydra (na serwerze `/root/Hydra`)

**Na start nowej sesji:** przeczytaj `CLAUDE.md`, ten plik i potrzebne sekcje `GAME_DESIGN.md`. Zrób `git pull` (Piotr może wrzucać pliki przez GitHuba) i sprawdź, czy odpowiedział na pytania z sekcji 4.

## 1. Etap

- Zrobione: **M0, M1, M1b, M2b, M2c, Wygląd mapy (HD), M5, M6, M2a, M3, M4** (sekcja 15 w `GAME_DESIGN.md`).
- **M4** (powierzchnia): plan w dokumencie Claude „Hydra M4: powierzchnia” (https://claude.ai/artifact/Cru1wkA4zam1mXDK5tfarA). Piotr napisał 2026-10-24 „Kontynuuj co możesz samemu, później odpowiem na pytania”, więc etap jest zbudowany na wariancie 1 w pytaniach A–F (`GAME_DESIGN.md` §15, §16), zanim Piotr odpowiedział. Wdrożony 2026-10-24 (PR #18–#20), czeka na odpowiedzi i playtest (opis w sekcji 2). Decyzje trafią do `GAME_DESIGN.md` po odpowiedziach.
- **M3** (Zakon kontratakuje): plan zatwierdzony przez Piotra 2026-10-23 na karcie „Buduj z polecanymi” (dokument Claude „Hydra M3: Zakon kontratakuje”, https://claude.ai/artifact/NeZGXw7XaQeAHkwstVnXvE; decyzje w `GAME_DESIGN.md` §4, §8, §12, §15), zbudowany i wdrożony 2026-10-23/24 (PR #8–#16), czeka na playtest (opis w sekcji 2). Wątek M3 przejął pliki bitwy po M2a.
- **M5** (eventy, mini questy, dialogi) wdrożony 2026-10-21 i czeka na playtest Piotra (opis w sekcji 2).
- **M6** (pokolenia): plan zatwierdzony przez Piotra 2026-10-21 na karcie „Buduj z propozycjami” (dokument Claude „Hydra M6: pokolenia”, https://claude.ai/artifact/FAibVmNwcvBZQBJjLif4LV), zbudowany i wdrożony tego samego dnia, czeka na playtest (opis w sekcji 2).
- **M2a** (głowy i balans bitwy) zbudował osobny wątek projektu Hydra; jest na main od 2026-10-23 (opis w sekcji „M2a” na końcu pliku).
- **M2c** (świat do odkrywania) jest wdrożony 2026-10-04 i czeka na playtest Piotra. Playtest M2b nie przyszedł; M2c zmienił mapę na tyle, że lepiej grać od razu w M2c.
- 2026-10-03 Piotr zmienił sposób pracy: grafika będzie z GPT, animacje najpierw w kodzie. Zasady są już w `CLAUDE.md`. Plan grafiki (sekcja 3.2) Piotr zatwierdził tego samego dnia i potok jest zbudowany. Wieczorem przyszła cała pierwsza partia (21 obrazków) i jest w grze; **czeka na uwagi Piotra**.
- Następny etap: M7 (kolejność Piotra z 2026-10-04, `GAME_DESIGN.md` §15). Każdy zaczyna się od planu i OK Piotra. Projekt 9 głów (M2a) jest zatwierdzony (`GAME_DESIGN.md` §6.4, §6.5, §6.9, §13).
- **Wygląd mapy (HD), od 2026-10-05:** Piotr wybrał na karcie przejście na HD pixel art (`GAME_DESIGN.md` §13, §15). Mapa, bitwa i napisy w HD (opis w sekcji 3.2, „Wygląd mapy w HD”). Mapę Piotr ocenił 2026-10-06: „wygląda naprawdę lepiej”. Od 2026-10-21 HD jest jedynym trybem (etap zakończony); uwagi Piotra do bitwy i napisów wciąż mile widziane.
- **Zmiana kierunku, 2026-10-04:** Hydra to teraz fabularny roguelite z naciskiem na odkrywanie świata, mini questy i kilka zakończeń; bitwy rzadsze, ale ważne (`GAME_DESIGN.md` §1, §2, §4, §15).

## 2. Co zrobione

**M0 (2026-09-30).** Vite + TypeScript + Phaser 4, testy (Vitest), zrzuty ekranu (Playwright), automatyczne wdrożenie z GitHub Actions na GitHub Pages, ekran tytułowy.

**M1 (2026-09-30).** Cała pętla w najcieńszej wersji:
- mapa podziemi z ziarna, trzy stany widoczności, żeton hydry, punkty ruchu, End Turn, Alert (rośnie od odkrywania i bitew), Muck, spotkania uruchamiające bitwę;
- bitwa w stałym kroku 20 tików/s: Body i 3 głowy (Biter, Acid Spitter, Mist Breather) przeciw Man-at-Arms, Headhunterom i Torchbearerom;
- pauza i rozkazy, ścinanie, odrost dwóch głów, przypalanie kikutów, blizny, wygrana, przegrana (Game Over i nowa hydra), powrót na mapę ze zmienionym składem głów;
- statusy Corroded i Soaked, chmury Mist, combosy Corrode & Crush, Acid Fog i Smother (w `src/data/combos.json`).

**M1b (2026-09-30 – 10-01), po playteście M1.**
- Bitwa na planszy 13×9 heksów widzianej pod skosem (jak Into the Breach). Body zajmuje 7 heksów w środku, ludzie chodzą z heksu na heks i otaczają hydrę, zasięgi liczone w heksach.
- Bitwa startuje w pauzie (jak FTL), prędkości 1× i 0,5×, wolniejsze tempo niż w M1. Atak podstawowy głów działa sam.
- Kilka głów naraz: Ctrl/Shift + klik, karty głów, przycisk „All heads", klawisze 1–9 i A. Body idzie na prawy klik albo tapnięcie w wolne pole.

**M2b (2026-10-01 – 10-02): podziemia.**
- Generator: mapa o promieniu 14 (631 heksów), bagno wokół leża i pięć biomów z dokumentu (Flooded Caves, Root Tangle, Fungal Deeps, Old Crypts, Salt Mines). Teren: woda i błoto (1 punkt ruchu), korzenie (2), sól (3), skała (nieprzechodnia). Test sprawdza reguły na 1000 seedach.
- Mapa pod skosem w duchu Songs of Conquest: dekoracje biomów, światła, minimapa, nazwa biomu przy wejściu.
- Kapliczki Wielkiego Węża z błogosławieństwami (przyjmij albo odrzuć), odpoczynek w leżu, zasoby Muck, Moisture i Bones.
- Spotkania w trzech poziomach siły, rosnących z odległością od leża. Plansza bitwy w kolorach biomu, w którym stało spotkanie.
- Przejścia na powierzchnię stoją na mapie, ale są zamknięte do M4.

**M2c (2026-10-04): świat do odkrywania** (`GAME_DESIGN.md` §9, plan w dokumencie Claude „Hydra: generator świata (M2c)”, zatwierdzony kartą „Buduj”).
- Mapa o promieniu 20 (1261 heksów), ruch 6, wzrok 3. Wokół leża trzy nierówne pierścienie oddzielone pasami skały: 1. Flooded Caves i Root Tangle, 2. Old Crypts i Salt Mines, 3. Fungal Deeps, w każdym łaty innych biomów. Generator w `src/sim/map/generator/` (kształt, jaskinie, biomy, zawartość), liczby w `balance.json` (`undergroundGenerator`), progi, miejsca, szczątki, warunki i modyfikatory w nowym `src/data/world.json`.
- Komory (średnio 7, 9,5 i 12 na pierścień), kręte korytarze jedno- i dwuheksowe, pętle, ślepe zaułki zawsze z czymś (szczątki z kwestią, kapliczka, bogate złoże, zapasy pod strażą). Ok. 20 spotkań, siła rośnie z pierścieniem.
- Progi między pierścieniami (2–4 na granicę): Draught Crack (ukryty, zdradza go przeciąg), Rubble Choke (kopanie przez kilka tur), Root Wall [Biter], Salt Plug [Acid Spitter], Smouldering Seam [Mist Breather]. Tapnięcie w znany próg podprowadza hydrę i otwiera panel. Cinder Scar (Cinderkin): w 15% światów jeden dodatkowy, zawsze otwarty próg między 2. a 3. pierścieniem (wariant B, nigdy w pierwszym). Old Workings: szyb Zakonu przy modyfikatorze, z dodatkowymi spotkaniami.
- Miejsca: 5 punktów orientacyjnych (widać je przez skałę z 7 heksów), 6 miejsc w biomach z akcjami (zysk, stan na hydrze, prąd Undertow, wyciszenie bitew, pokazanie ukrytego progu) i 2 rzadkie. Echo miejsca słychać z 4 heksów.
- Modyfikatory runu na razie tylko z URL: `?modifiers=wetYear,myceliumBloom,oldWorkings`. Cały świat: `?reveal=1&zoom=0.45`.
- Walidator: 1000 seedów i każdy modyfikator; świat, który łamie regułę, losuje się od nowa (średnio 1,2 próby, 12 ms na świat).
- Grafika zastępcza w kodzie (`src/assets/worldPlaceholders.ts`), specyfikacja w `docs/ASSETS.md`, 28 promptów w `docs/ART_PROMPTS.md`. Wysoki punkt orientacyjny prześwituje, gdy zasłania hydrę, próg, spotkanie albo kapliczkę.

**M5 (2026-10-21): eventy, mini questy, dialogi** (plan zatwierdzony przez Piotra 2026-10-21; decyzje B i C w `GAME_DESIGN.md` §11).
- Silnik w `src/sim/turn/story.ts`: flagi, warunki (pierścień, biom, flagi, Alert, tura, klasy i liczba głów, co się stało w bitwie, nowi wrogowie), priorytety i `once`, osobny strumień losowania (`story.rngState`). Kwestie mają wyzwalacze: `afterBattle`, `newBiome`, `enemyAhead` (przed bitwą, m.in. pierwszy wróg danego typu), `restInLair` (Old Mother Toad), `serpentOnTheWay` (koniec tury poza leżem, najwyżej co `minTurnsBetween` tur), `serpentInBattle` (jedna kwestia nad bitwą, bez pauzy), `eventOnly`. Mówcy: `toad`, `serpent`, `head:any`, `head:other`, `head:new`, `head:<klasa>`; głowy klas obsadzane najpierw, więc `head:any` nigdy nie jest tą samą głową.
- Treść (Claude, po angielsku, `TODO(design)`): `src/data/dialogues.json` (45 dialogów) i `src/data/events.json` (20 eventów: 12 zwykłych, dwa mini questy po 3 kroki, „The Silent Song” o Hushed i „The Subterranean Survey” o mierniczych Zakonu, oraz zapasowy „A Still Pool”, gdy nic innego nie pasuje). Kroki questu łączą flagi, następny krok ma priorytet 5, trzeci wymaga pierścienia 2 albo 3.
- Miejsca eventów: generator kładzie je w komorach (3, 3 i 2 na pierścień, `eventSites` w `balance.json`), co najmniej 4 kroki od leża i 5 od siebie; który event, losuje się dopiero przy wejściu. Na mapie stoją jako kamień ze spiralą Węża (zastępczy `map_event`), na minimapie turkusowa kropka. Ścieżka je omija, wejście zatrzymuje hydrę.
- Ekran dialogu `src/ui/DialogueScene.ts` (Hades): przyciemniona gra, malowane portrety z `public/portraits/` (kopie z `art/concept/portraits/`, klucze `dialogue_<klasa>` i `dialogue_oldMotherToad`, gładkie skalowanie), Ropucha po prawej, głowy naprzeciw siebie, tekst pisany literami, tapnięcie, odpowiedzi do wyboru. Wąż bez portretu, kursywą, na środku. Mapa pokazuje kolejkę dialogów przed bitwą i po każdym ruchu.
- Panel eventu to panel miejsca: wybory z wymaganą głową, kosztem i „(risky)”, wynik ze skutkami i Continue.
- Do testów: `?say=<id dialogu>` (na mapie pokazuje dialog; z `?scene=battle` kwestię Węża) i `?event=<id eventu>` (event obok hydry). Smoke czyta dialogi i wybiera w eventach.
- **Sealed Door i Cinder Bore** (§9.3, dobudowane 2026-10-21). Sealed Door stoi w każdym świecie na granicy pierścieni 2 i 3 (`oneOnBorder` i `chance` w `world.json`); nie da się go kopać ani otworzyć głową, otwiera go tylko flaga z ostatniego kroku „The Silent Song” (`hushedSongHeard` albo `hushedMaskTaken`), potem mówi Wąż. Cinder Bore: event „The Cinderkin” (pierścienie 2 i 3) za ciepło (stan Warm z Warm Crack) albo 15 Muck wytapia tunel przez najcieńszą skałę w promieniu 10 heksów do sąsiedniego pierścienia (`bore` w `world.json`); przez 3 tury tunel parzy (8 HP Body za wejście na heks, nigdy do śmierci) i świeci na pomarańczowo. Do testów `?flags=` i `?conditions=` (`README.md`).

**M6 (2026-10-21): pokolenia** (plan zatwierdzony przez Piotra 2026-10-21; decyzje w `GAME_DESIGN.md` §9.6, §11, §12, §15).
- Ród w symulacji: `src/sim/lineage/` (czysty TypeScript, testy w `tests/lineage.test.ts`, `tests/mutations.test.ts`, `tests/generations.test.ts`). Profil konta to lista rodów (Księga Rodów), wiedza o świecie (flagi zakresu `world` i miejsca, które ród widział) i odblokowane modyfikatory. Po śmierci zawsze wykluwa się jedna dziedziczka (do M3 bez jaj), dziedziczy losową połowę mutacji matki zaokrągloną w górę, imię z listy w `src/data/lineage.json` (powtórzone dostaje numer: Eulalie II). Seed świata pokolenia wyliczony z seeda rodu i numeru pokolenia (`generationSeed`), więc cały ród da się odtworzyć.
- Flagi mają zakres w `src/data/flags.json`: `life` (zapomniane po śmierci), `lineage` (dziedziczki pamiętają), `world` (zostają na zawsze, także po New Lineage: tajemnice, postęp mini questów). Dialogi `once` są raz na ród. Świat pamięta ród: miejsce potrzebne do rozpoczętego questu pojawia się na pewno, niewidziane miejsca mają większą szansę.
- Mutacje w `src/data/mutations.json` (8, tylko działające na mapie i w statystykach). Dają je eventy (5 wyborów w `events.json`, pole `mutation`) i rzadka kapliczka znamienia (`marks` w `shrines.json`: 40% światów, pierścień 2 albo 3), która zamiast błogosławieństwa daje mutację na cały ród. HUD pokazuje na dole imię, pokolenie i mutacje.
- Zmiana pokolenia: dialogi `newGeneration` (Ropucha wita dziedziczkę, głowy komentują spadek) i `ancestorInSleep` (przodkini mówi przez sen, bez portretu, jak Wąż, w kolorze lawendy). Epitafium zależy od tego, kto zabił (`epitaphs` w `lineage.json`) i nie powtarza się w rodzie, dopóki są inne.
- Ekrany: tytuł (Continue, New Lineage z potwierdzeniem, Book of Lineages; przy pierwszej grze Begin), ekran pokolenia zamiast Game Over (`GenerationScene`: kto zginął, epitafium, co przechodzi, co przepada, odblokowania, imię dziedziczki, Hatch), Księga Rodów (`BookScene`: rody od najnowszego, hydry z epitafiami, potem modyfikatory i wyzwania, które je odblokowują).
- Odblokowania konta: modyfikator runu odblokowuje proste wyzwanie z `world.json` (`unlock`: drugie pokolenie, flaga, pierścień); każde pokolenie losuje jeden z odblokowanych. Na mapie wyskakuje komunikat.
- Zapis gry: `src/save/` (format z numerem wersji, testy w `tests/save.test.ts`), klucze localStorage `hydra.profile.v1` (rody) i `hydra.run.v1` (run żyjącej hydry, cały `RunState`). Run zapisuje się po każdej komendzie (z opóźnieniem 150 ms) i przy ukryciu strony; bitwa przerwana zamknięciem karty zaczyna się od nowa. Zmiana kształtu `RunState` albo profilu wymaga podbicia `RUN_FORMAT` / `PROFILE_FORMAT` w `src/save/format.ts`: stary zapis jest wtedy pomijany (dziedziczka wykluwa się od nowa). Sceną rodu i zapisu zarządza `src/scenes/LineageKeeper.ts`.
- Adresy testowe (`testUrl` w `src/urlParams.ts`) grają w pamięci: nie wczytują ani nie nadpisują zapisu. Nowe parametry: `?ancestors=N` (N martwych przodkiń, każda z jedną mutacją), `?scene=generation`, `?scene=book`, `?near=mark`. Smoke przechodzi przez śmierć, nowe pokolenie, przeładowanie z Continue, New Lineage i Księgę.

**M3 (2026-10-23/24): Zakon kontratakuje** (plan zatwierdzony przez Piotra 2026-10-23, warianty pierwsze w pytaniach A–D, plus „zwykły rok”; decyzje w `GAME_DESIGN.md`).
- Alert z progami 25, 50, 75, 100 (znaczniki na pasku, komunikat przy każdym), liczby w nowym `src/data/order.json`. Bitwa podnosi Alert o 2 (było 5), posłaniec, który dobiegnie do Passage, o 8. Do losowania modyfikatora pokolenia doszedł „zwykły rok”.
- Zakon na mapie (`src/sim/turn/order.ts`, rysuje `src/scenes/mapOrder.ts`, własny strumień losowania `order.rngState`): patrole schodzą przez Passage (pierwszy w 4. turze, częściej z każdym progiem), wędrują między komorami i gonią hydrę, gdy ją zobaczą; gdzie hydra ostatnio widziała jednostkę, zostaje przygaszony ślad „N turns ago”. Po każdej bitwie posłaniec biegnie do najbliższego Passage; wejście na niego to zjedzenie (Bones, Alert −3). Od progu 50 wyprawy idą na leże (co 10 tur); wyprawa w pustym leżu obozuje i co turę zabija Broodlinga albo rozbija jajo. Przy 100 Great Burning: Mistrz Zakonu w lektyce idzie na leże; zjedzony daje jedną z dwóch mutacji tylko od bossa (Fireproof Scales: przypalanie trwa o 50% dłużej; Ash-tongued: szybsza regeneracja, ale Alert rośnie o 15% szybciej) i zaczyna lekki akt 2 (ta sama mapa, Alert od zera, Zakon zaczyna od nowa z bonusem do patroli).
- Leże (`src/sim/turn/lair.ts`, `src/data/brood.json`): panel leża z jajami (koszt 6 Bones i 10 Muck, do 6), wykluwanie na rozkaz w 3 tury na obrońcę albo zwiadowcę (zwiadowca chodzi po mapie i odsłania ją, Zakon go łapie), ukrycie jaja u Old Mother Toad. Hydra zaczyna z 1 jajem. Jajo bierze połowę mutacji matki w chwili zniesienia.
- Śmierć i ród: ekran pokolenia pokazuje jaja z ich mutacjami, gracz wybiera, z którego wykluje się dziedziczka. Bez jaj ród wymiera, chyba że Ropucha ma ukryte (Miraculous Intervention); można też zakończyć ród. `PROFILE_FORMAT` 2 (stare profile przechodzą same), `RUN_FORMAT` 5.
- Bitwa (`src/sim/battle/`): obrona leża z Broodlingami walczącymi obok hydry (ile przeżyje, tyle wraca do leża; przegrana rozbija połowę jaj). Nowi ludzie od progu 75: Crossbowman (strzela z 4 heksów, 10 bełtów, w Mist widzi tylko obok siebie), Tithe Collector (podchodzi, liczy 4 s i ucieka krawędzią; jeśli ucieknie, zabiera 10% zasobów i zostawia pokwitowanie), Knight (pancerz 4, szarża: szybsze kroki i pierwszy cios ×2, nie zna strachu), Master of the Order (boss z paskiem HP, przypala kikuty, odporny na strach i światła Lanterna). Grupy tylko dla Zakonu: crossbowLine, titheVisit, knightsVigil, greatBurning.
- Doświadczenie i poziomy głów (`heads.json` „experience”, `src/sim/turn/experience.ts`): każda głowa żywa po wygranej bitwie dostaje 10, za każdego zabitego albo zjedzonego człowieka 5 więcej; poziomy 2–5 przy 20, 50, 90, 140; każdy poziom to +10% max HP i +10% obrażeń. Karta głowy w bitwie pokazuje „Lv N”, mapa ogłasza awans. Specjalizacje z poziomów 3 i 5 czekają na drzewko talentów.
- Treść: kwestie głów przy pierwszym spotkaniu każdego nowego typu (przy Mistrzu odzywa się Wąż), komunikaty Zakonu, prompty do GPT na 11 nowych grafik (`docs/ART_PROMPTS.md`, sekcja „M3”), `docs/ASSETS.md` i `docs/ANIMATIONS.md`.
- Do testów: `?scene=map&alert=55`, `?scene=map&units=patrol,messenger`, `?scene=generation&ancestors=2&eggs=0&hidden=1`, `?scene=battle&group=greatBurning&allies=2`, `?scene=battle&level=3` (`README.md`).
- `npm run balance:runs`: bot gra 50 całych runów i zapisuje do `docs/BALANCE_RUNS.md`, kiedy Alert mija progi i ile heksów hydra zna przy pierwszej wyprawie.

**M4 (2026-10-24): powierzchnia** (zbudowana na wariancie 1 pytań A–F, zanim Piotr odpowiedział; liczby w `src/data/surface.json` z `TODO(design)`).
- Druga mapa nad podziemiami, tej samej wielkości (`src/sim/map/generateSurface.ts`, stan w `state.surface`, warstwa w `hydra.layer`; heksy przez `tileOn`, `mapOf`, `visibilityOf`). Każdy Passage ma swój heks na obu mapach. Zamek z katedrą na wzgórzu po drugiej stronie niż pierwszy Passage, 5 kapliczek Płomienia (siła straży rośnie bliżej zamku), 2 obozy, 3 wsie, młyn, 2 wieże, las, wzgórza, skałki i rzeka; znaleziska (jedno pokazuje ukryty próg w podziemiach) i 2 miejsca eventów. Walidator na 1000 seedach w `tests/surface.test.ts`.
- Passage: przycisk Climb up / Go down w panelu (1 punkt ruchu); każda warstwa ma własną widoczność. Zamek i płonące kapliczki widać z daleka (od początku są „remembered”, `seenFromAfar` w danych, do decyzji Piotra).
- Mist: hydra chodzi tylko po mgle; krok na goły heks wydmuchuje mgłę przed nią za 2 Moisture (A1), Exhale Mist (przycisk i klawisz M) za 3 Moisture kryje jej heks i sąsiednie (Mist Breather: promień 2) na 3 tury. Mgła zanika o 1 turę za dzień, 0,5 w nocy, szybciej przy wietrze (1 dzień na 4) i w roku Drought, wolniej nad rzeką; kapłani z kadzielnicami rozwiewają ją wokół siebie. Na starcie mgła wokół każdego Passage (promień 2, 4 tury), na samym Passage na stałe. Bez mgły i Moisture hydra pełznie 1 heks na turę (B1).
- Dzień i noc: 6 tur dnia, 4 nocy; w nocy wzrok hydry i Zakonu −1, mapa sinieje. Exposed (bez mgły na koniec tury): −15 HP tułowia (nie niżej niż 1), bez leczenia, Alert +2; bitwa Exposed bez mgły i z głowami −20% obrażeń, bitwa we mgle z 3 chmurami przy tułowiu.
- Kapliczki Płomienia: bitwa ze strażą, wygrana gasi kapliczkę: Alert −10, trwała mgła w promieniu 2, mutacja z pierwszego płomienia (Smoke-cured albo Ember-eyed), z kolejnych szansa 1 na 4, flaga `putOutFlame` (odblokowuje rok Drought). Po 6 turach z obozu albo zamku idą Torchbearerzy (ruch 3); jeśli dojdą, kapliczka płonie (Alert +5), a trwała mgła zaczyna zanikać. Zamek zamknięty do M7 (C1).
- Zakon na powierzchni: patrole z zamku i obozów (2–4 naraz według progów Alertu, pierwszy 3 tury po pierwszym wyjściu, potem co 4 tury, ruch 4) chodzą i gonią hydrę; we mgle widzą ją z 1 heksu, bez mgły z 3. W podziemiach Zakon dalej przychodzi przez Passages i szyb (D1).
- Bitwa (`src/sim/battle/`): Censer Priest co 6 s macha kadzielnicą 1,5 s (przerywa to strach, ogłuszenie, chwyt, trans i urok, Banshee Wail rozbija kadzielnicę): w promieniu 2 rozwiewa chmury Mist, zdejmuje statusy z ludzi poza Seized i daje im +25% obrażeń na 5 s. Brazier Bearer stawia 2 kosze żarowe: suszą heksy w promieniu 1 (tułów 1,5× wolniej) i rozpraszają mgłę w promieniu 2; gaszą je Douse, Eat Fire i rzut Stranglera. Obaj od początku na powierzchni, w podziemiach od progu 75 (E1). Wsie, młyny i wieże są tylko widokami, bez najazdów i jeńców (F1).
- Treść: 4 eventy na powierzchni (strach na wróble Zakonu, studnia, pielgrzymi, puste pole), kwestie przy pierwszym wyjściu, słońcu, Exposed, zgaszonej i znów zapalonej kapliczce, nowych ludziach, epitafia. Prompty do GPT na 19 grafik powierzchni (`docs/ART_PROMPTS.md`, sekcja „M4”), `docs/ASSETS.md` i `docs/ANIMATIONS.md`; na razie wszystko rysowane w kodzie (`src/assets/surfacePlaceholders.ts`).
- Bot runów (`npm run balance:runs`) wychodzi na górę od 20. tury i gasi kapliczki: w medianie 2 na run, wszystkie 5 w 6% runów, Zakon zapala z powrotem 1,7. Smoke wchodzi na Passage, wychodzi na górę i wraca, wydycha mgłę i gasi kapliczkę.
- Do testów: `?scene=map&surface=1` (na pierwszym Passage), `&near=flameShrine` (też `castle`, `village`, `camp`...), `&exposed=1`, `&night=1`, `?scene=battle&surface=1&group=shrineVigil`. `RUN_FORMAT` 6.

**Narzędzia.** `npm run smoke` gra sama jak gracz: mapa, bitwy, śmierć i nowe pokolenie, powierzchnia, zapis i Continue, kapliczki; z `-- phone` na ekranie telefonu. `npm run balance` rozgrywa setki automatycznych bitew, wynik w `docs/BALANCE.md`; `npm run balance:runs` gra całe runy na mapie, wynik w `docs/BALANCE_RUNS.md`. `npm run shots` robi zrzuty do `docs/screens/`. `npm run art` wstawia do gry obrazki z `art/raw/` (opis w `docs/ASSETS.md`). Parametry URL są w `README.md`.

**Zasady pracy (2026-10-03).** Nowe sekcje w `CLAUDE.md`: Notatki decyzji, Grafika z GPT, Animacje, Sekrety. Cała historia repo przejrzana: nie ma w niej kluczy, haseł ani tokenów.

## 3. Ustalenia spoza GAME_DESIGN.md

### 3.1 Sposób pracy

- Od 2026-10-03 projekt gry i budowa są w jednym projekcie Hydra w aplikacji Claude (wcześniej projekt gry był osobno, a budowa w Claude Code na serwerze). Zatwierdzone decyzje od razu do `GAME_DESIGN.md` (jeden commit, pokazać, co zmienione), budowa dopiero w swoim etapie. Gdy decyzja przeczy kodowi albo dokumentowi: pytać.
- Szczegóły w `CLAUDE.md`.

### 3.2 Grafika i animacje: plan z 2026-10-03, zatwierdzony

**Zrobione 2026-10-03 (w projekcie Hydra w aplikacji Claude):** prompty (`docs/ART_PROMPTS.md`, punkt 6), skrypt `npm run art` (punkty 2, 3 i 9; `scripts/artImport.ts`), cięcie heksów z tekstur przy starcie gry (punkt 5; `src/assets/terrain.ts`), żuchwa jako osobny obrazek pod głową (bez kłapania), `docs/ANIMATIONS.md` (punkt 8) i `.gitignore` (punkt 10). Kąt 45° i portret 128×160 przyjęte jak w planie. Cały proces sprawdzony na sztucznych obrazkach: import, gra, zrzuty, smoke. Zostało: paleta z okładki (punkt 4, gdy przyjdzie okładka).

**Pierwsza partia, 2026-10-03 wieczorem:** Piotr zrobił od razu wszystkie 21 obrazków (12 tekstur gruntu, 6 skał, tułów, głowa z żuchwą, portret) w Codexie (generator obrazków GPT) i wrzucił je do `art/raw/` razem ze swoimi promptami (`art/raw/generation-*.txt`). Import przeszedł bez ostrzeżeń. Po zrzutach:
- głowa powiększona z 20×14 do 36×18 (żuchwa 36×9): GPT narysował ją w ok. 43×21 własnych pikseli i przy 20 px zostawał szum;
- `JAW_OVERLAP` 3 (zęby się zazębiają, pysk zamknięty), `BODY_FOOT` bez zmian;
- szyje w kolorach tułowia (obrys #030b0b, wypełnienie #486a33);
- kłapanie żuchwą przy ataku i odrzut głowy przy trafieniu (punkt 8, `docs/ANIMATIONS.md`).
Portret jest w grze, ale żadna scena go jeszcze nie pokazuje (dialogi przyjdą z późniejszym etapem).

**Nowy kierunek, 2026-10-04:** Piotr uznał pierwszą głowę za komiczną i zbyt smoczą. Wzorem stylu jest jego okładka (przysłana w projekcie Hydra, jeszcze nie w repo) i Hades: głowy mroczne, wężowe, humor tylko w kwestiach (`GAME_DESIGN.md` §13). Kolejność: najpierw malowane portrety głów do dialogów, potem na ich podstawie pixelowe głowy do bitwy. Prompty portretów są w dokumencie z projektem 9 głów (dokument Claude w projekcie). Na kartach decyzji Piotr wybrał malowane portrety w samej grze, dla wszystkich postaci w dialogach, więc w M5 (dialogi) trzeba:
- warstwę dialogów rysowaną w rozdzielczości ekranu, nad płótnem 640×360;
- regułę importu dla malowanych portretów: wycięcie tła bez zmniejszania i bez palety, wpisy w manifeście i `docs/ASSETS.md`.

Do tego czasu malowane portrety leżą w `art/concept/`, bo `npm run art` odrzuca w `art/raw/` pliki spoza manifestu. Pixelowy portret Old Mother Toad (`portrait_oldMotherToad`, 128×160) zostaje w grze do M5, potem zastąpi go malowany. Body też będzie przerobione w tym stylu, po głowach.

**Malowane portrety, 2026-10-04:** Piotr przysłał arkusz z 9 głowami i Old Mother Toad (GPT). Oryginał i wycięte portrety są w `art/concept/portraits/` (opis w `art/concept/README.md`); na jego prośbę języki w pięciu głowach są skrócone. Z portretów powstało demo dialogu poza grą (strona Artifact w projekcie Hydra): 1–4 portrety naraz, głowy po prawej stronie odbite lustrzanie w kodzie, bez osobnych grafik. Kopia demo leży w repo jako statyczna strona `public/dialogue-demo/` (https://lucid-academy.github.io/hydra/dialogue-demo/), żeby Piotr mógł ją wysyłać znajomym; to nie jest część gry i po M5 można ją usunąć. Wniosek na M5: arkusz daje ok. 350 px na głowę, za mało na portret w rozdzielczości ekranu, więc docelowe portrety lepiej generować pojedynczo, w większym rozmiarze i z krótszym językiem w prompcie.

**Pixelowe głowy i nowy tułów, 2026-10-04 wieczorem:** Piotr zapytał, jak przerobić głowy na pixel art i jaki ma być tułów („potężny, pasujący do okładki i do głów”). Plan wysłany w wątku: tułów, szyje i głowy z jednej skóry, tej z okładki. Tułów jako pierwszy, z okładką jako wzorem: kopiec grubych splotów, większy niż dziś (ok. 144×128 zamiast 132×110), wyższy, z szyjami wychodzącymi ze szczytu. Szyje dalej w kodzie, ale grubsze i w kolorach tułowia (brązowy grzbiet, kremowy pas brzucha). Głowy z portretów: GPT dostaje portret danej głowy i gotowy pixelowy tułów, rysuje profil pyskiem w prawo, głowę i żuchwę osobno; każda klasa ma własny obrazek bez barwienia (§13). Najpierw próba na dwóch obrazkach (tułów i Biter), przy niej propozycja palety z okładki, potem pozostałe osiem głów. Prompty na próbę: `docs/ART_PROMPTS.md`, sekcja „Hydra w bitwie”. W manifeście są już miejsca `battle_head_biter` i `battle_head_biter_jaw` (puste, gra ich jeszcze nie używa), a import rozdziela takie obrazki jak `battle_head`, ale bez szarości. Do zrobienia przy imporcie: scena bitwy bierze głowę klasy, gdy ta ma plik (inaczej barwiona `battle_head`), zawias żuchwy liczony osobno dla każdej żuchwy, nowy rozmiar tułowia i `BODY_FOOT`, podstawy szyj, kolory i grubość szyj, oddech tułowia, zasłanianie ludzi stojących za wyższym tułowiem. Kolor hydry: Piotr wybrał na karcie brąz z okładki (świat zostaje zimny), wpisane do `GAME_DESIGN.md` §13.

**Próba hydry i Zakonu w grze, 2026-10-06:** Piotr wrzucił przez GitHuba pięć obrazków: nowy tułów (nadpisał `art/raw/battle_body.png`; stary jest w historii repo), głowę Bitera, Man-at-Arms w bitwie, oddział na mapie (`map_enemy_manAtArms.png`, w `art/aliases.json` jako `map_encounter_1`) i hydrę na mapie. Tła wycięły się czysto. Zrobione:
- Tułów 144×110 z `BODY_FOOT` (72, 70). GPT narysował sploty szersze niż w prompcie (ok. 4:3), więc tułów jest niższy niż planowane 144×128.
- Szyje wychodzą z owalu wokół korony splotów (`NECK_RING` w `src/assets/battleArt.ts`), są grubsze i w brązie tułowia, z kremowym pasem brzucha po stronie, w którą patrzy głowa.
- Bitwa bierze głowę klasy, gdy ta ma obrazek (na razie Biter); pozostałe klasy dalej mają szarą głowę barwioną kolorem klasy. Zawias żuchwy liczony osobno dla każdej żuchwy, w jednostkach ekranu (w HD wcześniej wychodził w pikselach obrazka, dwa razy za daleko). Żuchwa Bitera zachodzi na głowę o 11 zamiast 3 (`JAW_OVERLAP_BY_CLASS`), bo pod pyskiem wisi mech.
- Mapa: hydra rysowana nad wszystkim na swoim heksie (przedni brzeg sadzawki leża zasłaniał jej sploty), a poświata leża leży pod nią, więc hydra zachowuje swoje kolory. Oddział pierwszego stopnia ma obrazek (22×36, wąski jak u GPT); silniejsze oddziały, Headhunter i Torchbearer dalej rysowane w kodzie.
Nie zrobione z planu próby: oddech tułowia.

**Paleta, 2026-10-06:** propozycja ze stroną porównania (https://claude.ai/artifact/4LEtNHLCxqqR2qd2Mn5s9P): 32 kolory z okładki (k-means w Lab, ważony nasyceniem, żeby złoto i oczy dostały własne kolory), 9 kolorów klas z §13 i 16 kolorów z naszych grafik. Sama okładka to ciepły zachód słońca, więc robiła podziemia brązowoszare, a rycerzom brała czerwone płaszcze; pełniejsza paleta zostawiała mapę prawie bez zmian, ale zdejmowała z głów kolory klas (próba na portretach: Strangler bez fioletu, Lantern bez niebieskiego). Piotr wybrał na karcie „Bez palety” (`GAME_DESIGN.md` §13): `art/palette.json` nie ma, kolory zostają jak z GPT. Do palety wracamy, gdy będą narysowane wszystkie głowy i Zakon.

**Pierwsze grafiki mapy, 2026-10-05:** Piotr wrzucił przez GitHuba 24 obrazki mapy (12 dekoracji, 11 miejsc, leże) i głowę The Spare. Przyszły pod jego nazwami (`decor_*`, `landmark_*`, `site_*`, `map_lairSwamp_lair`), więc import czyta listę `art/aliases.json` (nazwa pliku → klucz), a pliki zostają, jakie są. Wycinanie tła zmienione: fiolet w postaci zostaje (grzyby, Mother Cap, grzybnia, Silent Bell znikały razem z magentą), znika tylko wyraźna magenta, magenta w cieniu i miękka krawędź (piksele, które są mieszanką tła i koloru postaci obok, oraz czerwonawa magenta przy ciepłych postaciach). Stare obrazki dają po imporcie to samo, poza przesunięciem siatki o piksel w portrecie Ropuchy. Brakuje jeszcze: `map_place_lostSurvey`, `map_place_hushedStair`, progi, kapliczka, Muck i źródła, szczątki, skarb. Głowa The Spare (zielona, komiczna, bez ślepego oka) przeczy §13 i portretowi; jest zaimportowana do swojego miejsca w manifeście, ale gra jej nie pokazuje (głowy klas wejdą z próbą Bitera); pytanie do Piotra na karcie.

**Reszta grafik mapy, 2026-10-05 wieczorem:** Piotr wrzucił ostatnie 20 obrazków mapy (progi zamknięte i otwarte, kapliczka, Muck i źródła w dwóch wersjach, szczątki, skarb, Lost Survey, Hushed Stair). 19 z nich trafiło przez GitHuba do głównego folderu repo zamiast do `art/raw/`; przeniesione `git mv`, treść bez zmian. Nazwy to klucze z manifestu, więc bez aliasów. Dubli nie było. Tym samym na mapie są już wszystkie 44 obrazki z `docs/ART_PROMPTS.md`; w kodzie rysowane zostają: hydra, oddziały Zakonu, przejście, znaczniki zasięgu, brzeg mgły, poświaty, przeciągi i echa. Piotr ocenił, że mapa jest nieczytelna, rzeczy zlewają się z terenem, a heksy są brzydkie (chciałby efekt jak w Songs of Conquest); diagnoza i pytanie o przejście na HD pixel art są w wątku „Repo i potok grafiki”.

**Wygląd mapy w HD, 2026-10-05:** Piotr wybrał HD (karta o 21:07 UTC; decyzja w `GAME_DESIGN.md` §13 i §15, commit b6a2308). Kolejność z karty: najpierw mapa w HD pod osobnym linkiem do porównania z obecną, potem bitwa i interfejs, potem HD jako jedyny tryb (wtedy usunąć klasyczną ścieżkę i obrazki 1×). Zrobione:
- `?hd=1` (commit 171f778): płótno w pikselach ekranu (`src/scaling.ts`, `fitCanvas`), sceny dalej układane na ekranie 640×360, kamery powiększają (`src/scenes/view.ts`), tekst ostry, `npm run art` robi drugą kopię obrazków z podwójną liczbą pikseli w `public/images-hd/`.
- Ziemia mapy malowana jako jedna powierzchnia (`src/assets/groundPainter.ts`, czysty TypeScript z testami; na ekran wystawia ją `src/scenes/mapGround.ts`): bez siatki i szwów, granice terenów lekko błądzą, skała wznosi się jedną bryłą z klifami (jasny lewy, ciemny prawy) i rzuca cień w prawo w dół, brzegi wody, tekstury uspokojone. Malowane są tylko znane heksy, po kawałku, gdy hydra odkrywa. Skała przy otwartym terenie ma własne obrazki sortowane z resztą, więc klif zasłania to, co stoi za nim; prześwituje, gdy zasłania hydrę, spotkanie, kapliczkę albo zamknięty próg.
- Ciemność `visibility` (nie mist): miękka warstwa, poza zasięgiem wzroku przyciemniona, nieznane czarne, krawędź rozmyta.
- Zasięg ruchu jedną zaokrągloną linią z poświatą (`src/scenes/hexOutline.ts`) zamiast obrysu każdego heksa. Linia leży na ziemi, więc skała przed nią ją zasłania; słaba kopia nad wszystkim, co stoi, pokazuje tam jej kształt. Na komputerze kropki prowadzą do heksu pod myszką.
- Miękkie cienie pod rzeczami i hydrą; światło (`src/scenes/mapLight.ts`): jaśniej wokół hydry i wszystkiego, co świeci, w kolorze światła, trochę ciemniej gdzie indziej.
Ruch w HD kosztuje do ok. 0,1 s malowania na serwerze testowym (zmierzone, zanim ciemność zaczęła się liczyć tylko wokół zmian); pierwsze wejście na mapę ok. 0,4 s.

**Bitwa w HD, 2026-10-06** (pod `?hd=1`, ten sam układ co dotąd):
- Plansza malowana raz, na starcie bitwy, jako jeden obrazek z tekstury gruntu i skały (`paintBoard` w `src/assets/terrain.ts`, z testami): bez szwów między heksami, ścianki tylko na przednim brzegu. Pola czytelne dzięki słabej siatce (`hexEdges` w `src/scenes/hexOutline.ts`). Bez tekstury gruntu plansza zostaje z kafli.
- Zasięg zaznaczonych głów jedną zaokrągloną linią (z polami pod tułowiem, więc bez linii wokół niego); cele, rozkazy i cel ruchu tułowia jako zaokrąglone obwódki pojedynczych heksów.
- Miękkie cienie pod ludźmi i wokół podstawy tułowia.
- Światło (`MapLight`, jak na mapie): środek planszy trochę jaśniejszy, płonąca pochodnia świeci pomarańczowo i migocze (z miejsca płomienia, `TORCH_FLAME` w `src/assets/battleArt.ts`), chmura Acid Fog lekko świeci. Kolor pochodni to `order.orange`: blady `order.fire` na turkusowym gruncie wychodził zielony.
- Mist jako miękkie plamy na ziemi i miękkie kłęby nad nią (rysowany `battle_mist_puff` ma pierwszeństwo, jeśli kiedyś powstanie).

**Napisy w HD, 2026-10-06** (krój „Księga”, `GAME_DESIGN.md` §13, pod `?hd=1`):
- Trzy kroje na licencji OFL w `public/fonts/`: pliki TTF z Google Fonts bez zmian (razem ok. 0,65 MB), licencje obok, źródła w `CREDITS.md`. IM Fell English SC na tytuły, nazwy i okrzyki w bitwie, Alegreya (z kursywą) na dłuższe teksty, Alegreya Sans na resztę.
- Role krojów są w `src/ui/fonts.ts` (`FONT.title`, `story`, `text`, `callout`): sceny wybierają rolę, nie krój. `BootScene` uruchamia pierwszą scenę dopiero po wczytaniu krojów, bo napis w Phaserze zostaje przy kroju, z którym powstał. Jeśli plik się nie wczyta, gra pisze krojami przeglądarki.
- Alegreya Sans ma wąskie spacje i cyfry nautyczne (różnej wysokości), więc napisy na kartach głów i przycisk „All heads” są o punkt większe. Panel kapliczki układa napisy na środku nad przyciskami, które stoją tam gdzie dotąd (test dymny klika w ich miejsce).

**HD jedynym trybem, 2026-10-21** (commit 95f6773): Piotr wrócił po dwóch tygodniach („kontynuuj”), uwag do bitwy i napisów nie przysłał, więc etap domknięty zgodnie z kartą. Usunięte: tryb klasyczny 640×360, parametr `?hd=1`, kafle mapy i brzeg mgły, znaczniki heksów w bitwie, kroje przeglądarki. `public/images/` ma teraz obrazki 2× (dawne `public/images-hd/`), `npm run art` robi tylko je. Klucze `map_ground_…`, `map_rock_…`, `map_mark`, `map_fog_edge`, `battle_hex_mark`, `battle_hex_fill`, `battle_shadow` zostały w manifeście, ale gra ich nie rysuje (kafle bitwy zostają jako zapas dla gruntu bez tekstury). Smoke test czeka na scenę do 45 s, bo plansza na telefonie (3 piksele urządzenia na piksel) w programowym WebGL maluje się długo.

**Mapa po powrocie Piotra, 2026-10-21** (prośba z wątku „Następny etap gry”: lokacje za duże i słabo wtopione, hydra ma się ruszać, sterowanie jak w Heroes):
- Punkty orientacyjne zmniejszone do ok. 0,72× (wysokość 46 zamiast 64), miejsca biomów do ok. 0,8×; nowe rozmiary w manifeście i `docs/ASSETS.md`, obrazki zrobione na nowo z tych samych plików w `art/raw/`. Poświaty miejsc (`PLACE_GLOWS`) przesunięte i zmniejszone razem z nimi.
- Miejsca stoją na szerszej, słabej plamie cienia (`PLACE_FOOTING`), a wszystko, co stoi w zasięgu wzroku, ma lekko przygaszone, chłodne światło (`AMBIENT_TINT`); hydra zostaje w swoich kolorach.
- Hydra przy każdym kroku kołysze się na boki i lekko rozciąga (`SLITHER`).
- Mysz jak w Heroes: pierwszy klik pokazuje drogę (także na kilka tur: jasne kropki na tę turę, blade na następne, liczba tur przy pierścieniu), drugi klik na ten sam heks rusza, a hydra idzie tak daleko, jak pozwala tura; plan zostaje na następne tury. Dotyk bez zmian: tapnięcie w zasięgu od razu idzie, tapnięcie dalej planuje podróż. Logika w `plannedJourney` (`src/sim/turn/run.ts`, z testami). Test dymny na komputerze klika dwa razy, na telefonie gra dotykiem.

Plan:

1. **Kąt kamery:** widok 3/4 z góry, kamera ok. 45° nad ziemią, światło z lewej góry. Tak już są narysowane plansza bitwy i mapa (heksy spłaszczone do ok. 0,7 wysokości), więc nic do przebudowy. Portrety i ekran tytułowy to osobne ujęcia, na wprost.
2. **Skrypt `npm run art`** (biblioteka sharp, tylko jako narzędzie, do gry nie trafia):
   - wycina magentę z tolerancją, bo GPT nie trzyma idealnego koloru;
   - przycina i zmniejsza bez wygładzania: każdy piksel bierze najczęstszy kolor ze swojego bloku;
   - zapisuje plik w `public/images/` z wpisem `file` w manifeście; kolory sprowadza do palety tylko wtedy, gdy jest `art/palette.json` (na razie jej nie ma, punkt 4).
   - Rozmiary bierze z manifestu (te same liczby co w `docs/ASSETS.md`). `art/raw/` tylko czyta.
3. **Nazwy plików** w `art/raw/` to klucze z manifestu (np. `battle_body.png`). Kilka części na jednym obrazku (np. głowa i żuchwa) skrypt rozdziela po plamach na magencie.
4. **Paleta:** na razie bez: kolory zostają jak z GPT (decyzja Piotra z 2026-10-06, `GAME_DESIGN.md` §13). Gdy do niej wrócimy (po wszystkich głowach i Zakonie), potrzebne są rampy dla każdego koloru klasy i dla zimnych kolorów podziemi, a nie same kolory okładki. Skrypt nakłada paletę z `art/palette.json`; surowe pliki zostają, więc import da się powtórzyć.
5. **Teren z tekstur:**
   - tekstury są rysowane prosto z góry, skrypt spłaszcza je do kąta kamery;
   - gra przy starcie wycina z nich heksy z obwódką i ścianką, raz, a nie maską na żywo (wydajność na telefonie);
   - sąsiednie heksy biorą różne fragmenty tekstury, żeby nie było widać powtórzeń;
   - skała ma jedną teksturę na wierzch i ściany (ściany ciemniej);
   - bez tekstury zostaje grafika zastępcza.
6. **`docs/ART_PROMPTS.md`:**
   - stały blok stylu i prompty po angielsku;
   - 12 tekstur gruntu (6 biomów × 2 rodzaje) i 6 tekstur skał;
   - tułów hydry i głowa z osobną żuchwą (do kłapania w kodzie);
   - portret Old Mother Toad (popiersie 128×160).

   Każdy prompt w osobnym bloku do skopiowania. Test sprawdza, że wszystkie zaczynają się od tego samego bloku stylu.
7. **Pierwsza partia od Piotra: 5 obrazków** (bagno leża: woda, błoto, skała; tułów; głowa), żeby sprawdzić cały proces, zanim zrobi resztę.
8. **`docs/ANIMATIONS.md`** dla hydry, głów, szyj, trzech typów ludzi i mapy. Nowe animacje w kodzie (kłapanie, odrzut) dopiero z grafiką hydry, żeby nie robić ich dwa razy.
9. **Klatki:** skrypt obsłuży sprite sheety i osobne klatki PNG, ze wspólnym przycięciem wszystkich klatek, żeby postać nie skakała. PixelLab sprawdzić dopiero przy animacjach rycerzy, nic nie instalować ani nie kupować.
10. **`.gitignore`:** pliki z sekretami (`.env` itp.).

### 3.3 Decyzje robocze w grze

Podjęte przy budowie, nie ma ich w `GAME_DESIGN.md`. Liczby leżą w `src/data/` z dopiskiem `TODO(design)` i Piotr może je zmieniać.

- Bagno wokół leża (Lair Swamp) to osobny, szósty biom; dokument wymienia pięć.
- M2c: teksty miejsc, progów, szczątków, ech i modyfikatorów napisał Claude, robocze (`src/data/world.json`). Akcje miejsc i ich liczby też robocze: np. Brine Lake daje Moisture i stan Salted (−1 ruchu na 3 tury), Undertow niesie hydrę wzdłuż prądu, Silent Bell wycisza Alert z bitew w promieniu 3, Mycelium Whisper na 4 tury pokazuje wszystkie spotkania.
- M2c: Rubble Choke kopie się 1–2 tury (kopanie zabiera resztę ruchu w turze). Old Crypts nie ma jeszcze miejsca w biomie (pula pusta), jego łaty dostają szczątki.
- Podziemne kapliczki to kapliczki Wielkiego Węża (pomysł fabularny z §16). Każda daje całej hydrze jedno błogosławieństwo (ruch, wzrok, HP Body, regeneracja, Alert, Muck/Moisture), które można przyjąć albo odrzucić. 6 błogosławieństw w `src/data/shrines.json`, teksty napisał Claude, robocze.
- Odpoczynek: End Turn na heksie leża leczy w pełni, a z każdej blizny wyrastają 2 nowe głowy (do limitu 9). Poza leżem leczenie 12 HP Body i 4 HP każdej głowy na turę.
- Bones: 2 za każdego pokonanego człowieka (uproszczenie, zanim pojawią się jeńcy). Moisture ze źródeł, Muck ze złóż.
- Spotkania: poziom siły 1, 2 albo 3 według odległości od leża (poziom 2 od 7 heksów, poziom 3 od 11). W Salt Mines spotkań jest więcej (×1,5), w Old Crypts ×1,2. Najsilniejsza grupa to Pyre Procession.
- Bitwa: plansza 13×9 heksów, Body 200 HP, odrost 8 s.
- Wrogowie atakują najpierw głowę obok siebie (tę, która ich gryzie, potem najsłabszą), a jeśli takiej nie ma, Body. Headhunter bije tylko głowy, dopóki jakaś żyje. Torchbearer podchodzi do kikuta i go przypala.
- Biter (atak wręcz) sięga szyją aż na heks celu.

### 3.4 Technika i środowisko

- Repo nazywało się „Hydra". 2026-09-30 zmieniono nazwę na „hydra" i stary adres gry z `/Hydra/` nie działa.
- Claude Code działa na małym serwerze VPS (2 GB RAM) przez Remote Control, w sesji tmux. Piotr pisze z telefonu, okno nie musi być otwarte. Sesja startuje w katalogu innego projektu, więc `CLAUDE.md` Hydry nie wczytuje się sam.
- Na serwerze działają też inne projekty: nie ruszać ich.
- Sesje czasem się zrywają (połączenie z API), dlatego commitować małymi krokami. Nigdy `git checkout` na niezacommitowanym pliku: raz cofnęło to nowy generator.
- Wysyłanie plików z sesji na telefon nie działa („session is not on a project thread"). Obrazki do obejrzenia wrzucać do `docs/` i dawać link do GitHuba.
- Konektory w Claude (Gmail, Kalendarz, Dysk, Claude Docs) czekają na autoryzację przez Piotra w ustawieniach claude.ai. Do tego czasu są niedostępne.
- Sprawdzenie wdrożenia: nazwa pliku `assets/index-*.js` na stronie gry ma się zgadzać z lokalnym `dist/assets/`. Wdrożenie trwa ok. minuty.
- Haki testowe `window.__hydra` (gotowe sceny, podsumowanie bitwy i runu, heksy w zasięgu, `mapBusy`: czy mapa jeszcze pokazuje ruch) czytają `smoke` i `shots`. Po tapnięciu na mapie czekają na koniec ruchu przez `mapBusy`, a nie stały czas: w HD na wolnym serwerze ruch z przesunięciem widoku trwa ponad sekundę i tapnięcia trafiały w przesuwającą się mapę.
- Pułapki Phasera 4:
  - tekstura z płótna o boku będącym potęgą dwójki dostaje przy każdym `refresh()` powtarzanie, a wtedy na jej brzegu widać cienką linię przeciwnego brzegu; dlatego kawałki ziemi mają 250 px, a arkusze skał 1000 px;
  - `ScaleManager` przy zoomie 1 nie ustawia rozmiaru płótna w CSS, a `CameraManager` przy zmianie rozmiaru dopasowuje tylko kamery domyślnego rozmiaru (stąd `fitScreenCamera` i ręczne CSS w `src/main.ts`);
  - `renderer.addBlendMode` w 4.2.1 zwraca numer o jeden za mały; numer nowego trybu to długość `renderer.blendModes` sprzed dodania (`src/scenes/mapLight.ts`);
  - zdarzenia klawiszy z kolejki wracają w tej samej klatce, dlatego używać `onKeyDown` z `src/ui/keys.ts`;
  - interaktywne obiekty w przebudowywanym kontenerze czasem nie łapią tapnięć (dlatego karty głów są zwykłymi obiektami);
  - nie kłaść interaktywnych pasków pod przyciskami.

## 4. Otwarte pytania

**Czekają na Piotra:**
000. Odpowiedzi na pytania M4 A–F (`GAME_DESIGN.md` §16; gra działa na wariancie 1) i playtest powierzchni. Do tego pytania z budowy: czy zamek i płonące kapliczki mają być widoczne z daleka (zbudowane tak, bo inaczej gracz szuka ich na ślepo za 2 Moisture za heks); Exposed nie zabija (najniżej 1 HP), więc hydra bez mgły i Moisture może pełznąć do Passage wiele tur; nowe wsie, młyny i wieże tylko stoją.
00. Playtest M3: patrole i posłańcy, wyprawy i obrona leża, jaja i Broodlingi, wybór jaja po śmierci, ukryte jajo, nowi wrogowie, Great Burning, poziomy głów. Pytania M3 (decyzje robocze, `TODO(design)` w danych):
    - §8 chce 40–80 znanych heksów przed pierwszą wyprawą, a przy wzroku 3 bot zna wtedy ok. 250 (`docs/BALANCE_RUNS.md`): zmienić cel w dokumencie czy podnieść Alert za odkrywanie?
    - jajo bierze mutacje w chwili zniesienia, więc mutacja zdobyta później przechodzi tylko przez jaja zniesione po niej; po wyborze jednego jaja reszta przepada; Hidden Egg nie wymaga, żeby „rodowi szło dobrze”; hydra zaczyna z 1 jajem;
    - zwiadowcy nie podnoszą Alertu; wszystkie liczby nowych wrogów, Mistrza i poziomów są robocze;
    - bot nie zginął w żadnym ze 50 runów (120 tur): głowy rosną w poziomach szybciej, niż Zakon przybiera na sile.
0. Playtest M5 i M6: dialogi, eventy, mini questy, pokolenia, ekran pokolenia, Księga Rodów, zapis. Uwagi do bitwy i napisów w HD (`?scene=battle`).
1. Wrażenia z playtestu M2b: mapa, kapliczki, leże, nowe biomy.
2. Nowa tekstura soli do Salt Mines (Piotr wybrał nowy obrazek, prompt już przyciemniony). Malowane portrety głów już są (sekcja 3.2).
3. Okładka gry przyszła w projekcie Hydra 2026-10-04; kopia jest w plikach projektu (`hydra-grafika/wzory/okladka.png`). Do repo nie trafia, bo palety na razie nie ma (decyzja z 2026-10-06).
4. Wrażenia z playtestu M2c: kształt świata, progi, miejsca, podpowiedzi (przeciągi, echa), modyfikatory.

**Z `GAME_DESIGN.md` §16 (decyduje Piotr):**
- ile kapliczek Płomienia trzeba zgasić;
- nowe głowy słabsze i rosnące (od czego rosną?);
- odblokowania klas głów: które klasy zamknąć za odblokowaniami konta i jak je zdobywać (na razie w puli są wszystkie 9);
- zakończenia gry.

**Z `GAME_DESIGN.md` §1, „Świat” (`TODO(design)`):** odpowiedzi na tajemnice Hushed, jednostki i eventy The Discordant, czy Cinderkin walczą w bitwach.

**Pomysły na później, do rozmowy:**
- głowy działające tylko po swojej stronie Body;
- znacznik pokazujący, kogo atakuje dany wróg;
- teren areny na heksach (§6.7: woda, błoto, suchy grunt).

**Rozbieżność dokumentu i danych:** §6.3 podaje odrost „roboczo 6 s", a w `src/data/heads.json` jest 8 s (wydłużone, gdy bitwa miała zwolnić). Do wyrównania, gdy Piotr zdecyduje.

## 5. Znane problemy i braki

- HD zmieniło mapę, bitwę i napisy (krój „Księga”); HUD, panele, karty głów i ekran tytułowy mają poza tym ten sam układ i kolory co dotąd. Ekran tytułowy wciąż zastępczy. Malowanie przy ruchu na telefonie niezmierzone.
- Grafika z GPT jest na terenie i obiektach mapy, na hydrze (tułów, głowa Bitera, hydra na mapie), na Man-at-Arms i oddziale pierwszego stopnia. Zastępcze, rysowane w kodzie: Headhunter, Torchbearer, oddziały drugiego i trzeciego stopnia, przejście na powierzchnię, ekran tytułowy. Stara szara głowa (barwiona) zostaje dla Acid Spittera i Mist Breathera do czasu ich obrazków, więc na brązowym tułowiu wyglądają obco.
- M2c: modyfikatory i „świat dnia” tylko z URL (świat dnia odłożony decyzją z 2026-10-04). Prąd Undertow nie jest narysowany na wodzie. Old Crypts bez własnego miejsca. Zewnętrzny brzeg świata przy płaskich bokach mapy idzie po jej sześciokącie. Wydajność na telefonie niezmierzona (1261 heksów rysowanych naraz). Ok. 1% światów losuje się drugi raz, bo w pierwszym pierścieniu zabrakło kapliczki.
- M6: bitwa przerwana zamknięciem karty zaczyna się od nowa. Księga zaklęć rodu czeka na zaklęcia. Przodkini i dziedziczka nie mają portretów.
- M3: nowi ludzie Zakonu, Broodling, jaja i jednostki Zakonu na mapie są rysowane w kodzie (prompty gotowe). Bełt kusznika nie leci przez planszę, kusznik tylko robi wypad. Posłańców bot balansu nie goni, więc ucieka ich ok. 80%. Mapa nie pokazuje poziomów głów (tylko karty w bitwie). Bez komnat leża, Lineage Grimoire i głębszej warstwy.
- M4: cała powierzchnia jest rysowana w kodzie (prompty gotowe). Plansza bitwy na górze ma zwykłe kafle w kolorach biomu; suchy grunt pod koszem słabo widać w jego świetle; mgła przy Passage jest dość biała. Bot gasi w medianie 2 kapliczki na run i czasem pełznie bez Moisture wiele tur (gracz zaplanuje lepiej). Zamek zamknięty do M7, bez najazdów na wsie, młyny i wieże.
- Seed widać tylko z `?debug=1`. Menu pauzy, w którym miał być (§9), jeszcze nie ma.
- Świadomie odłożone na późniejsze etapy:
  - Spell Caches czekają na umiejętności głów (M2a);
  - Moisture idzie na mgłę na powierzchni (od M4), Bones i Muck na jaja (od M3);
  - nie ma odwrotu z bitwy;
  - specjalizacje, drzewko talentów i przypadłości głów;
- M5: głos Węża przy odpoczynku jest tylko w kwestiach Ropuchy; maska Hushed nic jeszcze nie daje (`TODO(design)`); kamień eventu i portrety jeńców, Mistrzów Zakonu i przodków czekają na grafikę; kwestie znają tylko trzy klasy głów, które są w grze.
- Balans (`docs/BALANCE.md`): najsilniejsza grupa (Pyre Procession) pokonuje hydrę bez rozkazów w 63% bitew, a przy sensownych rozkazach w 6%. Wszystkie liczby są robocze.

## 6. Następne kroki

0. Odpowiedzi Piotra na pytania M4 (wpisać decyzje do `GAME_DESIGN.md`, przerobić to, co wybierze inaczej) i uwagi z playtestu M4, M3, M5, M6 i M2a. Po zmianie kształtu `RunState` albo profilu podbić `RUN_FORMAT` / `PROFILE_FORMAT`.
1. Poczekać na odpowiedzi Piotra (sekcja 4).
2. Dalej z `docs/ANIMATIONS.md` (stan „do zrobienia”): oddech i drgnięcie tułowia, ścięcie głowy. Kolejne grafiki: reszta Zakonu po uwagach do próby (Zakon jak rycerze z okładki, z herbem złotego płomienia zamiast lwa; wzór dla GPT: `hydra-grafika/wzory/zakon-z-okladki.png` w plikach projektu), przejście na powierzchnię, tło tytułu.
3. Głowy i tułów w stylu okładki (sekcja 3.2, „Próba hydry i Zakonu w grze”): próba jest w grze od 2026-10-06, Piotr napisał „ok”. Prompty na pozostałe osiem głów, Headhuntera, Torchbearera i dwa większe oddziały są w `docs/ART_PROMPTS.md` od 2026-10-06, a ich wzory (portrety, pixelowy tułów, Biter, Man-at-Arms, oddział) w plikach projektu, `hydra-grafika/wzory/`; w manifeście są już miejsca na głowy. Przy imporcie: rozmiar głowy w manifeście z obrazka, `JAW_OVERLAP_BY_CLASS` z linii pyska, `TORCH_FLAME` z płomienia Torchbearera. Palety na razie nie ma (decyzja z 2026-10-06, sekcja 3.2).
4. Gdy Piotr napisze, że wrzucił grafiki: `git pull`, `npm run art`, obejrzeć wynik w grze, wdrożyć, pokazać.
5. Zatwierdzone decyzje od razu wpisywać do `GAME_DESIGN.md`, a budować w swoim etapie.
6. Kolejność etapów z `GAME_DESIGN.md` §15: następny jest M7 (szturm na zamek, zwycięstwo, dźwięk, szlif). Zaczyna się od planu i OK Piotra.

## M2a: głowy i combosy (wątek „Głowy i balans bitwy”, od 2026-10-21)

Budowane na gałęzi `claude/project-thread-lil67f`, równolegle z M6 w wątku „Następny etap gry”. Plan wysłany Piotrowi 2026-10-21, OK 2026-10-23 z wariantami pierwszymi: A, z odrostu losuje się każda z 9 klas (odblokowania później); B, odrost zostaje 8 s (dokument poprawiony); C, słabsza nowa głowa jeszcze nie.

Zrobione:
- Symulacja (`src/sim/battle/`): statusy z flagami w `combos.json` (`canWalk`, `canAttack`, `canChannel`, `flees`, `damageTakenMultiplier`, `endsOnDamage`, `breaksWhenHolderTakes`): Terrified, Stunned, Seized, Entranced oraz pomocnicze Pinned, Charmed, Melted (`TODO(design)`: spoza sześciu statusów ze słownika). Chwyt Stranglera (głowa trzyma człowieka, pęka po 8 obrażeniach), odrzut i przyciąganie, rzut, kałuże, światła Lanterna (wabią, ludzie klękają), sen i jedzenie Gluttona, nastroje bliźniaków po śmierci jednego, Bad Idea The Spare.
- Jeden słownik efektów dla ataków, umiejętności i combosów: `src/data/battleSchemas.ts` (kształt w JSON), `effects.ts` (wykonanie). Umiejętności w `skills.ts`: cel (człowiek, heks, głowa, kikut, nic), zasięg, obszar, efekty i rzeczy specjalne.
- Dane: 9 klas z atakiem podstawowym, po 3 umiejętności i ult (36 umiejętności, `heads.json` „skills”), 19 combosów z opisami i kwestiami (`combos.json`). Combosy mogą wymagać kilku głów (`otherHeads`: ta sama klasa, ten sam kikut, przeciwne strony), progu HP, posiłku albo zapalenia światła.
- Bitwa: przyciski Q/W/E nad kartami dla jednej wybranej głowy, celowanie z zasięgiem umiejętności, ⇄ przed startem zamienia umiejętność na trzecią (wybór zostaje w `HeadRecord.skills`), kwestie głów po combosach, nazwy statusów nad ludźmi, kałuże i światła na planszy, klęczący i zataczający się ludzie, kodeks combosów (przycisk Codex, `localStorage` „hydra.codex.v1”, osobno od zapisu M6).
- Do testów: `?scene=battle&heads=strangler,lantern,tender` (głowy bitwy testowej), `?ults=1` (ulty pod E).
- `npm run balance`: trzeci gracz „focus + skills” i tabela klas (trzecia głowa startowej hydry zamieniana na każdą klasę). Glutton leczył Body prawie do zera strat, więc `devourHeal` 15 → 8.

Nie zrobione (brak projektu albo czeka na Piotra): specjalizacje (doświadczenie i poziomy doszły w M3), drzewko talentów, przypadłości; skąd hydra dostaje ulty (zaklęcia, kapliczki). Efekty na wrogów, których jeszcze nie ma (kusznik, kosze żarowe, rycerze), są w danych jako `TODO(design)`. Nowe klasy mają szarą głowę barwioną kolorem klasy do czasu obrazków.

Wniosek z balansu: gracz używający umiejętności wygrywa prawie wszystko (pyreProcession 97% → 100%, strata HP Body 132 → 90). Do wyrównania razem z nowymi wrogami (M3) albo po playteście.
