# Animacje

Zasada (CLAUDE.md): wszystko, co się da, animujemy w kodzie z pojedynczych obrazków. Klatki rysujemy tylko tam, gdzie kod nie wystarczy, głównie dla ludzi Zakonu (chód, atak, śmierć), prawdopodobnie w PixelLab.

Jak czytać tabele:

- **Jak:** `kod` to ruch, obrót, skala, mignięcie albo przezroczystość liczone w grze z jednego obrazka; `klatki` to kolejne rysunki w jednym pliku.
- **Klatki, rozmiar, fps:** tylko dla animacji z klatek. Rozmiar to jedna klatka w pikselach gry.
- **Zaczepienie:** punkt obrazka, który stoi w miejscu postaci (ten sam we wszystkich klatkach).
- **Kierunki:** wszyscy patrzą w prawo, gra odbija ich w lewo. Inne kierunki tylko wtedy, gdy postanowimy inaczej.
- **Stan:** `jest` (działa w grze), `z grafiką` (zrobimy, gdy przyjdzie docelowy obrazek, żeby nie robić tego dwa razy), `do zrobienia` (obrazek już jest, animacja w kolejnym kroku), `później` (z etapem, który tego potrzebuje).

Klatki jednej animacji: osobne pliki `art/raw/<klucz>_frame1.png`, `_frame2.png`... albo kilka figur obok siebie na jednym obrazku. Skrypt `npm run art` przycina wszystkie klatki jednym wspólnym prostokątem, żeby postać nie skakała, i składa je w jeden pasek.

## Tułów hydry: battle_body

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Przesuwanie po planszy | kod: ślizg z heksu na heks | – | 144×110 | – | środek podstawy (72, 70) | brak (bez przodu i tyłu) | jest |
| Mignięcie przy trafieniu | kod: 70 ms na biało | – | | | | | jest |
| Oddech | kod: lekkie spłaszczanie i rozciąganie w pionie, ok. 3 s na cykl | – | | | | | do zrobienia |
| Drgnięcie przy mocnym ciosie | kod: odrzut o 1–2 px od ciosu i powrót | – | | | | | do zrobienia |

## Głowy: battle_head i battle_head_jaw, głowy klas

Jeden szary obrazek dla klas bez własnej głowy, gra barwi go kolorem klasy. Klasa z własną głową (od 2026-10-06 Biter: `battle_head_biter` 40×24, żuchwa 40×12, zachodzi na głowę o 11 px) ma te same animacje, bez barwienia. Żuchwa to osobny obrazek, żeby dało się otwierać pysk.

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Kołysanie w spoczynku | kod: wolne falowanie (ok. 2 px) | – | głowa 36×18, żuchwa 36×9 | – | środek głowy; żuchwa wisi pod nią, zachodzi na głowę o 3 px | w prawo, odbicie w lewo | jest |
| Wypad przy ataku | kod: skok o 6 px w stronę celu na 120 ms | – | | | | | jest |
| Mignięcie przy trafieniu | kod: 70 ms na biało | – | | | | | jest |
| Wyrastanie z kikuta | kod: nowa głowa startuje z kikuta i płynie na miejsce | – | | | | | jest |
| Kłapanie przy ataku | kod: w czasie wypadu żuchwa obraca się o 25° wokół tylnego końca i wraca (120 ms); przy każdym ataku, też przy pluciu i zionięciu | – | | | zawias na lewym końcu żuchwy (gra sama go znajduje) | | jest |
| Odrzut przy trafieniu | kod: głowa odskakuje o 3 px od ciosu i wraca (120 ms) | – | | | | | jest |
| Ścięcie | kod: głowa spada i znika, krótkie mignięcie kikuta | – | | | | | do zrobienia |

## Szyje

Rysowane w całości w kodzie: łańcuch nakładających się krążków po łuku od korony tułowia do głowy, cieńszy przy głowie. Ruszają się razem z głową. Kolory wzięte z tułowia (od 2026-10-06 brąz): ciemny obrys, brązowe łuski, jasny pasek z lewej góry i kremowy pas brzucha po stronie, w którą patrzy głowa (`NECK_LAYERS`, `NECK_RADIUS` w `src/scenes/BattleScene.ts`; skąd wychodzą: `NECK_RING` w `src/assets/battleArt.ts`). Stan: `jest`.

## Ludzie Zakonu: battle_enemy_manAtArms, battle_enemy_headhunter, battle_enemy_torchbearer

Teraz: jeden obrazek na typ, ruch w kodzie. Docelowo: klatki z PixelLab dla chodu, ataku i śmierci. Rozmiar klatki jak obrazka: 26×38, stopy w (13, 37), twarzą w prawo.

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Przestępowanie w miejscu | kod: co chwilę 1 px w górę | – | 26×38 | – | stopy (13, 37) | w prawo, odbicie w lewo | jest |
| Chód z heksu na heks | kod: podskok o 3 px w trakcie kroku | – | | | | | jest |
| Wypad przy ataku | kod: 3 px w stronę celu na 120 ms | – | | | | | jest |
| Mignięcie przy trafieniu | kod: 70 ms na biało | – | | | | | jest |
| Śmierć | kod: zanika i opada o 4 px przez 0,5 s | – | | | | | jest |
| Chód | klatki | 4 | 26×38 | 8 | stopy (13, 37) | w prawo | później (PixelLab) |
| Atak (miecz, topór, pochodnia) | klatki | 3–4 | 26×38 | 10 | stopy (13, 37) | w prawo | później (PixelLab) |
| Śmierć | klatki | 4 | 26×38 | 8 | stopy (13, 37) | w prawo | później (PixelLab) |
| Płomień pochodni (Torchbearer) | kod: mignięcie i światło, albo 2–3 klatki samego płomienia | 2–3 | do ustalenia | 8 | | | później |

Torchbearer przy przypalaniu kikuta: na razie zwykły atak. Osobna animacja, jeśli przyjdzie z PixelLab.

## Nowi ludzie Zakonu (M3): battle_enemy_crossbowman, battle_enemy_titheCollector, battle_enemy_knight, battle_enemy_masterOfTheOrder

Te same animacje w kodzie co u ludzi wyżej (przestępowanie, podskok w kroku, wypad, mignięcie, śmierć). Rozmiary w `docs/ASSETS.md`. Do tego:

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Strzał z kuszy (Crossbowman) | kod: wypad jak przy ciosie, choć cel stoi kilka heksów dalej; bez lecącego bełtu | – | 28×38 | – | stopy (dół środka) | w prawo, odbicie w lewo | jest |
| Lecący bełt | kod: kreska przelatująca od kuszy do celu | – | | | | | później |
| Liczenie (Tithe Collector) | kod: złoty pasek postępu pod stopami, gdy stoi przy tułowiu | – | | | | | jest |
| Ucieczka z dziesięciną (Tithe Collector) | kod: odchodzi 20 px w bok od tułowia i znika w 0,7 s | – | | | | | jest |
| Szarża (Knight) | kod: szybsze kroki, aż dojdzie do celu | – | 28×40 | – | stopy (dół środka) | | jest |
| Szarża z pochyleniem (Knight) | kod: przechył do przodu w czasie szarży | – | | | | | później |
| Atak (kusza, księga, miecz, pochodnia Mistrza) | klatki | 3–4 | jak obrazek | 10 | stopy (dół środka) | w prawo | później (PixelLab) |
| Płomień pochodni Mistrza | kod: światło i blask jak u Torchbearera, w tym samym miejscu (`TORCH_FLAME`); po imporcie grafiki przesunę je na jego płomień | – | | | | | jest |

## Broodling w bitwie: battle_broodling

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Przestępowanie, podskok w kroku, wypad przy ugryzieniu, mignięcie przy trafieniu | kod: jak u ludzi Zakonu | – | 16×14 | – | stopy (8, 13) | w prawo, odbicie w lewo | jest |
| Śmierć | kod: zanika i opada | – | | | | | jest |
| Wicie się w spoczynku | kod: lekkie kołysanie na boki | – | | | | | później |

## Mapa

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Hydra idzie po mapie (map_hydra) | kod: przesuw o heks co 130 ms, przy każdym kroku przechył 5° (na zmianę w lewo i w prawo) i rozciągnięcie w górę o 7% (`SLITHER` w MapScene), kamera jedzie za nią; niesiona prądem tylko się kołysze | – | 26×28 | – | stopy (dół środka) | bez odbicia (obrazek prawie symetryczny) | jest |
| Światła (leże, kapliczki, źródła, grzyby, pochodnie) | kod: map_glow barwione i dodawane do obrazu | – | 64×64 | – | środek | – | jest |
| Migotanie świateł | kod: lekkie, wolne pulsowanie jasności | – | | | | | później |
| Zmarszczki na wodzie | kod: przesuwanie kilku jaśniejszych pikseli po heksach wody | – | | | | | później |
| Mgła wokół nieznanego (map_fog_edge) | kod: statyczna | – | 30×28 | – | | | jest |
| Hydra niesiona prądem (Undertow) | kod: przesuw o heks co 80 ms, szybciej niż chód | – | 26×28 | – | stopy (dół środka) | – | jest |
| Przeciąg przy ukrytym progu (map_draught) | kod: smugi dryfują 4 px w bok i pulsują (przezroczystość 0,45–1, 1,4 s w każdą stronę) | – | 24×16 | – | środek, 4 px nad środkiem heksa | – | jest |
| Echo miejsca (map_echo) | kod: unosi się o 3 px i pulsuje (0,35–1, 0,9 s), znika, gdy hydra zobaczy źródło | – | 16×16 | – | środek, 16 px nad środkiem heksa | – | jest |
| Wysoki punkt orientacyjny prześwituje | kod: przezroczystość 0,55, gdy zasłania hydrę, zamknięty próg, spotkanie albo kapliczkę | – | | – | | – | jest |
| Prąd Undertow narysowany na wodzie | kod: smugi płynące wzdłuż drogi prądu | – | | | | | później |
| Patrol, posłaniec, wyprawa, Great Burning idą po mapie (map_patrol, map_messenger, map_expedition, map_great_burning) | kod: przesuw z heksu na heks w turze świata; widać je tylko na heksach w zasięgu wzroku | – | jak w ASSETS | – | stopy (dół środka) | bez odbicia | jest |
| Ślad „ostatnio widziani” | kod: przygaszony znak tam, gdzie hydra ostatnio widziała jednostkę Zakonu | – | | – | | – | jest |
| Broodling zwiadowca idzie po mapie (map_broodling) | kod: jak jednostki Zakonu | – | 14×14 | – | stopy (dół środka) | odbity, gdy pilnuje leża | jest |
| Jajo się wykluwa (map_egg) | kod: kiwa się ±8° (260 ms w każdą stronę) | – | 6×8 | – | dół środka | – | jest |
