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

Hydra dostaje wygląd z okładki i portretów: stary brąz w czarnej siatce, kremowe płyty brzucha, mech. Najpierw próba na dwóch obrazkach, tułowiu i głowie Bitera (razem z próbą Zakonu i hydry na mapie z następnej sekcji). Wstawię je do gry i pokażę zrzuty, a prompty na pozostałe osiem głów dopiszę po próbie.

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
- Prompty na Headhuntera, Torchbearera i dwa większe oddziały dopiszę po próbie. Pozostałe typy Zakonu (§6.6) dostaną prompty, gdy wejdą do gry ich zasady.
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
