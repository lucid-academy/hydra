# Prompty do grafik (GPT)

Gotowe prompty do generatora obrazów w GPT. Każdy jest w osobnym bloku, do skopiowania w całości, i każdy zaczyna się od tego samego stałego bloku stylu (test pilnuje, żeby tak zostało).

## Jak z nich korzystać

1. Skopiuj cały blok i wklej do GPT. Jeśli wynik się nie podoba, dopisz poprawkę zwykłymi słowami („remove the shadow", „more contrast", „make the pixels bigger") albo wygeneruj od nowa.
2. Pobierz obrazek (PNG, rozmiar z GPT jest w porządku, skrypt i tak go zmniejszy) i nazwij go tak jak w nagłówku, np. `texture_ground_lairSwamp_mud.png`. Jeśli przyjdzie pod inną nazwą (np. `decor_reeds.png`), też dobrze: Claude dopisze ją do listy `art/aliases.json` i plik zostanie taki, jaki jest.
3. Wyślij go w wątku projektu Hydra albo wrzuć na GitHubie do folderu `art/raw/`. Oryginałów nikt potem nie zmienia.
4. Skrypt `npm run art` wycina tło, zmniejsza obrazek do rozmiaru gry, wstawia go do gry i zgłasza problemy.

Na co uważać:

- **Tekstury gruntu i skał** wypełniają cały kwadrat, od krawędzi do krawędzi, widziane prosto z góry, bez magenty. Gra sama spłaszcza je do kąta kamery i wycina z nich heksy, więc nie proś GPT o heksy.
- **Wszystko inne** stoi na jednolitym tle magenta `#FF00FF`. Bez cienia na tle, bez podłogi, bez ramki. Jeśli GPT doda cień albo inne tło, poproś o poprawkę.
- **Głowa** to dwa osobne kawałki (głowa i żuchwa), które nie mogą się stykać.
- Rozmiary w promptach to rozmiary w grze. GPT ich nie dotrzyma i nie musi; chodzi o to, żeby rysował prosto i wyraźnymi pikselami, bo szczegóły mniejsze niż piksel gry i tak znikną po zmniejszeniu.
- Od przejścia na HD (2026-10-05) gra pokazuje grafiki w podwójnej gęstości, więc nowe prompty podają rozmiar w HD, dwa razy większy niż starsze. Starych obrazków nie trzeba robić od nowa: skrypt robi obie wersje z tego samego pliku.

## Stały blok stylu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.
```

## Hydra w bitwie: tułów i głowy w stylu okładki

Hydra dostaje wygląd z okładki i portretów: stary brąz w czarnej siatce, kremowe płyty brzucha, mech. Najpierw próba na dwóch obrazkach, tułowiu i głowie Bitera (razem z próbą Zakonu i hydry na mapie z następnej sekcji). Prompty na pozostałe osiem głów są w sekcji „Hydra w bitwie: pozostałe głowy”.

Próba (tułów, Biter, Man-at-Arms, oddział i hydra na mapie) jest w grze od 2026-10-06 i czeka na uwagi Piotra.

Wzory do dołączenia w GPT leżą w plikach projektu Hydra, w folderze `hydra-grafika/wzory/`: `okladka.png` i `biter-portret.png`.

- Do promptu tułowia dołącz okładkę. Do promptu głowy dołącz portret Bitera i gotowy pixelowy tułów (najprościej w tej samej rozmowie z GPT, zaraz po tułowiu).
- Nowy tułów nazwij `battle_body.png`, tak jak stary. Stary zostaje w historii repozytorium.
- Głowa to dwa osobne kawałki (głowa i żuchwa), które nie mogą się stykać, tak jak przy pierwszej głowie.

### `battle_body.png`: tułów hydry z okładki

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. The attached picture is the game's cover painting: draw the body of THAT hydra, with its scales, colours, moss and mood, as a small pixel-art game sprite.
Subject: the body of the giant swamp hydra WITHOUT any heads or necks (the game adds the necks and heads). A huge, heavy mound of thick serpent coils piled on top of each other, like a coiled python the size of a hill, seen in the game's three-quarter view from above. The lowest coil lies on the ground in a wide oval, about one and a half times as wide as it is deep; the coils above it get smaller and pile up into a tall hump that rises above the back of the oval by about half of the oval's depth. The top of the hump is a broad, rounded crown of coils: the necks will rise from there. The tail end is tucked in between the coils. No face, no legs and nothing sticking out: necks and enemies surround it on every side, so it has no front and no back.
Colours as on the cover: old bronze scales (#342513, #64461f, #907246, highlights #d1ba8e) in a net of near-black lines (#120e08); pale cream belly plates (#c1b18e, shaded #6b6853) showing as a band along the side of each coil; a few strands of dark olive moss (#45422a) hanging from the coils. Lit from the upper left, the lowest coil darkest. A dark outline all around. No water, ground, mist or shadow under it: the game adds them.
Size: in the game it is about 288 by 256 pixels, so draw the coils thick and bold and the scales as a clear net of square pixels; details smaller than a pixel at that size will be lost.
```

### `battle_head_biter.png`: głowa Bitera (dwa kawałki: głowa i żuchwa)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Two pictures are attached: the painted portrait of the Biter shows WHAT to draw (its head, scars and colours); the pixel-art hydra body shows HOW to draw it (the same size of pixels, the same outline and colours), so the head clearly belongs to that body.
Subject: the Biter, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT, mouth closed. The most massive skull of all the heads: a heavy, blunt snake head with a thick brow ridge, a small glowing amber eye (#d3a224) under it, old scars across the snout and a broken crossbow bolt stuck in the brow ridge. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few strands of dark olive moss (#45422a), a few big fangs. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs, eye, brow ridge and the bolt), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs.
Size: in the game the whole head with its jaw is only about 80 by 60 pixels, so keep it bold: one clear silhouette and a few big shapes. The brow ridge and the bolt must still read at that size.
```

## Zakon i hydra na mapie, Zakon w bitwie: próba

Zakon Wiecznego Ognia wygląda jak rycerze z okładki: płytowe zbroje, bordowe tuniki i peleryny, czerwone chorągwie, ciepłe złoto. Herbem jest złoty płomień (od nazwy Zakonu), a nie lew z okładki. Próba na trzech obrazkach: Man-at-Arms w bitwie, jego oddział na mapie i hydra na mapie. Najlepiej zrób je w tej samej rozmowie z GPT co tułów hydry, zaraz po nim: wtedy piksele wyjdą tej samej wielkości.

- Wzór Zakonu: `zakon-z-okladki.png` (wycinek okładki) w `hydra-grafika/wzory/`.
- Prompty na Headhuntera, Torchbearera i dwa większe oddziały są w sekcji „Zakon: Headhunter, Torchbearer i większe oddziały”. Pozostałe typy Zakonu (§6.6) dostaną prompty, gdy wejdą do gry ich zasady.
- Na razie Zakon rusza się w kodzie (kołysanie, wypad, mignięcie przy trafieniu, upadek). Animacje klatkowe (chód, cios, śmierć) mogą przyjść później z PixelLab.

### `battle_enemy_manAtArms.png`: Man-at-Arms, zbrojny Zakonu w bitwie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Two pictures are attached: the detail of the game's cover painting shows WHO to draw (the soldiers of the Order of the Eternal Flame: their plate armour, red capes and banners); the pixel-art hydra body shows HOW to draw it (the same size of pixels, the same dark outline, the same view), so the soldier clearly belongs to the same game.
Subject: a Man-at-Arms, the ordinary soldier of the Order of the Eternal Flame, standing ready to fight, seen from the side and a little from above, facing RIGHT. Grim and dead serious, like the soldiers on the cover: a steel helmet with a visor, plate armour over mail, a banner-red tabard (#9e2323, shaded darker) with a small gold flame emblem (#d9a93b) on the chest, a short dark red cape, a sword held upright in the right hand, towards the enemy, and a small shield on the far arm. Steel greys with warm highlights, lit from the upper left. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground, no shadow, no banner and no other figures: the game adds the ground and the shadow.
Size: in the game the soldier is only about 52 by 76 pixels, a man next to a hydra body about 288 pixels wide, so keep it bold: one clear silhouette; the red tabard and the gold flame must still read at that size.
```

### `map_encounter_1.png`: oddział Zakonu na mapie (jeden zbrojny z chorągwią)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the battle: draw THE SAME soldier, smaller, as a marker on the game's map, with the same size of pixels and the same colours.
Subject: one Man-at-Arms of the Order of the Eternal Flame standing guard beside a tall wooden pole with a banner-red flag (#9e2323) bearing a gold flame (#d9a93b), the flag hanging and slightly waving. The soldier stands in front of the pole, facing the viewer at an angle, sword point down, in the game's three-quarter view from above, lit from the upper left. The soldier's feet and the foot of the pole stand on the ground at the bottom middle of the picture. A dark outline all around. No ground, no shadow: the game adds them.
Size: on the map the whole marker is only about 56 by 72 pixels, so: big shapes; the red flag must be easy to spot from afar.
```

### `map_hydra.png`: hydra na mapie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art hydra body from the battle: draw THE SAME hydra, whole and much smaller, as the player's piece on the game's map, with the same size of pixels and the same colours.
Subject: the giant swamp hydra as a small game piece: the mound of bronze coils with three heads on short, thick necks rising from its top, the heads looking different ways (one left, one right, one up and forward), mouths closed, small amber eyes glowing (#d3a224). Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream belly plates (#c1b18e), a few strands of dark olive moss (#45422a). Dark and menacing, more snake than dragon, never cute. Seen in the game's three-quarter view from above, lit from the upper left. The lowest coil rests on the ground at the bottom middle of the picture. A dark outline all around. No water, no ground, no shadow: the game adds them.
Size: on the map it is only about 52 by 56 pixels, so: one clear, bold silhouette; the three heads must read as heads.
```

## Hydra w bitwie: pozostałe głowy

Pozostałe osiem głów, w tym samym stylu co Biter z próby. Do każdego promptu dołącz trzy obrazki z folderu `hydra-grafika/wzory/` w plikach projektu: portret tej głowy (`<klasa>-portret.png`, np. `acidSpitter-portret.png`), pixelowy tułów (`tulow-pixel.png`) i pixelowego Bitera (`biter-pixel.png`). Najlepiej w jednej rozmowie z GPT, głowa po głowie: wtedy piksele wyjdą tej samej wielkości.

- Głowa i żuchwa jak u Bitera: dwa kawałki obok siebie, z przerwą, oba tak, jak leżą przy zamkniętym pysku.
- Cecha sylwetki z `GAME_DESIGN.md` §13 (kaptur, skrzela, piszczałki, gardło, wędka) należy do głowy i może ją wydłużyć albo podwyższyć. Rozmiar w grze ustawię po imporcie, tak żeby czaszki były podobnej wielkości (Biter największy, The Spare najmniejsza).
- Mist Breather bez mgły z pyska: mgłę rysuje gra. Szczęki Screamera gra rozewrze sama.
- W grze są dziś trzy klasy (Biter, Acid Spitter, Mist Breather). Pozostałe wejdą z etapem M2a, ale ich głowy mogą być gotowe wcześniej.
- The Spare: ten prompt rysuje ją w brązie, jak resztę, zamiast zielonej głowy z 2026-10-05 (pytanie o nią jest na karcie w wątku „Repo i potok grafiki”). Nowy obrazek wrzuć pod tą samą nazwą, `battle_head_spare.png`.

### `battle_head_acidSpitter.png`: Acid Spitter (kaptur kobry, świecące gruczoły)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Acid Spitter shows WHAT to draw (its head, the cobra hood with its glowing acid glands, and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Acid Spitter, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A narrow, haughty snake head with a small glowing amber eye (#d3a224) and long thin fangs. Behind the skull a cobra hood spreads like a frill, its inside dotted with acid glands that glow sickly yellow-green (#c6e04a, brightest in the middle, darker #8a9c2a at the edges); one or two glowing drops of acid hang from the fangs. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs and acid drops, eye and the hood), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs.
Size: in the game the whole head with its jaw is only about 76 by 64 pixels, so keep it bold: one clear silhouette and a few big shapes. The hood and its glowing glands must still read at that size.
```

### `battle_head_mistBreather.png`: Mist Breather (pierzaste skrzela)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Mist Breather shows WHAT to draw (its head, the feathery gills and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Mist Breather, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A long, sleepy snake head with a heavy-lidded amber eye (#d3a224), half closed. Instead of spines, feathery gills like an axolotl's fan out from the back of the skull, pale grey-green (#8fb3a8) at their tips fading into the bronze at their roots. No mist and no breath: the game draws the mist. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs, eye and the feathery gills), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs.
Size: in the game the whole head with its jaw is only about 76 by 60 pixels, so keep it bold: one clear silhouette and a few big shapes. The feathery gills must still read at that size.
```

### `battle_head_screamer.png`: Screamer (kościane piszczałki)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Screamer shows WHAT to draw (its head, the bone pipes and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Screamer, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A proud snake head with a wide mouth, a fierce amber eye (#d3a224) and long fangs. Instead of a crest, a row of hollow bone pipes like a small church organ rises from the back of the skull, pale old bone (#e3d6b4, shaded #a8987a) with dark round openings at their tops. The game opens its jaws wide when it screams, so draw the pieces like every other head. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs, eye and the bone pipes), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs.
Size: in the game the whole head with its jaw is only about 76 by 68 pixels, so keep it bold: one clear silhouette and a few big shapes. The bone pipes must still read at that size.
```

### `battle_head_glutton.png`: Glutton (rozdęte gardło z połkniętym rycerzem)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Glutton shows WHAT to draw (its head, the swollen throat with a swallowed knight inside, and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Glutton, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A heavy, round snake head with small greedy amber eyes (#d3a224) and blunt fangs. Under its lower jaw hangs a huge swollen throat, the skin stretched thin and reddish (#b5614a, shaded #7a3a2a), with the shape of a swallowed knight in armour pressing through it: the round top of a helmet and a steel boot. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs and the eyes), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs and the swollen throat with the swallowed knight hanging under it.
Size: in the game the whole head with its jaw is only about 76 by 76 pixels, so keep it bold: one clear silhouette and a few big shapes. The swollen throat and the shape of the knight in it must still read at that size.
```

### `battle_head_spare.png`: The Spare (mała, krzywa, jedno oko ślepe)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Spare shows WHAT to draw (its head, the blind eye and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: The Spare, the smallest of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A small, slightly crooked snake head: the skull a little lopsided, the snout bent, a few fangs missing, and its one eye that we see blind, milky white (#d8d4c8) with no pupil. The same bronze as every other head, a little paler and patchier, with a few reddish scales (#d28fa4 only as a faint tint). Sad and odd, still a hydra's head, never comic. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs and the blind eye), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its few fangs.
Size: in the game the whole head with its jaw is only about 60 by 44 pixels, so keep it bold: one clear silhouette and a few big shapes. The blind white eye and the crooked snout must still read at that size.
```

### `battle_head_strangler.png`: Strangler (najdłuższa i najniższa, fioletowe pręgi)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Strangler shows WHAT to draw (its head, the purple stripes and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Strangler, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. The longest and lowest head of all: a long, flat, narrow skull like a pit viper's, a low brow over a calm amber eye (#d3a224), thin fangs, a row of dark spines along the back of the skull. Purple stripes (#7d68b0, shaded #4a3a70) run across the bronze scales from the snout to the back of the head. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs, eye, spines and stripes), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs.
Size: in the game the whole head with its jaw is only about 88 by 44 pixels, so keep it bold: one clear silhouette and a few big shapes. The long low shape and the purple stripes must still read at that size.
```

### `battle_head_tender.png`: Tender (szeroka głowa ropuchy, świecący śluz)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Tender shows WHAT to draw (its head, the glowing slime and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Tender, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A wide, flat toad-like head with a broad mouth, a heavy-lidded caring amber eye (#d3a224) and small fangs; the bronze scales turn into bumpy toad skin with warts that glow teal (#3fb8a6, brightest in the middle), and a few drops of glowing teal slime hang from its lips. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs, eye and the glowing warts), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its small fangs.
Size: in the game the whole head with its jaw is only about 80 by 64 pixels, so keep it bold: one clear silhouette and a few big shapes. The wide toad shape and the glowing warts must still read at that size.
```

### `battle_head_lantern.png`: Lantern (wędka ze świecącą bańką)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch). Three pictures are attached: the painted portrait of the Lantern shows WHAT to draw (its head, the lure with its glowing orb and its colours); the pixel-art hydra body and the pixel-art Biter head from the game show HOW to draw it (the same size of pixels, the same outline and the same bronze), so the head clearly belongs to the same hydra as the Biter.
Subject: the Lantern, one of the hydra's heads, raised in the air and seen from the side, snout pointing RIGHT. A lean snake head with a gentle-looking amber eye (#d3a224), long fangs and a few blue-tinted scales on the brow. From its forehead grows a long thin lure stalk that arches forward over the snout, like an anglerfish's, with a glowing pale-blue orb (#8cc8f0, white in the middle) hanging from its tip in front of the snout. Keep a wide gap of magenta between the orb and the jaw piece. Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), pale cream plates (#c1b18e) under the jaw, a few short strands of dark olive moss (#45422a) hanging from the back of the skull. Dark and menacing, more snake than dragon, never cute. No tongue and no neck: the head ends right behind the skull, the game draws the neck. Both pieces as they sit with the mouth shut: the game opens and shuts the mouth. A dark outline all around.
- LEFT piece: the head without its lower jaw (skull, upper jaw with its fangs, eye and the lure with its orb), snout pointing right.
- RIGHT piece: the lower jaw alone, at the size it has on the head, also pointing right, with its fangs.
Size: in the game the whole head with its jaw is only about 80 by 84 pixels, so keep it bold: one clear silhouette and a few big shapes. The lure and its glowing orb must still read at that size.
```

## Zakon: Headhunter, Torchbearer i większe oddziały

Reszta Zakonu z próby, w stylu Man-at-Arms. Do postaci w bitwie dołącz pixelowego Man-at-Arms (`man-at-arms-pixel.png` w `hydra-grafika/wzory/`), a do oddziałów na mapie oddział z jednym zbrojnym (`oddzial-pixel.png`); wycinek okładki (`zakon-z-okladki.png`) też się przyda.

- Pochodnia Torchbearera to jedyny jasny ogień na planszy: gra świeci z jej płomienia. Gdzie jest płomień, ustawię po imporcie.
- Oddziały na mapie: im silniejszy, tym więcej ludzi i większa chorągiew. Drugi stopień to Man-at-Arms i Headhunter, trzeci to jeszcze Torchbearer z płonącą pochodnią.
- Crossbowman, Tithe Collector, Knight i Mistrz Zakonu mają prompty w sekcji „M3”; Censer Priest i Brazier Bearer dostaną je w M4.

### `battle_enemy_headhunter.png`: Headhunter, łowca głów (topór)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Headhunter of the Order of the Eternal Flame, the soldier who hunts the hydra's heads, standing ready to strike, seen from the side and a little from above, facing RIGHT. Broader and heavier than the Man-at-Arms: a closed steel helmet, heavy plate over mail, a dark blood-red tabard (#5e1414, shaded darker) with the gold flame emblem (#d9a93b) on the chest, a short dark cape, and a big two-handed bearded axe held in both hands, raised over his shoulder with the blade towards the enemy. A string of hydra fangs hangs from his belt as trophies. Grim and dead serious. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game the soldier is only about 52 by 76 pixels, a man next to a hydra body about 288 pixels wide, so keep it bold: one clear silhouette. The big axe and the dark red must still read at that size: he must not be mistaken for the Man-at-Arms.
```

### `battle_enemy_torchbearer.png`: Torchbearer, brat świecki z pochodnią

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Torchbearer of the Order of the Eternal Flame: a lay brother, not a soldier, standing ready, seen from the side and a little from above, facing RIGHT. A plain brown wool habit (#6b4a2a, shaded #3e2a18) with a rope belt, a tonsured head (bald crown, a ring of hair), no helmet and no armour, a small gold flame embroidered on the chest, sandals. He holds a burning torch high in his right hand, in front of him, towards the enemy: its flame (fire #ffcf5c in the middle, orange #e0702a at the edges) is the brightest thing in the picture. Pious and dead serious. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is only about 52 by 76 pixels, a man next to a hydra body about 288 pixels wide, so keep it bold: one clear silhouette. The bright torch flame and the brown habit must still read at that size.
```

### `map_encounter_2.png`: oddział Zakonu na mapie, drugi stopień (dwóch ludzi)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw a bigger marker of THE SAME kind, with the same size of pixels, the same colours and the same view.
Subject: two people of the Order of the Eternal Flame standing guard beside a tall wooden pole with a bigger banner-red flag (#9e2323) bearing a gold flame (#d9a93b): the Man-at-Arms with his sword and a Headhunter in a dark blood-red tabard with a big two-handed axe, side by side in front of the pole, facing the viewer at an angle, in the game's three-quarter view from above, lit from the upper left. Their feet and the foot of the pole stand on the ground along the bottom of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: on the map the whole marker is only about 72 by 76 pixels, so keep it bold: one clear silhouette. The red flag must be easy to spot from afar, and bigger than on the one-soldier marker.
```

### `map_encounter_3.png`: oddział Zakonu na mapie, trzeci stopień (trzech ludzi z pochodnią)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw a bigger marker of THE SAME kind, with the same size of pixels, the same colours and the same view.
Subject: three people of the Order of the Eternal Flame beside a tall wooden pole with a big banner-red flag (#9e2323) bearing a gold flame (#d9a93b): the Man-at-Arms with his sword, a Headhunter with a big two-handed axe and a Torchbearer in a brown habit holding a burning torch high, its flame (fire #ffcf5c, orange #e0702a) the brightest thing in the picture. They stand side by side in front of the pole, facing the viewer at an angle, in the game's three-quarter view from above, lit from the upper left. Their feet and the foot of the pole stand on the ground along the bottom of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: on the map the whole marker is only about 88 by 80 pixels, so keep it bold: one clear silhouette. The big red flag and the torch must be easy to spot from afar.
```

## M3: nowi ludzie Zakonu, Broodlingi i jednostki Zakonu na mapie

Wszystko z tej sekcji jest już w grze jako grafika zastępcza rysowana w kodzie, więc można to robić w dowolnej kolejności. Specyfikacja (rozmiary, punkt zaczepienia) jest w `docs/ASSETS.md`.

- Do postaci w bitwie dołącz pixelowego Man-at-Arms (`man-at-arms-pixel.png` w `hydra-grafika/wzory/`), do Broodlinga tułów hydry z bitwy, do jednostek na mapie oddział z jednym zbrojnym (`oddzial-pixel.png`), a do Broodlinga na mapie i jajka hydrę z mapy.
- Mistrz Zakonu to boss: może być trochę wyższy od reszty. Płomień jego pochodni ustawię po imporcie, tak jak u Torchbearera.
- Latarnia patrolu, pochodnie wyprawy i ogień Great Burning świecą w grze, więc mają być wyraźne.

### `battle_enemy_crossbowman.png`: Crossbowman, kusznik (strzela z daleka)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Crossbowman of the Order of the Eternal Flame, standing and aiming, seen from the side and a little from above, facing RIGHT. Lighter than the Man-at-Arms: a padded quilted jack in dull brown under a short banner-red tabard (#9e2323) with a small gold flame (#d9a93b), an open steel cap with a brim (the face shows: narrow, squinting, dead serious), leather boots. He holds a heavy wooden crossbow level at chest height, pointing right, a bolt loaded; a quiver of bolts hangs at his hip. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is only about 56 by 76 pixels, a man next to a hydra body about 288 pixels wide, so keep it bold: one clear silhouette. The crossbow held level must read at that size: he must not be mistaken for the Man-at-Arms.
```

### `battle_enemy_titheCollector.png`: Tithe Collector, poborca dziesięciny (z księgą)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Tithe Collector of the Order of the Eternal Flame: a clerk, not a soldier, standing very straight, seen from the side and a little from above, facing RIGHT. Thin and tall. A long dark violet-black robe (#2a1f2e, shaded #140f17) buttoned to the chin, a wide-brimmed black hat, a white collar, a small gold flame pinned at the chest. In his right hand, held out towards the enemy, a big open ledger with cream pages (#e8dcb8); a quill tucked behind his ear and a fat purse of coins and a ring of keys at his belt. He has no weapon at all and needs none. Prim, unbothered and dead serious, as if auditing a monster were routine. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is only about 52 by 80 pixels, so keep it bold: one clear silhouette. The dark robe, the wide hat and the pale open ledger must read at that size.
```

### `battle_enemy_knight.png`: Knight of the Eternal Flame, rycerz (szarża, nie zna strachu)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Knight of the Eternal Flame, the Order's heavy elite, standing ready to charge, seen from the side and a little from above, facing RIGHT. Full plate armour in pale steel (#c8ccd0, shaded #6e747a) with gilded edges (#d9a93b), a closed great helm with a narrow eye slit and a tall red plume (#9e2323), a white surcoat with a red flame on the chest, a long white cape. He holds a long sword in both hands, point forward and low, as if about to run at the enemy. Broad, heavy and calm, the biggest soldier on the board. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is only about 56 by 80 pixels, so keep it bold: one clear silhouette. The white-and-steel plate and the red plume must read at that size: he is the one bright, pale figure among the red soldiers.
```

### `battle_enemy_masterOfTheOrder.png`: Master of the Order, Mistrz Zakonu (boss Great Burning)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Master of the Order of the Eternal Flame, the boss who leads the Great Burning, standing tall, seen from the side and a little from above, facing RIGHT. Deep crimson robes (#7a1414, shaded #3e0a0a) over gilded plate (#d9a93b, shaded #8a6a22), a tall gold helm crested with a stylised flame, a heavy gold chain with a flame pendant, a long crimson cape. In his right hand, raised high in front of him towards the enemy, a great ceremonial torch of gold whose big flame (fire #ffcf5c in the middle, orange #e0702a at the edges) is the brightest thing in the picture. Old, gaunt and utterly certain. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is about 56 by 80 pixels, and may be a little taller than the other soldiers (up to about 96), so keep it bold: one clear silhouette. The gold, the crimson and the big flame must make him read as the most important man on the board at a glance.
```

### `battle_broodling.png`: Broodling, młode hydry w bitwie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art hydra body from the battle: draw a tiny hatchling of THE SAME hydra, with the same size of pixels, the same colours and the same view.
Subject: a Broodling, a hatchling of the swamp hydra: a small, plump serpent body in a little coil with ONE small head on a short neck, mouth open showing tiny teeth, as if hissing bravely, facing RIGHT, seen in the game's three-quarter view from above, lit from the upper left. The same old bronze scales as the big hydra (#342513, #64461f, #907246) in a near-black net (#120e08), a pale cream belly (#c1b18e), still wet and glistening, a small glowing yellow-green eye (#c6e04a). Brave and far too small, never cute in a toy-like way. It rests on the ground at the bottom middle of the picture. A dark outline all around. No water, no ground, no shadow: the game adds them.
Size: in the game it is only about 32 by 28 pixels, about the size of a soldier's boot, so: one clear, bold silhouette; the open mouth and the glowing eye must read.
```

### `map_patrol.png`: patrol Zakonu na mapie (idzie)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw another marker of THE SAME kind, with the same size of pixels, the same colours and the same view.
Subject: a patrol of the Order of the Eternal Flame walking the underground: two soldiers in banner-red tabards (#9e2323) with small gold flames (#d9a93b) and steel helmets, one behind the other, on the march, facing a little to the right. The front one carries a wooden pole over his shoulder with a lit lantern hanging from its end (warm fire #ffcf5c behind the glass), at the top right of the picture. No banner: they are on the move. In the game's three-quarter view from above, lit from the upper left. Their feet stand on the ground along the bottom of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: on the map the whole marker is only about 52 by 60 pixels, so keep it bold: one clear silhouette. The lantern must be easy to spot: the game adds its light around it.
```

### `map_messenger.png`: posłaniec Zakonu na mapie (biegnie do Passage)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw another marker of THE SAME kind, with the same size of pixels, the same colours and the same view.
Subject: a messenger of the Order of the Eternal Flame running: one young man mid-stride, leaning forward, facing right, in a short banner-red tabard (#9e2323) with a small gold flame (#d9a93b), no helmet, a leather satchel bouncing at his hip and a white folded letter with a red seal held up in his hand. In a terrible hurry and dead serious about it. In the game's three-quarter view from above, lit from the upper left. His back foot touches the ground at the bottom of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: on the map he is only about 28 by 44 pixels, so keep it bold: one clear silhouette. The running pose and the white letter must read at that size.
```

### `map_expedition.png`: wyprawa Zakonu na mapie (idzie na leże)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw another marker of THE SAME kind, with the same size of pixels, the same colours and the same view.
Subject: an expedition of the Order of the Eternal Flame marching on the hydra's lair: four soldiers in banner-red tabards (#9e2323) and steel helmets in a tight group, on the march, facing a little to the right, under a big banner-red flag on a tall pole bearing a gold flame (#d9a93b). The two at the sides hold lit torches high (fire #ffcf5c, orange #e0702a). Bigger, busier and more threatening than a patrol. In the game's three-quarter view from above, lit from the upper left. Their feet stand on the ground along the bottom of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: on the map the whole marker is only about 80 by 76 pixels, so keep it bold: one clear silhouette. The big flag and the two torches must be easy to spot from afar.
```

### `map_great_burning.png`: Great Burning na mapie (Mistrz w lektyce)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw another marker of THE SAME kind, with the same size of pixels, the same colours and the same view.
Subject: the Great Burning, the Order's crusade against the hydra: four soldiers in banner-red tabards with lit torches carry on their shoulders a gilded chair (#d9a93b) under a small red canopy; in the chair sits a Master of the Order in crimson robes and a tall gold helm crested with a flame, holding a great burning torch high. Above them all, a big red flag with a gold flame. The tallest and grandest thing the Order brings, solemn and absurd at once. In the game's three-quarter view from above, lit from the upper left. The bearers' feet stand on the ground along the bottom of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: on the map the whole marker is only about 80 by 104 pixels, so keep it bold: one clear silhouette. The Master high up in his gilded chair and the fire must read from afar.
```

### `map_broodling.png`: Broodling na mapie (zwiadowca i strażnik leża)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art hydra from the game's map: draw a tiny hatchling of THE SAME hydra, with the same size of pixels, the same colours and the same view.
Subject: a Broodling, a hatchling of the swamp hydra, as a small game piece: a little coil of bronze serpent body with ONE small head on a short neck raised and looking to the right, a small glowing yellow-green eye (#c6e04a). Old bronze scales (#342513, #64461f, #907246) in a near-black net (#120e08), a pale cream belly (#c1b18e), still wet. In the game's three-quarter view from above, lit from the upper left. It rests on the ground at the bottom middle of the picture. A dark outline all around. No water, no ground, no shadow: the game adds them.
Size: on the map it is only about 28 by 28 pixels, so: one clear, bold silhouette, the head and the glowing eye readable.
```

### `map_egg.png`: jajo hydry w leżu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Draw it to match the game's bronze swamp hydra (attach the pixel-art hydra from the map if you have it).
Subject: one hydra egg: an upright oval egg, pale greenish cream (#c9c8a8, shaded #6b6853) with dark bronze speckles (#64461f), a faint yellow-green glow (#c6e04a) showing through the shell from inside, a little wet and glistening. Seen in the game's three-quarter view from above, lit from the upper left. It stands on the bottom middle of the picture. A dark outline all around. No nest, no ground, no shadow: the game adds them.
Size: on the map it is only about 12 by 16 pixels, so keep it very simple: an oval, a few speckles and the glow.
```

## Pierwsza partia: 5 obrazków

Najpierw te pięć: sprawdzimy na nich cały proces, zanim zrobisz resztę.

### 1. `texture_ground_lairSwamp_water.png`: woda w bagnie leża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: murky still water of the swamp around the hydra's lair. Very dark teal-green water (around #12393a), a few small pale ripples, a little green scum and duckweed, a few faint yellow-green glints of floating spores. Even detail spread over the whole square, nothing big in the middle, low contrast, so creatures stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: ripples and blobs 2 to 6 pixels big.
```

### 2. `texture_ground_lairSwamp_mud.png`: błoto w bagnie leża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the soft, wet mud floor of an underground swamp. Dark olive mud (around #2c3420) with slightly greener patches (#3f5a2c), small dark puddles, a few pebbles, bits of rotten reed and an old bone fragment here and there. Even detail spread over the whole square, nothing big in the middle, low contrast, so creatures stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: puddles and pebbles 2 to 6 pixels big.
```

### 3. `texture_rock_lairSwamp.png`: skała w bagnie leża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: rough, solid cave rock of an underground swamp: dark brownish grey stone (around #3a3129) with cracks, a few wet glints and dark green moss in the cracks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### 4. `battle_body.png`: tułów hydry (stary wygląd, nie używać: nowy prompt w sekcji „Hydra w bitwie”)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background.
Subject: the torso of a giant swamp hydra WITHOUT any heads, necks or tail (the game adds the necks and heads). A huge, squat mound of dark green scaly hide, seen in the game's three-quarter view from above: its base is a wide oval about one and a half times as wide as it is deep, and its back rises in a low, heavy dome. Paler, mossy scales on top of the back, darker scales low on the sides, a dark outline. It has no front and no back: necks and enemies surround it on every side, so no face, no legs sticking out, no tail.
Size: in the game it is 132 by 110 pixels, so keep the scales big and the shape bold.
```

### 5. `battle_head.png`: głowa (stary wygląd, nie używać: nowe głowy w sekcji „Hydra w bitwie”)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite in two separate pieces on the flat magenta background, side by side, with a clear gap of magenta between them (they must not touch).
Subject: the head of a swamp hydra in side view, snout pointing RIGHT. Reptilian and a little dragon-like: a long mouth with small teeth, a small crest at the back of the skull, a glowing eye. Draw it ONLY in pale grey and white with a dark outline, no other colours (the game colours each head by its class).
- LEFT piece: the head without its lower jaw (skull, upper jaw with teeth, eye, crest), snout pointing right.
- RIGHT piece: the lower jaw alone, at the same size as it would be on the head, also pointing right.
Size: in the game the whole head is only about 36 by 24 pixels, so keep it simple and bold: a clear silhouette and a few big shapes.
```

## Reszta tekstur gruntu (10)

### `texture_ground_floodedCaves_water.png`: Flooded Caves, woda

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: cold, dark water flooding a cave, around #0f3a3d: you can just see smooth stones on the bottom, faint pale-blue light ripples, a few tiny cyan glints (#7fd0e0). Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: ripples and stones 2 to 6 pixels big.
```

### `texture_ground_floodedCaves_mud.png`: Flooded Caves, mokry kamień i muł

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the floor of a flooded cave: wet grey-green stone and silt (around #1d3833 and #2d5a4a), smooth water-worn pebbles, shallow puddles that catch a little light. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: pebbles and puddles 2 to 6 pixels big.
```

### `texture_ground_rootTangle_mud.png`: Root Tangle, ziemia

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark, crumbly soil deep under the roots of a forest (around #33261a and #4a3a22): thin rootlets, small stones, a few dry leaves fallen through cracks from far above. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: stones and rootlets 2 to 6 pixels big.
```

### `texture_ground_rootTangle_roots.png`: Root Tangle, korzenie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark soil almost hidden under thick, gnarled roots crawling across it in every direction and twisting over each other (roots brown-grey, #6b4a2a highlights, soil #33261a). It must look slow and tiring to walk through. Even detail spread over the whole square, nothing big in the middle.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: roots 2 to 5 pixels thick.
```

### `texture_ground_fungalDeeps_water.png`: Fungal Deeps, woda

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark, still water in a cave full of fungi (around #1a2a3a) with a faint violet sheen, floating spores and a few tiny glowing violet specks (#c65bd6). Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: ripples and specks 1 to 5 pixels big.
```

### `texture_ground_fungalDeeps_mud.png`: Fungal Deeps, grzybowe podłoże

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: purplish, spongy fungal ground (around #2a2032 and #5a3d66): threads of mycelium, tiny flattened caps and cups, soft lumps, a few faint pink-violet glowing specks. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: lumps and caps 2 to 6 pixels big.
```

### `texture_ground_oldCrypts_water.png`: Old Crypts, zalane płyty

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark, stagnant water (around #1c2a2c) that has flooded the floor of old catacombs: under the surface you can just make out the edges of big stone slabs, a little floating dust and a few pale ripples. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: slab edges and ripples 1 to 4 pixels thick.
```

### `texture_ground_oldCrypts_mud.png`: Old Crypts, posadzka katakumb

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the floor of old catacombs: worn grey-brown flagstones of uneven sizes (around #2e2b27 and #4a4540) with cracks, dust in the joints and a few small bone fragments. No grass, no moss. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: flagstones 12 to 30 pixels across, joints 1 pixel.
```

### `texture_ground_saltMines_mud.png`: Salt Mines, ubite podłoże kopalni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the packed floor of an old salt mine: grey-brown earth mixed with salt (around #4a4440 and #8a8078), faint cart ruts, scattered small white salt crystals. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: crystals and stones 1 to 5 pixels big.
```

### `texture_ground_saltMines_salt.png`: Salt Mines, solna skorupa

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: a dry, cracked crust of dirty salt deep in a dark mine: dim grey-pink, never white (plates around #8a8078 and #9c9188, shadows #4a4440, the brightest pixels #c4bab0 only on a few crystal edges), broken into plates by dark cracks, with sharp little crystals. It must look hard and painful to walk on, but stay as dark and muted as the rest of the underground. Even detail spread over the whole square, nothing big in the middle.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: plates 8 to 20 pixels across, cracks 1 pixel.
```

## Reszta tekstur skał (5)

### `texture_rock_floodedCaves.png`: Flooded Caves, skała

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: wet, dark grey-blue cave rock (around #2e3436), smooth and water-worn, glistening with a few pale highlights, thin cracks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### `texture_rock_rootTangle.png`: Root Tangle, skała

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark brown, earthy rock (around #3a2f25) with thin roots growing through its cracks and a few pale lichen spots. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks, roots and patches 2 to 8 pixels big.
```

### `texture_rock_fungalDeeps.png`: Fungal Deeps, skała

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: dark violet-grey rock (around #2f2836) overgrown with patches of fungus and threads of mycelium, a few tiny violet glowing specks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### `texture_rock_oldCrypts.png`: Old Crypts, mur krypty

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: old crypt masonry: big dark stone blocks (around #3b3732) laid in courses, cracked and chipped, crumbling mortar lines, a little dust. The game uses it for the tops of crypt walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: blocks 16 to 32 pixels long, mortar lines 1 pixel.
```

### `texture_rock_saltMines.png`: Salt Mines, sól kamienna

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: rock salt as seen in a mine wall: grey-pink layers (around #5a524c) with pale streaks and veins of white crystal, a few pick marks. It must read as one solid mass, not as separate stones or tiles. The game uses it for the tops of rock walls and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: layers and veins 2 to 8 pixels thick.
```

## Portret

Od 2026-10-04 portrety w dialogach są malowane (`GAME_DESIGN.md` §13). Ten pixelowy portret zostaje w grze do etapu M5. Prompt na malowany jest w dokumencie z projektem głów, w projekcie Hydra.

### `portrait_oldMotherToad.png`: Old Mother Toad

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a dialogue portrait, a bust (head and shoulders), on the flat magenta background. Portraits are a separate shot: ignore the game camera, show her from the front, turned slightly to the side.
Subject: Old Mother Toad, the ancient guardian of the hydra's lair and its mentor, who has buried eleven generations of hydras. An enormous, very old swamp toad: wrinkled, warty olive-green skin, moss and lichen on her back, heavy half-closed eyes with yellow-green irises, a necklace of small bones and shells. Expression: deadpan, unimpressed, a little tired. A faint yellow-green glow of spores around her.
Size: in the game the portrait is 128 by 160 pixels, so keep the shapes bold and readable.
```

## Mapa: biom po biomie

Teren każdego biomu (grunt i skała) jest już w grze z Twoich tekstur. Żeby biom był kompletny, brakuje mu dekoracji (drobne rzeczy rozrzucone kępami po podłodze), punktu orientacyjnego i miejsc. Poniżej biom po biomie, od leża na zewnątrz. Dekoracja wspólna kilku biomom jest przy pierwszym, który jej używa. Zacznij od Lair Swamp, Flooded Caves i Root Tangle: to okolica startu.

- Dekoracje są malutkie (14×16 pikseli), więc odrzucaj wyniki z drobnymi detalami: po zmniejszeniu zostają tylko duże plamy koloru.
- Fioletowe rzeczy (grzyby, Mother Cap, grzybnia) najlepiej z ciemnym obrysem dookoła. Fiolet już nie znika razem z tłem, ale kolor prawie taki jak magenta tła zniknie.
- Specyfikacja (rozmiary, punkt zaczepienia) jest w `docs/ASSETS.md`.
- Bez promptów zostają: hydra i ludzie Zakonu na mapie (czekają na styl jednostek), przejście na powierzchnię (wróci w M4), przeciąg i echo (zostają z kodu).

## Mapa: Lair Swamp (bagno leża)

Dekoracje: trzciny, kości, kamyki, stalagmit. Do tego leże hydry.

### `map_lair.png`: leże hydry

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: the lair of the hydra, the heart of its swamp: a round, dark pool of swamp water (#12393a) with a thick, glowing rim of sickly yellow-green slime and spores (#c6e04a) all along its edge, a few reeds standing at the back edge, two old bones half sunk in the mud at the front. Much wider than tall, lying low.
Size: in the game it is only 52 by 30 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_deco_reeds.png`: trzciny (też Flooded Caves)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a small clump of swamp reeds growing out of shallow water: four or five stiff stalks of different heights, dark green and olive (#4a6630, #6b8a44), two of them topped with brown cattail heads (#7a5a30), a thin ring of dark water at their foot. The tallest stalk reaches the top of the picture.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_deco_bones.png`: kości (też Old Crypts i Salt Mines)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a few old bones lying on the ground: one long bone, a jawbone and two ribs, pale yellowish white (#d8d0c0, shaded #a89e8c). Low and flat: they take only the bottom third of the picture.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_deco_pebbles.png`: kamyki (we wszystkich biomach)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: three or four small rounded stones lying close together on the ground, dark grey-brown (#4d443a) with a lighter top (#6b6052) where the light falls. Plain, neutral colours, because they lie in every biome. Low: only the bottom quarter of the picture.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_deco_stalagmite.png`: stalagmit (też Flooded Caves)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a single cave stalagmite: a rough cone of wet grey-brown stone growing up from the ground, layered like dripped wax, a pale wet highlight on its left side, darker on the right, a tiny drop of water on its tip. It fills the whole height of the picture and about half its width.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

## Mapa: Flooded Caves

Dekoracje: kałuże, a trzciny, stalagmity i kamyki są wyżej, przy Lair Swamp. Punkt orientacyjny: The Drowned Chapel. Miejsce: Undertow.

### `map_deco_puddle.png`: kałuża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: a small, shallow puddle of clear cave water: an irregular flat oval of dark teal water (#0b2a33 at the edge, #2a6e78 inside) with one bright cyan glint (#7fd0e0). It takes the full width and only the bottom quarter of the picture.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_place_drownedChapel.png`: The Drowned Chapel

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Drowned Chapel, a landmark: the bell tower of a stone chapel of the Order standing out of black water, the rest of the chapel drowned below. A grey stone tower, a dark pointed spire, an arched opening with a golden bell (#d9a93b) still hanging in it, a ring of black water with pale teal ripples around its foot.
Size: in the game it is only 48 by 64 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_undertow.png`: Undertow

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: Undertow: a round pool of black water in the cave floor, turning in a slow spiral, thin pale teal streaks (#7fd0e0) following the spiral.
Size: in the game it is only 40 by 24 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: Root Tangle

Dekoracje: korzenie i kiełki (kamyki przy Lair Swamp). Punkt orientacyjny: The Sunken Oak. Miejsce: Gallows Roots.

### `map_deco_roots.png`: korzeń

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a thick tree root arching up out of the ground and back down into it, like a low wooden snake: dark brown bark (#6b4a2a) with a lighter top edge (#8a6238), two thin rootlets curling off it. Wider than tall: the full width and the bottom half of the picture.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_deco_sprout.png`: kiełek

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a small sapling sprouting from the soil: a thin dark green stem with two or three bright green leaves (#6b9a44), a little limp, the only fresh green thing this far down. About two thirds of the picture's height.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_place_sunkenOak.png`: The Sunken Oak

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Sunken Oak, a landmark: a whole oak tree that fell through the cave ceiling, landed upside down, and has gone on growing out of spite. The trunk stands upright, its roots spread up and out at the top like a crown, its branches are dug into the ground at the bottom. Dark brown bark with lighter left edges, and one single green leaf. Recognisable from far away by its silhouette.
Size: in the game it is only 56 by 64 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_gallowsRoots.png`: Gallows Roots

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: Gallows Roots: roots of the Order's gallows tree growing down from the cave ceiling, hanging from a thick horizontal root at the top. Three of them hold skulls, with the rest of each skeleton hanging below, neatly arranged. A tidy row of small bones lies on the ground under them.
Size: in the game it is only 40 by 40 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: Old Crypts

Dekoracje: urny i złamane kolumny (kości i kamyki przy Lair Swamp). Punkt orientacyjny: The Ossuary Cathedral. Własnego miejsca ten biom jeszcze nie ma.

### `map_deco_urn.png`: urna

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a clay burial urn standing on the ground: a round belly, a narrow neck and a small lid, reddish-brown fired clay (#8a5a3a, lit left side #a8744c), a chipped rim and a thin crack. Most of the picture's height.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_deco_brokenPillar.png`: złamana kolumna

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: the broken stump of a grey stone column with a few carved rings (#6b6458, lit left side #8a8276, shaded right side #4a443c), its top snapped off in a jagged line, a fallen chunk of it lying at its foot on the right. It fills the whole height of the picture.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_place_ossuaryCathedral.png`: The Ossuary Cathedral

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Ossuary Cathedral, a landmark: a gothic cathedral front built of bones and skulls, pale grey-beige: a tall pointed doorway, dark inside with one small warm candle glow, a rose window ringed with skulls above it, a steep gable on top. Solemn and absurd at once.
Size: in the game it is only 56 by 64 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: Salt Mines

Dekoracje: kryształy soli (kości i kamyki przy Lair Swamp). Punkt orientacyjny: The Salt Saint. Miejsca: Brine Lake i Ninefold Camp.

### `map_deco_crystal.png`: kryształy soli

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a small cluster of three salt crystals growing out of the ground, pinkish white (#e8d8e0) with pure white highlights on the left and a pink-grey shaded side (#c8a8b8), sharp straight edges, the middle crystal the tallest, reaching the top of the picture. They belong among pink-brown rock salt with white veins.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_place_saltSaint.png`: The Salt Saint

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Salt Saint, a landmark: a tall statue of a miner carved from white rock salt, standing on a low plinth, a miner's helmet on his head, holding a pick upright beside him. Licked to a shine: bright white highlights on the left, pale grey on the right. Tall and narrow.
Size: in the game it is only 40 by 64 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_brineLake.png`: Brine Lake

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: Brine Lake: a still oval lake of pale grey-green brine (#5a8a8a, lighter in the middle #7aa8a8) with a thick white salt rim and a few white salt crystals on the edge.
Size: in the game it is only 44 by 26 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_ninefoldCamp.png`: Ninefold Camp

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: Ninefold Camp: a small camp of cultists who worship the hydra, nobody in sight: a patched brown canvas tent with a dark opening, a small campfire in front of it, and a tall pole with a green banner showing nine little yellow-green hydra heads. No letters, no text on the banner.
Size: in the game it is only 44 by 40 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: Fungal Deeps

Dekoracje: grzyby zwykłe i świecące (kamyki przy Lair Swamp). Punkt orientacyjny: The Mother Cap. Miejsca: Mycelium Whisper i The Silent Bell.

### `map_deco_mushroom.png`: grzyb

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a single plain cave mushroom that does not glow: a pale lavender stalk (#d8cfe0) and a dull brownish mauve cap (#8a6a5a) with a lighter top. About two thirds of the picture's height.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_deco_glowMushroom.png`: świecący grzyb

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a glowing cave mushroom: a pale stalk (#e8dff0) and a bright violet cap (#c65bd6) with light pink spots (#f0c8f8), and one tiny teal glowing mushroom (#7fd6c8) at its foot. A near-black outline around everything, so no violet touches the background. The cap is the brightest thing in the picture; the game adds a purple light around it. It fills the picture's height.
Size: in the game it is only 14 by 16 pixels. Draw it as tiny pixel art of exactly that size, scaled up with big square pixels: 3 to 5 colours, a dark outline, nothing smaller than one of those pixels.
```

### `map_place_motherCap.png`: The Mother Cap

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Mother Cap, a landmark: a giant mushroom whose cap is the ceiling of the cave: a huge, wide, flat purple cap (#7a3a8a, lighter #a858b8 on top, a few pale pink spots), a thick pale lavender stalk, and a row of glowing pink-white gills underneath. The cap takes the whole width of the picture. A near-black outline all around it, so no purple touches the background.
Size: in the game it is only 64 by 64 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_myceliumWhisper.png`: Mycelium Whisper

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: Mycelium Whisper: a web of glowing mycelium spread over a dark patch of the cave floor, thin purple threads (#c65bd6) running out in all directions from one bright pale pink point in the middle. A near-black outline all around it, so no purple touches the background.
Size: in the game it is only 40 by 26 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_silentBell.png`: The Silent Bell

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Silent Bell: a big bell carved from dark grey stone, hanging in a simple stone frame (two posts and a beam), overgrown with small purple fungi, a faint teal line glowing just under its rim, because it hums too low to hear. A near-black outline all around it, so no purple touches the background.
Size: in the game it is only 32 by 44 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: wszędzie (obiekty i znaleziska)

Stoją w każdym biomie.

### `map_shrine.png`: kapliczka Węża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a forgotten shrine of the Great Serpent: a weathered grey stone pillar on a square plinth, a carved stone serpent coiled around it, climbing to the top and holding a glowing teal gem (#7fe0d6) in its mouth. The gem is the only bright thing; the game adds a teal light around it. Tall and narrow.
Size: in the game it is only 26 by 46 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_muck.png`: złoże mułu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a small glistening lump of dark brown swamp muck (#5b3b1a, dark edge #1b140a) with a wet highlight on top. Low and round, wider than tall.
Size: in the game it is only 16 by 10 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_moisture.png`: źródło

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a small spring: a thin trickle of water falling from the top edge of the picture into a little round pool of blue water (#3f9fb8) with a pale highlight.
Size: in the game it is only 16 by 20 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_muck_rich.png`: bogate złoże mułu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a big glistening heap of dark brown swamp muck with little golden flecks in it. Low and round, wider than tall.
Size: in the game it is only 22 by 14 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_moisture_rich.png`: obfite źródło

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a spring: a thin bright stream of water falling from the top edge of the picture into a wide, shallow pool of blue water (#3f9fb8) with a pale highlight.
Size: in the game it is only 22 by 26 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_remains.png`: szczątki

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: the remains of someone who died in the caves, lying on the ground: a skull, ribs, a long leg bone and a small rotten leather satchel. Pale bone (#e8e0d0). Small and low.
Size: in the game it is only 22 by 14 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_event.png`: kamień eventu (M5)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a lone standing stone, a little taller than wide at the base and leaning slightly, dark grey-blue rock. A coiled serpent spiral is carved into its face and glows faintly teal (#5fd8c8). Dark moss and two or three tiny pale mushrooms at its foot. Old, quiet and a little ominous: something happens here.
Size: in the game it is only 16 by 24 pixels, so keep it simple and bold: a clear silhouette, the spiral as the one bright detail.
```

### `map_hoard.png`: zapasy pod strażą

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a hoard of supplies somebody piled up: a small wooden chest with a gold clasp, a fat sack beside it, a blue glass flask of water, one bone. Small and compact.
Size: in the game it is only 26 by 20 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: miejsca rzadkie

Trafiają się w części światów: The Lost Survey w ślepym zaułku, The Hushed Stair w trzecim pierścieniu.

### `map_place_lostSurvey.png`: The Lost Survey

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Lost Survey: the bones of a survey party of the Order lying on the ground, still holding their instruments: a brass surveying instrument on a wooden tripod standing on the right, two skeletons lying on the left, a few scattered pale papers. Low, except the tripod.
Size: in the game it is only 36 by 26 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_place_hushedStair.png`: The Hushed Stair

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: The Hushed Stair: an opening in a block of grey-purple stone with stone stairs going down into the dark, ending at a dark stone door that has no handle on this side; thin teal lines (#7fe0d6) glowing across the door.
Size: in the game it is only 40 by 44 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: progi zamknięte

Zamknięty próg zagradza tunel między pierścieniami. Gra stawia go z przodu heksa, więc najważniejsza część niech będzie w górnych dwóch trzecich obrazka (dół może zasłonić skała z rzędu przed nim).

### `map_threshold_rubbleChoke.png`: Rubble Choke, zasypany tunel

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a cave tunnel blocked by a mound of fallen rock: big grey-brown boulders at the bottom, smaller broken stones on top, a little dust. It must read at once as "the way is blocked, dig here". The stones are lighter than a dark cave floor (grey-brown around #7a6e60, pale tops #a89a88) with dark outlines between them. The mound is about as wide as it is tall.
Size: in the game it is only 30 by 30 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_rootWall.png`: Root Wall, ściana korzeni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a cave tunnel blocked by a wall of tree roots as thick as a man's leg, grown across it every which way, knotted, with a near-black tangle behind them. Brown roots (#6b4a2a, lit edges #8a6238). It should look stubborn.
Size: in the game it is only 30 by 32 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_saltPlug.png`: Salt Plug, solny korek

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a block of white rock salt sealing a cave tunnel, roughly square with chipped edges. Someone began carving a saint's face into it and gave up: only the brows, one eye and a nose are carved, the rest is blank. Off-white salt (#e8e0d8), the left side brighter where the light falls, the right side greyer, a few sparkling crystals.
Size: in the game it is only 30 by 30 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_smoulderingSeam.png`: Smouldering Seam, tlący się pokład węgla

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a cave tunnel blocked by a wall of black coal that has been smouldering for a century: cracked all over, the cracks glowing orange and yellow from inside (#c84a1a, #f0a040), a few thin threads of grey smoke rising from the top. The game adds an orange light around it.
Size: in the game it is only 30 by 30 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_sealedDoor.png`: Sealed Door, zamknięte drzwi Hushed

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: a round door of grey-purple stone (#5d5866, lit edge #8a8496) set flush into the rock across a cave tunnel, with no handle, no hinge and no keyhole. Carved in its middle is a long, calm face with closed eyes and no mouth at all. Two or three thin teal lines (#7fe0d6) glow faintly in arcs on the stone around the face, like rings of sound. It should look patient, as if it is waiting for something. The game adds a faint teal light.
Size: in the game it is only 30 by 32 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## Mapa: progi otwarte

To, co zostaje po otwarciu progu. Leżą płasko na podłodze (poza Old Workings, które stoi jak framuga), więc mają być niskie i spokojne, jak plama na ziemi.

### `map_threshold_rubbleChoke_open.png`: Rubble Choke po przekopaniu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: what is left after digging through a rubble choke: rubble and broken grey-brown stones pushed to the left and right sides, a clear path through the middle. Low, no tall stones.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_rootWall_open.png`: Root Wall po przegryzieniu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: what is left after a hydra head gnawed through a wall of roots: short brown root stumps sticking out at the left and right sides, their bitten ends pale (#c49a6a), a few wood chips scattered between them.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_saltPlug_open.png`: Salt Plug po rozpuszczeniu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: what is left after acid dissolved a plug of salt: a ragged ring of white salt crust, with a small puddle of pale grey-green brine in the middle.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_smoulderingSeam_open.png`: Smouldering Seam po zduszeniu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: a smothered coal fire: a flat patch of grey ash and black cinders with a few dull dark red embers. No flames, no smoke.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_draughtCrack_open.png`: Draught Crack, odkryta szczelina

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: a dark, jagged crack running across the cave floor from left to right, just wide enough to squeeze through, almost black inside, with three thin wisps of pale air rising out of it.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_cinderScar_open.png`: Cinder Scar, przejście wypalone przez Cinderkin

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: a patch of black glass where the rock melted long ago, smooth and shiny with one pale highlight, a few tiny orange specks still glowing in it (it was made by swarms of tiny fire insects). An irregular oval.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_sealedDoor_open.png`: Sealed Door po otwarciu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: a round door of grey-purple stone (#5d5866) lying flat on the cave floor where it fell, with a long carved face on it, eyes closed and no mouth, looking up; a crack runs across the stone, and the thin carved arcs around the face have gone dark grey.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_cinderBore_open.png`: Cinder Bore, świeży tunel Cinderkin

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the cave floor, seen from the game's angle (so round things look like wide ovals). The game draws the floor itself: draw only the thing, no floor tile, no hexagon, no shadow around it.
Subject: the floor of a tunnel melted fresh through the rock by swarms of tiny fire insects: black glass, still soft, with bright runnels of molten rock (orange #e0702a, yellow #ffcf5c) running across it and a few tiny glowing specks. An irregular oval. The game adds a flickering orange light while it is hot.
Size: in the game it is only 30 by 22 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_threshold_oldWorkings_open.png`: Old Workings, wylot szybu Zakonu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground.
Subject: the mouth of an old mine shaft dug by the Order: two timber props and a beam across the top, cut dead straight, unlike anything else down here; two iron rails on wooden sleepers running in between them; a small brass lantern of the Order (#d9a93b) hanging on the right prop, long out. It stands up like a doorway.
Size: in the game it is only 30 by 30 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## M4: powierzchnia

Powierzchnia to kraina nad jaskiniami: pola, lasy, wzgórza, wsie i zamek Zakonu, pod otwartym niebem. Wszystko z tej sekcji jest już w grze jako grafika zastępcza rysowana w kodzie, więc kolejność jest dowolna. Specyfikacja (rozmiary, punkt zaczepienia, gdzie gra stawia światło) jest w `docs/ASSETS.md`.

- Stały blok stylu opisuje ciemne podziemia, więc każdy prompt z tej sekcji dopisuje, że to powierzchnia w dziennym świetle. Noc gra robi sama, przyciemniając obraz, więc wszystko rysujemy w dzień.
- Tekstury to pięć kwadratów, tak jak w podziemiach: pole, las, wzgórze, woda i skała. Drzewa stoją na heksach lasu osobno (`map_tree`).
- Do obiektów na mapie dołącz oddział z jednym zbrojnym (`oddzial-pixel.png`), a do ludzi w bitwie pixelowego Man-at-Arms (`man-at-arms-pixel.png`), oba z `hydra-grafika/wzory/`, żeby piksele wyszły tej samej wielkości.
- Ogień zamku, kapliczki, obozu i kosza żarowego świeci w grze. Po imporcie przesunę światło na narysowany płomień.

### `texture_ground_surface_field.png`: pole i łąka (najczęstszy grunt na powierzchni)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: rough pasture and fallow fields of the countryside: short, dull green grass (around #66763a) with patches of dry yellowish grass (#8a8a4a), a few spots of bare brown earth (#5a4a30), a few tiny white and yellow wildflowers and small grey stones. Even detail spread over the whole square, nothing big in the middle, low contrast, so the hydra and the Order stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: details 2 to 6 pixels big.
```

### `texture_ground_surface_forest.png`: las (dno lasu; drzewa gra stawia osobno)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the floor of an old, dark wood seen from above: dark green moss (around #324a26) and brown fallen leaves (#5a4a2a), small ferns, a few twigs and thin roots, one or two tiny pale toadstools. Draw no trees and no tree trunks: the game puts the trees on top. Even detail spread over the whole square, nothing big in the middle, low contrast, so the hydra and the Order stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: details 2 to 6 pixels big.
```

### `texture_ground_surface_hill.png`: wzgórze

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a dry, stony hillside: thin brownish grass (around #7e7250), patches of bare earth, scattered grey stones and small rocks, a few tufts of dark heather. Even detail spread over the whole square, nothing big in the middle, low contrast, so the hydra and the Order stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: details 2 to 6 pixels big.
```

### `texture_ground_surface_water.png`: woda (staw, rzeka)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the still water of a pond or a slow river in the countryside: grey-blue water (around #3a5a68) with a few pale ripples and the dull glint of a grey sky, a few small dark lily pads and floating leaves. Even detail spread over the whole square, nothing big in the middle, low contrast, so the hydra and the Order stay readable on top of it.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: details 2 to 6 pixels big.
```

### `texture_rock_surface.png`: skała na powierzchni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square rock texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: bare, weathered grey rock of the hills above the caves (around #6a6258), with cracks, pale yellow-green and rusty orange specks of lichen and a little dry grass in the cracks. It must read as one solid mass of stone, not as separate stones or tiles. The game uses it for the tops of rock outcrops and, darkened, for their sides.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: cracks and patches 2 to 8 pixels big.
```

### `map_castle.png`: zamek Zakonu z Wiecznym Płomieniem

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the Castle of the Eternal Flame, the seat of the Order: a tall square keep of pale grey stone between two round towers with battlements, a shut gate of dark wood with a gold flame (#d9a93b) over it, red banners (#9e2323) bearing a gold flame on the towers. Behind the keep rises the spire of the cathedral, and on its very top a wide stone bowl holding the Eternal Flame (fire #ffcf5c in the middle, orange #e0702a at the edges), the brightest thing in the picture: the game adds its light. Stern, solemn, a little too proud of itself. A dark outline all around.
Size: in the game it is only about 112 by 104 pixels, so the biggest thing on the map but still small: one clear silhouette, the flame on top must be easy to spot from afar.
```

### `map_flame_shrine.png`: kapliczka Płomienia, płonąca

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a Flame Shrine of the Order, standing by a road: a slim pillar of pale stone on a stepped plinth, a bronze bowl on top with a tall flame burning in it (fire #ffcf5c in the middle, orange #e0702a at the edges), and a small banner-red pennant (#9e2323) with a gold flame hanging from an iron arm. The flame is the brightest thing; the game adds a warm light around it. Tall and narrow. A dark outline all around.
Size: in the game it is only about 44 by 68 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_flame_shrine_out.png`: kapliczka Płomienia zgaszona przez hydrę

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. Draw it right after the burning shrine, in the same conversation: it is THE SAME shrine. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the same Flame Shrine after the hydra put it out: the same pillar and plinth, the bronze bowl cold, black and wet, no flame at all, the pennant torn and hanging limp, and pale greenish mist (#a9b8a8) spilling over the rim of the bowl and down the pillar. Quiet and a little sad, in the Order's eyes. A dark outline all around.
Size: in the game it is only about 44 by 52 pixels, so keep it simple and bold: it is shorter than the burning shrine, because there is no flame.
```

### `map_settlement_camp.png`: obóz Zakonu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a field camp of the Order: two canvas tents (off-white with red stripes), a tall pole with a banner-red flag (#9e2323) bearing a gold flame (#d9a93b), a rack of spears and, in front, low on the ground, a small campfire (orange #e0702a, fire #ffcf5c): the game adds its light there. A dark outline all around.
Size: in the game it is only about 64 by 52 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_settlement_village.png`: wieś

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a small, poor village of the people who live under the Order: three humble cottages huddled together, thatched roofs (straw #9a8048), whitewashed walls with dark timber, every shutter closed, a small gold flame painted over one door, a low wattle fence and a well. Nothing glows. A dark outline all around.
Size: in the game it is only about 76 by 56 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_settlement_mill.png`: młyn wodny

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a watermill: a small house of stone and timber with a big wooden water wheel on its right side, a sack of flour by the door. The game draws the water, so draw only the house and the wheel; the bottom of the wheel touches the bottom of the picture. A dark outline all around.
Size: in the game it is only about 64 by 64 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_settlement_watchtower.png`: wieża strażnicza Zakonu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a watchtower of the Order: a tall, narrow wooden tower on four braced legs with a small roofed platform on top, a little bronze alarm bell hanging under the roof, a banner-red pennant with a gold flame, and the ladder pulled up and hanging beside the platform. Tall and narrow. A dark outline all around.
Size: in the game it is only about 36 by 76 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_tree.png`: drzewo (las na powierzchni)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: one old broadleaf tree of the woods above: a round, dense, dark green crown (#324a26, a little lighter #4a6a34 on the upper left) on a short dark trunk. Several of them stand together on every forest hex, so keep it plain: no fruit, no birds, nothing special. A dark outline all around.
Size: in the game it is only about 36 by 52 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_find.png`: coś leży (łup do zabrania)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: things somebody left lying about in the open: a fat grain sack, a clay pot and a coil of rope. Small and low, wider than tall. A dark outline all around.
Size: in the game it is only about 32 by 24 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_relight.png`: Torchbearerzy idą rozpalić kapliczkę

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: Torchbearers of the Order on their way to light a shrine again: two lay brothers in plain brown wool habits (#6b4a2a) with rope belts and tonsured heads, walking a little to the right. The front one holds a burning torch high (fire #ffcf5c, orange #e0702a), the brightest thing in the picture; the one behind carries a wooden ladder on his shoulder. Dead serious about it. A dark outline all around.
Size: in the game it is only about 52 by 60 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `map_passage_down.png`: zejście do podziemi widziane z góry

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, of something lying flat on the ground, seen from the game's angle (so round things look like wide ovals). The game draws the ground itself: draw only the thing, no ground tile, no hexagon, no shadow around it. Attached is the pixel-art marker of one soldier with a banner from the game's map: draw this in THE SAME style, with the same size of pixels, the same dark outline, the same colours and the same view, so they clearly belong together. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: a way down into the caves, as seen from the surface: a dark, jagged crack in the ground between a few mossy grey stones, pitch black inside, with thin wisps of pale greenish mist (#a9b8a8) rising out of it. Wider than tall. A dark outline around the stones.
Size: in the game it is only about 64 by 44 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

### `battle_enemy_censerPriest.png`: Censer Priest, kapłan z kadzielnicą (rozwiewa mgłę)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Censer Priest of the Order of the Eternal Flame: a priest, not a soldier, standing, seen from the side and a little from above, facing RIGHT. A long cream-white robe (#e0d8c4) with a red stole (#c23a2a) embroidered with small gold flames, a tonsured head (bald crown, a ring of hair), a calm, pious and slightly smug face, sandals. In his right hand, in front of him, he swings a bronze censer on a long chain, with thick curls of pale grey-brown incense smoke (#a89c86) pouring out of it: the smoke that drives the hydra's mist away. No weapon and no armour. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is only about 60 by 80 pixels, a man next to a hydra body about 288 pixels wide, so keep it bold: one clear silhouette. The white robe and the censer with its smoke must read at that size.
```

### `battle_enemy_brazierBearer.png`: Brazier Bearer, brat z koszem żarowym (suszy arenę)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: a Brazier Bearer of the Order of the Eternal Flame: a big, broad lay brother, standing, seen from the side and a little from above, facing RIGHT. A dark brown habit (#5a4030) with the sleeves rolled up, a heavy leather apron with a small gold flame (#d9a93b) on it, thick leather gloves, a leather cap. He carries in front of him, by its two handles, a heavy iron brazier basket full of glowing coals (orange #e0702a, fire #ffcf5c), the brightest thing in the picture. Sweaty and dutiful. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is only about 56 by 76 pixels, a man next to a hydra body about 288 pixels wide, so keep it bold: one clear silhouette. The glowing basket must read at that size.
```

### `battle_brazier.png`: kosz żarowy postawiony na arenie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Draw it right after the Brazier Bearer, in the same conversation: it is the basket he carries, now set down.
Subject: a brazier standing on the battle ground: a round iron basket full of glowing coals on three thin iron legs, small flames licking up from the coals (fire #ffcf5c in the middle, orange #e0702a at the edges). The flames are the brightest thing; the game adds a flickering light and dries the ground around it. A dark outline all around.
Size: in the game it is only about 32 by 44 pixels, so keep it simple and bold: a clear silhouette and a few big shapes, no fine detail.
```

## M7: zamek Wiecznego Płomienia

Szturm na zamek i finał (GAME_DESIGN.md §5.7, §6.6; plan M7). Wszystko z tej sekcji jest już w grze jako grafika zastępcza rysowana w kodzie, więc kolejność jest dowolna. Specyfikacja jest w `docs/ASSETS.md`, sekcja „The castle (M7)”.

- Szturm to trzy bitwy: brama i krużganek na dziedzińcu zamku, potem katedra z Wiecznym Płomieniem. Plansze malujemy z kwadratowych tekstur, tak jak w podziemiach: dziedziniec (posadzka i mur) i katedra (posadzka i mur).
- Do ludzi w bitwie dołącz pixelowego Man-at-Arms (`man-at-arms-pixel.png` z `hydra-grafika/wzory/`), do bramy na mapie obrazek zamku z gry, kiedy już będzie.
- Portret Wielkiego Mistrza do dialogów malujemy jak portrety głów (nie pixel art), więc nie ma go tutaj; dopiszę prompt, kiedy wrócimy do portretów.

### `texture_ground_castleYard_ground.png`: dziedziniec zamku, płyty

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the paved yard of the Order's castle: big, worn, pale grey flagstones (around #6e6a62 and #8a857a) laid in neat rows, the joints dark and filled with old ash, a few faint scorch marks and drops of candle wax. Swept, orderly and joyless. No grass, no moss. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: flagstones 16 to 32 pixels across, joints 1 pixel.
```

### `texture_rock_castleYard.png`: mur dziedzińca

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the side of the castle's yard, a wall of big dressed blocks of grey stone (around #4a4642 and #2a2826) in regular courses, with dark mortar lines and a few soot stains. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: blocks 16 to 24 pixels wide, mortar 1 pixel.
```

### `texture_ground_cathedral_ground.png`: posadzka katedry

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the floor of the cathedral of the Eternal Flame, indoors and lit only by fire: polished black marble slabs (around #1c1412 and #2e2628) under a wide runner of deep red carpet (#5a1c18) with a thin gold border (#b08a3a), worn pale where generations of knights have knelt. The carpet runs from edge to edge so the texture repeats. Even detail, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: slabs 24 to 32 pixels across, the gold border 1 to 2 pixels.
```

### `texture_rock_cathedral.png`: mur katedry

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a seamless square ground texture that fills the whole picture edge to edge (no magenta, no border). Seen straight from above, completely flat: no perspective, no horizon, ignore the camera angle for this one.
Subject: the inside wall of the cathedral: dark stone blocks (around #141012 and #2e2628) with thin gold lines of a painted flame pattern, half lost in soot. Even detail spread over the whole square, nothing big in the middle, low contrast.
Size: drawn as pixel art about 96 by 96 pixels, so keep the shapes chunky: blocks 16 to 24 pixels wide.
```

### `battle_enemy_grandMaster.png`: Grand Master Ignatius Vell, ostatni boss

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite, centred, on the flat magenta background. Attached is the pixel-art Man-at-Arms from the game: draw another member of THE SAME Order in the same style (the same size of pixels, the same dark outline, the same view, the same warm colours), so they clearly belong together.
Subject: Grand Master Ignatius Vell, keeper of the Eternal Flame and head of the whole Order, standing tall, seen from the side and a little from above, facing RIGHT. Very old, very straight. A long white robe (#ece4d0, shaded #a8a090) over gilded plate (#d9a93b), a red stole embroidered with gold flames, a tall gold mitre with a red flame on it, a long white beard. In his right hand, held out in front of him towards the enemy, a long gold crozier topped with a small burning bowl (fire #ffcf5c in the middle, orange #e0702a at the edges). He has done this every night for thirty years and is not in a hurry. Feet on the ground at the bottom middle of the picture. A dark outline all around. No ground and no shadow: the game adds them.
Size: in the game he is about 60 by 88 pixels, a little taller than the other soldiers, so keep it bold: one clear silhouette. The white, the gold and the tall mitre must make him the most important man on the board at a glance, more than the Master of the Order.
```

### `battle_eternal_flame.png`: Wieczny Płomień w katedrze

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the pixel-art Man-at-Arms from the game: draw this in THE SAME style, with the same size of pixels, the same dark outline and the same view.
Subject: the Eternal Flame of the Order, burning in its cathedral: a tall pedestal of pale carved stone on a wide step, holding a big bronze bowl, and in the bowl a tall, steady fire (fire #ffcf5c in the middle, orange #e0702a at the edges, a white-yellow core). Solemn and a little too proud of itself. The fire is the brightest thing in the picture; the game adds its light, makes it flicker and shrink as the hydra smothers it, and darkens the stone when it is out. A dark outline all around.
Size: in the game it is about 80 by 112 pixels, as tall as two soldiers: the pedestal up to about their shoulders, the fire above. Keep it bold: a clear silhouette and a few big shapes.
```

### `map_castle_open.png`: zamek z otwartą bramą

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the ground under it, so draw no floor, no ground and no shadow: its lowest pixels are where it touches the ground. Attached is the game's own map_castle picture (the castle with its gate shut): draw THE SAME castle again, pixel for pixel the same where nothing changes, in the same style and size. This is the land ABOVE the caves, under the open sky, drawn in plain daylight on an overcast day (the game darkens it at night): here the colours are those of a grey, damp countryside, muted and a little cold: grass green #66763a, dark wood green #324a26, dry hill brown #7e7250, grey-blue water #3a5a68, grey stone #6a6258; the Order's red, gold and fire stay as above.
Subject: the Castle of the Eternal Flame exactly as in the attached picture, but with its gate OPEN: the two dark wooden doors swung back against the wall, and behind them a black archway. Nothing else changes: the same keep, towers, banners and the Eternal Flame burning on top of the spire. A dark outline all around.
Size: in the game it is about 112 by 104 pixels, the same as the shut castle.
```

## Wielki świat: mapa w stylu Songs of Conquest

Nowe grafiki do etapu „Wielki świat” (decyzja z 2026-11-07, `GAME_DESIGN.md` §13). Mapa ma być gęsta, z wysokością i życiem, a nie z pojedynczych ikonek. Każdy biom dostaje osiem rodzajów obrazków:

| Plik | Co to jest | Jak gra go używa |
|---|---|---|
| `map_props_<biom>` | arkusz 8 drobiazgów | rozsiewa je ławicami, po kilka na heks, z losowym odbiciem |
| `map_patches_<biom>` | arkusz 6 płaskich plam | maluje je na podłożu pod wszystkim |
| `map_clump_<biom>_<nazwa>` (3 sztuki) | gęsta grupa rzeczy na 2–3 heksy | stawia je w komorach jak lasy w Heroes |
| `texture_wall_<biom>` | pas ściany skalnej widzianej z przodu | ściany przy uskokach i pod skałą |
| `map_landmark_<biom>` | duży punkt orientacyjny na ok. 3 heksy | zamiast małego landmarku |
| `discovery_<biom>` | szeroki widok krainy | pokazuje go przy pierwszym wejściu do biomu, z nazwą |

**Kolejność: zacznij od Flooded Caves** (9 obrazków, razem z prądem wody `map_current`). To próba: gdy wejdą do gry, zobaczysz, czy to ten kierunek. Jeśli chcesz robić dalej, zanim je obejrzysz, reszta biomów ma prompty w tym samym układzie: Lair Swamp (okolica startu), Root Tangle, Old Crypts, Salt Mines, Fungal Deeps.

Na co uważać przy nowych rodzajach:

- **Arkusze (`map_props_…`, `map_patches_…`, `map_current`):** rzeczy nie mogą się stykać, między nimi ma być magenta. Liczba nie musi się zgadzać co do sztuki: gra weźmie tyle, ile znajdzie (do 12). Jeśli GPT skleja rzeczy albo dorysowuje podłogę, dopisz: „more magenta space between the props, no floor”.
- **Drobiazgi** rysuj w prawdziwych proporcjach względem siebie: kamyk ma być dużo mniejszy niż stalagmit, bo gra zmniejsza cały arkusz tak samo.
- **Plamy** mają być ciemne i spokojne, prawie w kolorze podłoża. Jasne plamy będą wyglądały jak dziury w mapie.
- **Ściana (`texture_wall_…`)** wypełnia cały obrazek, bez magenty, poziomo. Gra powtarza ją w bok, więc nie może mieć nic dużego tylko w jednym miejscu.
- **Widok krainy (`discovery_…`)** wypełnia cały obrazek, poziomo. Gra wycina środkowy pas, więc góra i dół mogą zniknąć.
- Pliki wrzucaj jak zawsze do `art/raw/` z nazwą z nagłówka. Po wrzuceniu na GitHuba gra sama je wczyta przy najbliższym wdrożeniu (kilka minut), nawet gdy mnie nie będzie.
## Wielki świat: Flooded Caves

### `map_props_floodedCaves.png`: Flooded Caves, drobiazgi (arkusz 8)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of eight separate small props on the flat magenta background, in two rows of four, with wide gaps of magenta between them: no prop may touch another. Each prop stands on its own invisible ground line and is seen from the game's angle. Draw them at their true sizes relative to each other (a pebble is far smaller than a stalagmite). Each prop is one solid connected shape: no sparkles, drops or bits floating apart from it. No floor, no shadow, no hexagon, no labels or numbers.
Subject, the eight props:
1. a slender wet stalagmite, grey-teal stone with a pale highlight on its left side (the tallest prop)
2. two short stalagmites growing side by side, one broken off
3. a small tuft of dark reeds standing in shallow water
4. a cluster of three pale cave lilies on dark floating leaves, a faint cyan glow in the flowers (#7fd0e0)
5. a lump of glowing blue-green cave algae on a wet stone
6. a rusty helmet of the Order, half sunk in the mud, a tiny dent on top
7. a broken stalactite tip lying on its side
8. three smooth water-worn pebbles (the smallest prop)
Size: in the game the biggest prop is about 48 by 56 pixels and the smallest only 10 to 14 pixels across. Draw them as chunky pixel art with big square pixels: 3 to 6 colours each, a dark outline, nothing smaller than one of those pixels.
```

### `map_patches_floodedCaves.png`: Flooded Caves, plamy na podłożu (arkusz 6)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of six separate flat patches on the flat magenta background, in two rows of three, with wide gaps of magenta between them: no patch may touch another. Each patch lies flat on the cave floor, seen from the game's angle, so it is a wide, low, irregular blob about twice as wide as tall. The game paints them onto its own ground, so give them ragged edges broken into single pixels, no outline, and keep them dark and low in contrast, only a little lighter or darker than the floor around. Nothing stands up out of them. No floor around them, no shadow, no hexagon, no labels or numbers.
Subject, the six patches:
1. a shallow puddle of black water with two cyan glints (#7fd0e0)
2. a pale fan of grey silt washed out over the floor
3. a slick of blue-green algae on wet stone
4. a scatter of small wet pebbles and grit
5. rings of ripples on dark water, very faint
6. a little terrace of rimstone pools: three stepped, pale-rimmed shallow basins
Size: each about 80 by 40 pixels in the game. Chunky pixel art with big square pixels, 3 to 5 colours each.
```

### `map_clump_floodedCaves_stalagmites.png`: Flooded Caves, a forest of stalagmites

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a dense forest of six to nine wet stalagmites of different heights, grey-teal limestone layered like dripped wax, pale wet highlights on their left sides, cyan drips (#7fd0e0) glinting on a few tips, black water pooling between their feet.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_floodedCaves_rimstone.png`: Flooded Caves, stopnie basenów naciekowych

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a staircase of rimstone pools: five or six stepped, curved basins of pale cream-grey calcite (#b8b8a0) holding still, dark teal water (#0f3a3d), each rim catching a thin line of light, tiny cyan glints on the water, a few small stalagmites at the back.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_floodedCaves_reedbed.png`: Flooded Caves, gęste trzciny w wodzie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a dense bed of dark swamp reeds and cattails growing out of black water, twenty or more stiff stalks of different heights (#4a6630, #6b8a44), brown cattail heads (#7a5a30), a few pale cave lilies at the front edge.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `texture_wall_floodedCaves.png`: Flooded Caves, ściana uskoku

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a texture that fills the whole picture edge to edge (no magenta, no border), in a wide landscape picture: the face of a rock wall seen straight from the front, the cliff where a raised floor drops to a lower one. The top edge of the picture is the lip of the floor above, the bottom edge is where the wall meets the floor below. It must repeat seamlessly from left to right, so nothing big that only works once, and no light or shadow that changes from one side to the other.
Subject: wet layered limestone, grey-teal (#2e3436 to #3e4a4a), with pale flowstone curtains running down it, thin dark cracks, a few glistening drips, a darker band of wet stone and green-black slime along the bottom where the water touches it, a rough lip of stone along the top.
Size: drawn as pixel art about 192 by 64 pixels, so keep the shapes chunky: cracks, ledges and drips 2 to 8 pixels big.
```

### `map_landmark_floodedCaves.png`: The Drowned Chapel, duża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one large game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor tile, no hexagon and no shadow around it: its lowest pixels are where it stands. It is a landmark the player sees from far away and uses to find the way, about three tiles of ground wide, so make the silhouette strong and easy to recognise.
Subject: The Drowned Chapel, the landmark of the Flooded Caves: a stone chapel of the Order drowned in black water up to its roof. Its grey stone bell tower stands out in the middle with a dark pointed spire and an arched opening where a golden bell (#d9a93b) still hangs; beside it the ridge of the drowned nave roof, two broken pointed arches and a few steps sinking into the water; pale teal ripples (#7fd0e0) round everything, a faint gold gleam on the bell.
Size: about 176 by 192 pixels in the game. More detail than the small props, but nothing smaller than 2 pixels, a dark outline on the outside, light from the upper left, its own glow where the subject says so.
```

### `map_current.png`: Flooded Caves, prąd wody (arkusz 3)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of three separate small flat shapes on the flat magenta background, side by side with wide gaps of magenta between them: no shape may touch another. They lie flat on dark water, seen from the game's angle. The game slides them along a current, so they show which way the water flows (to the right). No water around them, no shadow.
Subject: small elongated flecks of pale foam (#a9c8c8) with short trails of ripple lines behind them, like water rushing past, longer than wide, all pointing to the right.
Size: each about 60 by 28 pixels in the game. Chunky pixel art, 2 or 3 colours, pale and soft against dark water.
```

### `discovery_floodedCaves.png`: Flooded Caves, widok krainy przy odkryciu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a wide scene that fills the whole picture edge to edge (no magenta, no border, no text): a pixel art vista the game shows across the screen when the player first enters this part of the underworld, like the title card of a new land. Landscape picture with deep perspective into the distance, darkness all around, the only light from glows. Keep everything important in the middle band of the picture: the top and bottom fifth will be cut off.
Subject: a vast flooded cavern: a lake of still black water reflecting points of cyan light (#7fd0e0), forests of stalagmites rising out of it, long stalactites hanging from the darkness above, rimstone terraces along the near shore, and far away in the middle the tip of a drowned bell tower with a faint gold gleam. Cold teal, near-black and cyan.
Size: shown about 1280 by 480 pixels in the game. Draw it as pixel art about 480 by 320 pixels scaled up, with big square pixels, dithering for the darkness, no smooth gradients.
```

## Wielki świat: Lair Swamp

### `map_props_lairSwamp.png`: Lair Swamp, drobiazgi (arkusz 8)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of eight separate small props on the flat magenta background, in two rows of four, with wide gaps of magenta between them: no prop may touch another. Each prop stands on its own invisible ground line and is seen from the game's angle. Draw them at their true sizes relative to each other (a pebble is far smaller than a stalagmite). Each prop is one solid connected shape: no sparkles, drops or bits floating apart from it. No floor, no shadow, no hexagon, no labels or numbers.
Subject, the eight props:
1. a clump of swamp reeds with two brown cattail heads (the tallest prop)
2. a low mound of mud and moss with a glowing yellow-green slime mould on top (#c6e04a)
3. a cluster of glowing frog spawn in a shallow puddle: pale eggs with yellow-green dots
4. a half-sunk old bone sticking out of the mud
5. a fat bubble of swamp gas swelling on the mud
6. a tuft of pale swamp mushrooms on thin stalks
7. a rotten log stump covered with moss
8. three dark pebbles in mud (the smallest prop)
Size: in the game the biggest prop is about 48 by 56 pixels and the smallest only 10 to 14 pixels across. Draw them as chunky pixel art with big square pixels: 3 to 6 colours each, a dark outline, nothing smaller than one of those pixels.
```

### `map_patches_lairSwamp.png`: Lair Swamp, plamy na podłożu (arkusz 6)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of six separate flat patches on the flat magenta background, in two rows of three, with wide gaps of magenta between them: no patch may touch another. Each patch lies flat on the cave floor, seen from the game's angle, so it is a wide, low, irregular blob about twice as wide as tall. The game paints them onto its own ground, so give them ragged edges broken into single pixels, no outline, and keep them dark and low in contrast, only a little lighter or darker than the floor around. Nothing stands up out of them. No floor around them, no shadow, no hexagon, no labels or numbers.
Subject, the six patches:
1. a slick of bright green duckweed on dark water
2. a dark puddle of black swamp mud
3. a thin film of glowing yellow-green slime (#c6e04a), very faint
4. a carpet of dark moss
5. cracked, drying mud
6. a scatter of dark pebbles and silt
Size: each about 80 by 40 pixels in the game. Chunky pixel art with big square pixels, 3 to 5 colours each.
```

### `map_clump_lairSwamp_reedbed.png`: Lair Swamp, gęste trzciny bagna

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a dense bed of swamp reeds and cattails standing in black water, twenty or more stalks of different heights (#4a6630, #6b8a44), brown cattail heads (#7a5a30), yellow-green glints of slime on the water (#c6e04a).
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_lairSwamp_bogmound.png`: Lair Swamp, kopiec z mułu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a big mound of black mud and dark moss rising out of the swamp, old bones half sunk in it, glowing yellow-green slime mould (#c6e04a) dripping down one side, a few pale mushrooms on top.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_lairSwamp_spawn.png`: Lair Swamp, skrzek w płyciźnie

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a shallow corner of the swamp crowded with glowing frog spawn: heaps of pale translucent eggs with yellow-green dots (#c6e04a), reeds round the back, two big lily pads at the front.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `texture_wall_lairSwamp.png`: Lair Swamp, ściana uskoku

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a texture that fills the whole picture edge to edge (no magenta, no border), in a wide landscape picture: the face of a rock wall seen straight from the front, the cliff where a raised floor drops to a lower one. The top edge of the picture is the lip of the floor above, the bottom edge is where the wall meets the floor below. It must repeat seamlessly from left to right, so nothing big that only works once, and no light or shadow that changes from one side to the other.
Subject: a bank of dark wet earth and stone (#3a3129 and #2c3420), roots and hanging moss poking out of it, a few pale stones embedded, dark wet slime along the bottom where the swamp water touches it, a ragged lip of moss along the top.
Size: drawn as pixel art about 192 by 64 pixels, so keep the shapes chunky: cracks, ledges and drips 2 to 8 pixels big.
```

### `map_landmark_lairSwamp.png`: leże hydry, duże

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one large game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor tile, no hexagon and no shadow around it: its lowest pixels are where it stands. It is a landmark the player sees from far away and uses to find the way, about three tiles of ground wide, so make the silhouette strong and easy to recognise.
Subject: the lair of the hydra, the heart of its swamp: a wide round pool of dark swamp water (#12393a) with a thick glowing rim of yellow-green slime and spores (#c6e04a), a nest of broken reeds, mud and old bones heaped on one side of it, big bones and a cracked helmet of the Order half sunk in the mud at the front, a few glowing eggs in the nest. Much wider than tall, lying low.
Size: about 176 by 192 pixels in the game. More detail than the small props, but nothing smaller than 2 pixels, a dark outline on the outside, light from the upper left, its own glow where the subject says so.
```

## Wielki świat: Root Tangle

### `map_props_rootTangle.png`: Root Tangle, drobiazgi (arkusz 8)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of eight separate small props on the flat magenta background, in two rows of four, with wide gaps of magenta between them: no prop may touch another. Each prop stands on its own invisible ground line and is seen from the game's angle. Draw them at their true sizes relative to each other (a pebble is far smaller than a stalagmite). Each prop is one solid connected shape: no sparkles, drops or bits floating apart from it. No floor, no shadow, no hexagon, no labels or numbers.
Subject, the eight props:
1. a small arch of a gnarled root coming out of the ground and going back in (the tallest prop)
2. a thick root knot with a pale sprout growing from it
3. a cluster of pale, sickly shoots growing in the dark
4. a blob of glowing amber sap (#d9a93b) on a root
5. a heap of empty beetle shells, dark and glossy
6. a small toadstool growing on a piece of root
7. a fallen acorn the size of a head, cracked open
8. a few dark clods of earth (the smallest prop)
Size: in the game the biggest prop is about 48 by 56 pixels and the smallest only 10 to 14 pixels across. Draw them as chunky pixel art with big square pixels: 3 to 6 colours each, a dark outline, nothing smaller than one of those pixels.
```

### `map_patches_rootTangle.png`: Root Tangle, plamy na podłożu (arkusz 6)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of six separate flat patches on the flat magenta background, in two rows of three, with wide gaps of magenta between them: no patch may touch another. Each patch lies flat on the cave floor, seen from the game's angle, so it is a wide, low, irregular blob about twice as wide as tall. The game paints them onto its own ground, so give them ragged edges broken into single pixels, no outline, and keep them dark and low in contrast, only a little lighter or darker than the floor around. Nothing stands up out of them. No floor around them, no shadow, no hexagon, no labels or numbers.
Subject, the six patches:
1. a mat of thin dead rootlets on dark soil
2. dark soil crossed by a few thin roots
3. a small puddle of glowing amber sap (#d9a93b), very faint
4. worm casts and turned soil
5. a patch of dark moss on soil
6. a scatter of bark chips and earth
Size: each about 80 by 40 pixels in the game. Chunky pixel art with big square pixels, 3 to 5 colours each.
```

### `map_clump_rootTangle_rootarches.png`: Root Tangle, łuki z korzeni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a tangle of huge gnarled roots arching out of the ground and back in, thick as tree trunks, dark brown bark (#3a2f25, #4a3a22), a few glowing amber sap drops (#d9a93b), pale shoots at their feet.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_rootTangle_stump.png`: Root Tangle, pień do góry nogami

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a huge broken tree trunk stuck upside down in the ground, its torn roots spreading up into the air like a crown, dark bark, moss, a glowing amber blob of sap (#d9a93b) on its side.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_rootTangle_rootnest.png`: Root Tangle, gniazdo korzeni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a low nest of roots woven together like a basket, as if something lives inside, a dark hole at its front, pale shoots and two old bones around it.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `texture_wall_rootTangle.png`: Root Tangle, ściana uskoku

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a texture that fills the whole picture edge to edge (no magenta, no border), in a wide landscape picture: the face of a rock wall seen straight from the front, the cliff where a raised floor drops to a lower one. The top edge of the picture is the lip of the floor above, the bottom edge is where the wall meets the floor below. It must repeat seamlessly from left to right, so nothing big that only works once, and no light or shadow that changes from one side to the other.
Subject: a wall of dark packed earth (#33261a and #3a2f25) bristling with roots: thick roots and thin rootlets hang out of it and curl down, a few stones stuck in the earth, a lip of tangled roots along the top.
Size: drawn as pixel art about 192 by 64 pixels, so keep the shapes chunky: cracks, ledges and drips 2 to 8 pixels big.
```

### `map_landmark_rootTangle.png`: The Sunken Oak, duży

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one large game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor tile, no hexagon and no shadow around it: its lowest pixels are where it stands. It is a landmark the player sees from far away and uses to find the way, about three tiles of ground wide, so make the silhouette strong and easy to recognise.
Subject: The Sunken Oak, the landmark of the Root Tangle: a whole ancient oak that fell through the ceiling and landed upside down, its crown buried in the ground and its huge roots spreading up into the darkness like a chandelier, still growing; dark bark, pale new shoots on the roots, glowing amber sap (#d9a93b) seeping from cracks.
Size: about 176 by 192 pixels in the game. More detail than the small props, but nothing smaller than 2 pixels, a dark outline on the outside, light from the upper left, its own glow where the subject says so.
```

### `discovery_rootTangle.png`: Root Tangle, widok krainy przy odkryciu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a wide scene that fills the whole picture edge to edge (no magenta, no border, no text): a pixel art vista the game shows across the screen when the player first enters this part of the underworld, like the title card of a new land. Landscape picture with deep perspective into the distance, darkness all around, the only light from glows. Keep everything important in the middle band of the picture: the top and bottom fifth will be cut off.
Subject: a cavern swallowed by roots: huge gnarled roots thick as towers coming down from the darkness above and twisting into the ground, an upside-down oak hanging in the distance like a chandelier, pale shoots and drops of glowing amber sap (#d9a93b) the only light, dark brown earth, a narrow way winding between the roots into the distance.
Size: shown about 1280 by 480 pixels in the game. Draw it as pixel art about 480 by 320 pixels scaled up, with big square pixels, dithering for the darkness, no smooth gradients.
```

## Wielki świat: Old Crypts

### `map_props_oldCrypts.png`: Old Crypts, drobiazgi (arkusz 8)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of eight separate small props on the flat magenta background, in two rows of four, with wide gaps of magenta between them: no prop may touch another. Each prop stands on its own invisible ground line and is seen from the game's angle. Draw them at their true sizes relative to each other (a pebble is far smaller than a stalagmite). Each prop is one solid connected shape: no sparkles, drops or bits floating apart from it. No floor, no shadow, no hexagon, no labels or numbers.
Subject, the eight props:
1. a broken stone pillar, the top snapped off (the tallest prop)
2. a tall clay urn with a cracked lid
3. a small pile of skulls
4. three stubs of candles with tiny warm flames (#e0b060)
5. a toppled gravestone with a worn carving
6. an iron candlestick with one lit candle
7. a broken lid of a stone coffin lying on the floor
8. a few broken bones (the smallest prop)
Size: in the game the biggest prop is about 48 by 56 pixels and the smallest only 10 to 14 pixels across. Draw them as chunky pixel art with big square pixels: 3 to 6 colours each, a dark outline, nothing smaller than one of those pixels.
```

### `map_patches_oldCrypts.png`: Old Crypts, plamy na podłożu (arkusz 6)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of six separate flat patches on the flat magenta background, in two rows of three, with wide gaps of magenta between them: no patch may touch another. Each patch lies flat on the cave floor, seen from the game's angle, so it is a wide, low, irregular blob about twice as wide as tall. The game paints them onto its own ground, so give them ragged edges broken into single pixels, no outline, and keep them dark and low in contrast, only a little lighter or darker than the floor around. Nothing stands up out of them. No floor around them, no shadow, no hexagon, no labels or numbers.
Subject, the six patches:
1. cracked flagstones of a crypt floor
2. a scatter of grey bone dust and small bones
3. a spill of old candle wax, pale yellow
4. a puddle of dark water on flagstones
5. a scatter of rubble and broken stone
6. a faded floor mosaic, half covered in dust
Size: each about 80 by 40 pixels in the game. Chunky pixel art with big square pixels, 3 to 5 colours each.
```

### `map_clump_oldCrypts_sarcophagi.png`: Old Crypts, rząd sarkofagów

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a row of three stone sarcophagi of different sizes, worn carved lids, one lid pushed aside, candles burning on two of them (#e0b060), a few skulls on the floor in front.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_oldCrypts_colonnade.png`: Old Crypts, zawalona kolumnada

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a collapsed colonnade: four stone pillars, two standing and two broken, a fallen arch lying across the rubble between them, dust and bones in the cracks.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_oldCrypts_skullshelves.png`: Old Crypts, regały czaszek

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a free-standing ossuary shelf of dark stone filled with rows of skulls and stacked long bones, arranged neatly by size, a candle on top (#e0b060).
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `texture_wall_oldCrypts.png`: Old Crypts, ściana uskoku

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a texture that fills the whole picture edge to edge (no magenta, no border), in a wide landscape picture: the face of a rock wall seen straight from the front, the cliff where a raised floor drops to a lower one. The top edge of the picture is the lip of the floor above, the bottom edge is where the wall meets the floor below. It must repeat seamlessly from left to right, so nothing big that only works once, and no light or shadow that changes from one side to the other.
Subject: a crypt wall of fitted grey-brown stone blocks (#3b3732 and #4a4540), arched burial niches in it filled with skulls and bones, thin cracks, old candle wax dripped down from a ledge, a worn stone cornice along the top.
Size: drawn as pixel art about 192 by 64 pixels, so keep the shapes chunky: cracks, ledges and drips 2 to 8 pixels big.
```

### `map_landmark_oldCrypts.png`: The Ossuary Cathedral, duża

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one large game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor tile, no hexagon and no shadow around it: its lowest pixels are where it stands. It is a landmark the player sees from far away and uses to find the way, about three tiles of ground wide, so make the silhouette strong and easy to recognise.
Subject: The Ossuary Cathedral, the landmark of the Old Crypts: the front of an underground cathedral built of stone and bones, a pointed doorway, a rose window made of skulls, a bell gable topped with a bone spire, chandeliers of bones glowing with warm candlelight (#e0b060) inside the doorway.
Size: about 176 by 192 pixels in the game. More detail than the small props, but nothing smaller than 2 pixels, a dark outline on the outside, light from the upper left, its own glow where the subject says so.
```

### `discovery_oldCrypts.png`: Old Crypts, widok krainy przy odkryciu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a wide scene that fills the whole picture edge to edge (no magenta, no border, no text): a pixel art vista the game shows across the screen when the player first enters this part of the underworld, like the title card of a new land. Landscape picture with deep perspective into the distance, darkness all around, the only light from glows. Keep everything important in the middle band of the picture: the top and bottom fifth will be cut off.
Subject: an endless underground necropolis: rows of stone tombs and pillars going far into the darkness, walls of skulls in niches, warm candlelight (#e0b060) flickering here and there, a bone cathedral glowing faintly in the far distance, grey-brown stone and dust.
Size: shown about 1280 by 480 pixels in the game. Draw it as pixel art about 480 by 320 pixels scaled up, with big square pixels, dithering for the darkness, no smooth gradients.
```

## Wielki świat: Salt Mines

### `map_props_saltMines.png`: Salt Mines, drobiazgi (arkusz 8)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of eight separate small props on the flat magenta background, in two rows of four, with wide gaps of magenta between them: no prop may touch another. Each prop stands on its own invisible ground line and is seen from the game's angle. Draw them at their true sizes relative to each other (a pebble is far smaller than a stalagmite). Each prop is one solid connected shape: no sparkles, drops or bits floating apart from it. No floor, no shadow, no hexagon, no labels or numbers.
Subject, the eight props:
1. a tall cluster of pale pink-white salt crystals (the tallest prop)
2. a small cluster of white salt crystals
3. a broken wooden mine cart tipped on its side, spilling salt
4. a pickaxe stuck in a block of salt
5. a wooden support post with a cross beam
6. an iron lantern hanging on a short post, giving a weak pale light (#f0d8d0)
7. two sacks of salt leaning on each other
8. a few lumps of rock salt (the smallest prop)
Size: in the game the biggest prop is about 48 by 56 pixels and the smallest only 10 to 14 pixels across. Draw them as chunky pixel art with big square pixels: 3 to 6 colours each, a dark outline, nothing smaller than one of those pixels.
```

### `map_patches_saltMines.png`: Salt Mines, plamy na podłożu (arkusz 6)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of six separate flat patches on the flat magenta background, in two rows of three, with wide gaps of magenta between them: no patch may touch another. Each patch lies flat on the cave floor, seen from the game's angle, so it is a wide, low, irregular blob about twice as wide as tall. The game paints them onto its own ground, so give them ragged edges broken into single pixels, no outline, and keep them dark and low in contrast, only a little lighter or darker than the floor around. Nothing stands up out of them. No floor around them, no shadow, no hexagon, no labels or numbers.
Subject, the six patches:
1. a white crust of salt on grey ground
2. a pinkish puddle of brine with a pale rim
3. a short straight piece of mine-cart rails on sleepers
4. crushed salt gravel
5. old boot prints in salt dust
6. a spill of white salt from a sack
Size: each about 80 by 40 pixels in the game. Chunky pixel art with big square pixels, 3 to 5 colours each.
```

### `map_clump_saltMines_crystals.png`: Salt Mines, wielkie kryształy soli

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a huge cluster of salt crystals as tall as a house, pale pink and white (#f0d8d0, #d8b8b0), sharp facets catching the light, smaller crystals around its foot.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_saltMines_timbering.png`: Salt Mines, obudowa chodnika

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: the timber frame of a mine tunnel standing in the open: three wooden posts and beams, one beam broken and hanging, a heap of fallen salt rock under it, an old lantern on a nail.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_saltMines_saltpile.png`: Salt Mines, hałda soli

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a big heap of white and grey rock salt with an abandoned mine cart and a shovel stuck in it, a few pink crystals poking out.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `texture_wall_saltMines.png`: Salt Mines, ściana uskoku

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a texture that fills the whole picture edge to edge (no magenta, no border), in a wide landscape picture: the face of a rock wall seen straight from the front, the cliff where a raised floor drops to a lower one. The top edge of the picture is the lip of the floor above, the bottom edge is where the wall meets the floor below. It must repeat seamlessly from left to right, so nothing big that only works once, and no light or shadow that changes from one side to the other.
Subject: a wall of layered rock salt in bands of grey, white and dusty pink (#5a524c, #8a8078, #d8b8b0), chisel marks of old miners, a few glinting crystal veins, a lip of rough salt along the top.
Size: drawn as pixel art about 192 by 64 pixels, so keep the shapes chunky: cracks, ledges and drips 2 to 8 pixels big.
```

### `map_landmark_saltMines.png`: The Salt Saint, duży

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one large game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor tile, no hexagon and no shadow around it: its lowest pixels are where it stands. It is a landmark the player sees from far away and uses to find the way, about three tiles of ground wide, so make the silhouette strong and easy to recognise.
Subject: The Salt Saint, the landmark of the Salt Mines: a huge statue of a miner carved out of pale pink-white rock salt, holding a pickaxe like a holy relic, licked to a shine in places, standing on a block of salt with steps cut into it, small offerings at its feet.
Size: about 176 by 192 pixels in the game. More detail than the small props, but nothing smaller than 2 pixels, a dark outline on the outside, light from the upper left, its own glow where the subject says so.
```

### `discovery_saltMines.png`: Salt Mines, widok krainy przy odkryciu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a wide scene that fills the whole picture edge to edge (no magenta, no border, no text): a pixel art vista the game shows across the screen when the player first enters this part of the underworld, like the title card of a new land. Landscape picture with deep perspective into the distance, darkness all around, the only light from glows. Keep everything important in the middle band of the picture: the top and bottom fifth will be cut off.
Subject: a gigantic salt cavern: walls of layered white and pink salt rising into darkness, timber walkways and ladders of old miners clinging to them, cart rails curving away into the distance, a huge salt statue glowing faintly pink (#f0d8d0) far away, dust hanging in the air.
Size: shown about 1280 by 480 pixels in the game. Draw it as pixel art about 480 by 320 pixels scaled up, with big square pixels, dithering for the darkness, no smooth gradients.
```

## Wielki świat: Fungal Deeps

### `map_props_fungalDeeps.png`: Fungal Deeps, drobiazgi (arkusz 8)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of eight separate small props on the flat magenta background, in two rows of four, with wide gaps of magenta between them: no prop may touch another. Each prop stands on its own invisible ground line and is seen from the game's angle. Draw them at their true sizes relative to each other (a pebble is far smaller than a stalagmite). Each prop is one solid connected shape: no sparkles, drops or bits floating apart from it. No floor, no shadow, no hexagon, no labels or numbers.
Subject, the eight props:
1. a tall thin mushroom with a wide violet cap (the tallest prop)
2. a glowing mushroom, violet-pink light in its cap (#c65bd6)
3. shelf fungi growing on a stone
4. a fat puffball letting out a little puff of spores (the puff touches it)
5. a round spore pod, cracked open
6. a net of slime mould on a stone
7. a tiny ring of small mushrooms
8. a few small round mushrooms (the smallest prop)
Size: in the game the biggest prop is about 48 by 56 pixels and the smallest only 10 to 14 pixels across. Draw them as chunky pixel art with big square pixels: 3 to 6 colours each, a dark outline, nothing smaller than one of those pixels.
```

### `map_patches_fungalDeeps.png`: Fungal Deeps, plamy na podłożu (arkusz 6)

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a sheet of six separate flat patches on the flat magenta background, in two rows of three, with wide gaps of magenta between them: no patch may touch another. Each patch lies flat on the cave floor, seen from the game's angle, so it is a wide, low, irregular blob about twice as wide as tall. The game paints them onto its own ground, so give them ragged edges broken into single pixels, no outline, and keep them dark and low in contrast, only a little lighter or darker than the floor around. Nothing stands up out of them. No floor around them, no shadow, no hexagon, no labels or numbers.
Subject, the six patches:
1. a web of pale white mycelium threads on dark ground
2. a dust of glowing violet spores (#c65bd6), very faint
3. a patch of violet moss
4. rotting mushroom mush, dark purple
5. a flat fairy ring of tiny mushrooms
6. dark, damp, spongy ground
Size: each about 80 by 40 pixels in the game. Chunky pixel art with big square pixels, 3 to 5 colours each.
```

### `map_clump_fungalDeeps_giantcaps.png`: Fungal Deeps, olbrzymie grzyby

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a stand of giant mushrooms as tall as trees, thick pale stalks and wide violet caps (#5a3d66), some caps glowing violet-pink underneath (#c65bd6), small mushrooms crowding their feet.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_fungalDeeps_puffballs.png`: Fungal Deeps, purchawki

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a cluster of huge puffballs, pale and lumpy, one of them bursting with a cloud of glowing spores that touches it, small mushrooms around.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `map_clump_fungalDeeps_myceliummound.png`: Fungal Deeps, kopiec grzybni

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one game sprite on the flat magenta background: a dense group of things standing close together, as wide as two or three tiles of ground, seen from the game's angle. Its lowest pixels are where it stands on the ground; the things in it overlap each other, the ones at the back taller. Draw no floor tile, no hexagon and no shadow around it. It is one connected shape: nothing floating apart from it.
Subject: a mound overgrown with thick white mycelium like cotton, glowing violet nodes in it (#c65bd6), shelf fungi on its sides, a bone half swallowed by the threads.
Size: about 128 by 112 pixels in the game, much wider than tall. Bold shapes and a clear silhouette, details no smaller than 2 pixels, a dark outline on the outside.
```

### `texture_wall_fungalDeeps.png`: Fungal Deeps, ściana uskoku

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a texture that fills the whole picture edge to edge (no magenta, no border), in a wide landscape picture: the face of a rock wall seen straight from the front, the cliff where a raised floor drops to a lower one. The top edge of the picture is the lip of the floor above, the bottom edge is where the wall meets the floor below. It must repeat seamlessly from left to right, so nothing big that only works once, and no light or shadow that changes from one side to the other.
Subject: a dark violet-grey stone wall (#2f2836) overgrown with shelf fungi, white mycelium threads running down the cracks, small glowing mushrooms (#c65bd6) in the crevices, a soft lip of mushrooms and moss along the top.
Size: drawn as pixel art about 192 by 64 pixels, so keep the shapes chunky: cracks, ledges and drips 2 to 8 pixels big.
```

### `map_landmark_fungalDeeps.png`: The Mother Cap, duży

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: one large game sprite on the flat magenta background, standing on the bottom edge of the picture. The game draws the cave floor under it, so draw no floor tile, no hexagon and no shadow around it: its lowest pixels are where it stands. It is a landmark the player sees from far away and uses to find the way, about three tiles of ground wide, so make the silhouette strong and easy to recognise.
Subject: The Mother Cap, the landmark of the Fungal Deeps: one colossal mushroom, older than the Order, its stalk as wide as a tower and covered with smaller mushrooms, its huge cap glowing violet-pink from underneath (#c65bd6), thick white mycelium roots spreading from its foot, spores drifting down.
Size: about 176 by 192 pixels in the game. More detail than the small props, but nothing smaller than 2 pixels, a dark outline on the outside, light from the upper left, its own glow where the subject says so.
```

### `discovery_fungalDeeps.png`: Fungal Deeps, widok krainy przy odkryciu

```text
Pixel art game asset for "Hydra", a dark fantasy roguelite about a hydra from an underground swamp. Crisp low-resolution pixel art with big, clearly visible square pixels: no anti-aliasing, no blur, no soft gradients (dithering only), no text, no signature, no frame, no border.
Colours: a cold, dark underground of near-black #05090a, deep teal #0e3b3f, swamp green #2f4a2a and sickly yellow-green bioluminescence #c6e04a; the Order of the Eternal Flame brings warm gold #d9a93b, orange #e0702a, banner red #9e2323 and fire #ffcf5c; mist is pale greenish grey #a9b8a8. Muted and dark overall, only glows and fire are bright.
Camera: one angle for the whole game, a three-quarter view from above, about 45 degrees above the ground; light from the upper left.
Background: one flat, solid magenta #FF00FF everywhere around the subject, with no shadow, gradient or floor on it, unless the request below says the image is a texture that fills the whole picture.

Request: a wide scene that fills the whole picture edge to edge (no magenta, no border, no text): a pixel art vista the game shows across the screen when the player first enters this part of the underworld, like the title card of a new land. Landscape picture with deep perspective into the distance, darkness all around, the only light from glows. Keep everything important in the middle band of the picture: the top and bottom fifth will be cut off.
Subject: a forest of giant mushrooms underground: towering stalks and wide caps glowing violet-pink from below (#c65bd6), drifting spores like slow snow, white mycelium covering the ground, one colossal mushroom in the far distance, deep violet and near-black.
Size: shown about 1280 by 480 pixels in the game. Draw it as pixel art about 480 by 320 pixels scaled up, with big square pixels, dithering for the darkness, no smooth gradients.
```
