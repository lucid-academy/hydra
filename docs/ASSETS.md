# Assets — graphics specification

Every graphic is loaded by a key from `src/assets/manifest.json`. To replace a placeholder with a picture from GPT:

1. Save the picture as `art/raw/<key>.png`, e.g. `art/raw/battle_body.png` (any size; prompts are in `docs/ART_PROMPTS.md`).
2. Run `npm run art`. It removes the magenta background, trims and shrinks the picture to the size listed below, saves it to `public/images/<key>.png` and sets `"file"` in the manifest. It also saves a copy with twice the pixels in each direction to `public/images-hd/<key>.png`, for the game in HD (`?hd=1`, GAME_DESIGN.md §13). The originals in `art/raw/` are never changed, so the import can be run again at any time (e.g. once the palette is settled).
3. No code changes needed.

A finished PNG at the exact size can also go straight into `public/images/`, with its path (relative to `public/`) as `"file"` in the manifest.

How `npm run art` treats each kind of image (`scripts/artImport.ts`):

- **Textures** (`texture_*`): no background; the middle square of the picture is squashed to the listed size.
- **Full-screen pictures** (`title_background`): cropped to the screen's shape and shrunk.
- **Everything else** stands on magenta: the background goes, stray specks go, and the figure is fitted into its box keeping its shape. Things that stand (soldiers, the body, decorations, objects, portraits) sit on the bottom edge of the box; others in the middle.
- **Purple** stays, even where it touches the background (since 2026-10-05): the import clears only clearly magenta pixels, magenta in shadow, and the soft edge where the background blends into the figure. Colours almost as magenta as the background itself (red and blue high, green near zero) still go with it, and a dark outline around purple and pink things still gives the cleanest edge.
- **Tinted images** (heads, mist, marks) are turned grey, the brightest part white.
- **Shrinking** gives each game pixel the most common colour of the block of pixels it covers, so no blurred colours appear.
- **Animations:** frames as `art/raw/<key>_frame1.png`, `_frame2.png`... (or several figures side by side on one picture when the manifest entry has `"frames"`), cut with one common box and saved as a strip; `"frames"` in the manifest says how many.
- **Palette:** when `art/palette.json` exists (`{"colors": ["#rrggbb", ...]}`), every colour is replaced by the nearest palette colour. There is none for now: colours stay as drawn (Piotr's decision of 2026-10-06, `GAME_DESIGN.md` §13).

General rules for all graphics (use them in every image-generator prompt):

- Pixel art, hard pixel edges, no anti-aliasing, no blur, no gradients smoother than pixel dithering.
- The game is laid out on a **640×360** screen, and every size below is in its units. The classic game draws at exactly that and scales up by whole numbers (2×, 3×); the game in HD (`?hd=1`, GAME_DESIGN.md §13) draws at the screen's resolution and uses art with **twice the pixels** of the listed size (a 14×16 decoration is a 28×32 picture). Pictures from GPT are much bigger anyway: the import makes both sizes.
- Palette (from `src/data/palette.json`): cold underground — near-black `#05090a`, deep teal `#0e3b3f`, swamp green `#2f4a2a`, sickly yellow-green bioluminescence `#c6e04a`; warm Order — gold `#d9a93b`, orange `#e0702a`, banner red `#9e2323`, fire `#ffcf5c`; mist — pale greenish grey `#a9b8a8`, semi-transparent.
- Mood: dark fantasy with deadpan humour. Cold mist against warm firelight.

## title_background

| | |
|---|---|
| Size | 640×360 px |
| Frames | 1 (static) |
| Anchor | top-left (0, 0) |
| Background | opaque, fills the whole screen |
| Used in | title screen |

Composition: night over a swamp. Top ~40% dark sky. On the right a hill with the castle of the Order of the Eternal Flame and a cathedral spire topped by a tiny bright flame; a few warm lit windows. Lower ~40% swamp water, murky green with teal ripples and scattered yellow-green glowing spores. Low bands of pale mist drift over the water from the left. Leave the **top centre** (about x 180–460, y 30–130) calm and dark: the game draws the title "HYDRA" and a subtitle there. Leave the **bottom centre** (about y 300–340) calm too: "Press to start" goes there.

Prompt sketch: *"Pixel art, 640x360, hard pixels, no anti-aliasing. Night over a dark swamp. On a hill to the right, a gothic castle with a cathedral spire topped by a small eternal flame, a few warm orange windows. Murky green swamp water with teal ripples, yellow-green bioluminescent spores, pale greenish mist drifting low from the left. Cold palette of teal, black and swamp green against small warm gold and orange lights. Empty dark area top centre for a title."*

## Terrain textures: texture_ground_<biome>_<kind>, texture_rock_<biome>

| | |
|---|---|
| Size | 96×67 px each: a 96×96 square squashed to the camera angle |
| Frames | 1 |
| Anchor | none (never drawn on its own) |
| Background | none: the texture fills the whole image |
| Used in | map ground and rock tiles, battle board tiles |

Real ground is not drawn hex by hex. GPT draws a square texture, straight from above and flat; the import squashes its height to 0.7 (the camera looks at the ground from about 45°), and when the game starts it cuts the tiles out of it: `map_ground_<biome>_<kind>` (30×28), `battle_tile_<biome>_<kind>` (42×46) and, from the rock texture, `map_rock_<biome>` (30×40). Each tile is cut 8 times from different parts of the texture, so neighbouring hexes differ. The game adds a 1 px darker rim to every hex face and builds the walls under its lower edges from the biome's rock texture (or the ground texture if there is no rock yet), darker on the left, lighter on the right. A tile image with its own file in the manifest wins over the texture. The battle board uses the texture of the ground the encounter stood on (water, mud, roots or salt).

Keys, one per kind of ground in each biome (`src/data/biomes.json`): `lairSwamp` (water, mud), `floodedCaves` (water, mud), `rootTangle` (mud, roots), `fungalDeeps` (water, mud), `oldCrypts` (water, mud), `saltMines` (mud, salt), and one rock texture per biome. Prompts: `docs/ART_PROMPTS.md`.

The texture should be even all over (nothing big in the middle, nothing that only works once), low in contrast, with chunky detail 2–6 px big at the game size. It does not have to tile seamlessly: the game never repeats it side by side.

## Map graphics: the underground seen from a slant

The strategic map uses the same slanted view as the battle, in the spirit of Songs of Conquest: the ground is a carpet of squashed hexes in each biome's look, rock is raised into blocks, and decorations, objects and the hydra stand up on their hexes. Rules for every map graphic, on top of the general ones above:

- Hexes are 30 px wide and 24 px tall on screen; hex centres are 30 px apart within a row and rows are 18 px apart.
- Light from the upper left. Transparent background outside the drawn shape.
- Things that stand on a hex have their **feet at the bottom middle** of the image; the game puts the feet 3 px below the hex centre.
- The numbers the game relies on are also in `src/assets/mapArt.ts`.
- Biomes (`src/data/biomes.json`) decide which ground, rock and decoration images a hex uses. A new biome needs its own `map_ground_…` and `map_rock_…` images in the manifest; with `"file": null` the game draws a placeholder from the biome's colours.
- **In HD** (`?hd=1`) the map has no hex tiles: the ground is painted straight from the terrain textures (`texture_ground_…`, `texture_rock_…`) as one surface, rock raised 12 px with cliffs and shadows (`src/assets/groundPainter.ts`). `map_ground_…`, `map_rock_…`, `map_mark` and `map_fog_edge` are not used there. The light, the soft shadows under things, the darkness and the line around where the hydra can go are made in code and are not art to replace.

## Map ground: map_ground_<biome>_<water|mud|roots|salt>

| | |
|---|---|
| Size | 30×28 px each |
| Frames | 1 |
| Anchor | middle of the hex face, (15, 12) |
| Background | transparent outside the tile |
| Used in | strategic map, one per open hex |

A squashed pointy-top hex seen from a slant: top point (15, 0), straight sides at x=0 and x=29 from y=6 to y=18, bottom point (15, 23). Below its two lower edges, a 4 px earth wall (only seen at the edge of the known map, where it makes the ground look like a thick carpet). Keep the face quiet, with a slightly darker 1 px rim so the grid reads faintly; decorations are drawn on top.

Current keys (biome × ground): `lairSwamp` (water, mud), `floodedCaves` (water, mud), `rootTangle` (mud, roots), `fungalDeeps` (water, mud), `oldCrypts` (water, mud), `saltMines` (mud, salt). For the first four the manifest also lists the other combinations, in case a biome's ground shares change.

- **water:** murky still water in the biome's tint, a few light ripples.
- **mud:** the biome's floor: swamp mud (Lair Swamp), wet stone and silt (Flooded Caves), dark soil (Root Tangle), purplish spongy fungal ground (Fungal Deeps).
- **roots:** dark soil with thick roots crawling across it (2 movement points: it should look slow).
- **salt:** a dry, cracked white crust with crystals catching the light (3 movement points: it should look hard going).
- In **Old Crypts** the "mud" is the floor of old catacombs: worn flagstones, dust, cracks.

Prompt sketch: *"Pixel art game tile, 30x28 pixels, transparent background. A pointy-top hexagon floor tile seen from a slanted top-down angle (squashed, 30 wide and 24 tall) with a 4 px earth edge below its lower sides. [Dark olive swamp mud / murky teal water with faint ripples / dark soil with thick crawling roots / purplish spongy fungal ground]. Low contrast, dark underground cave, hard pixels, no anti-aliasing."*

## Map rock: map_rock_<biome>

| | |
|---|---|
| Size | 30×40 px |
| Frames | 1 |
| Anchor | middle of the hex it stands on, (15, 24); its top face is raised 12 px above that |
| Background | transparent |
| Used in | strategic map, impassable rock |

The hex raised into a rough block of cave rock: the top face (same shape as a ground tile, at the top of the image) with rock walls below it down to the ground, darker on the left. It hides what stands right behind it, like a cave wall. In the biome's rock colour.

## Map decorations: map_deco_<kind>

| | |
|---|---|
| Size | 14×16 px each |
| Frames | 1 |
| Anchor | bottom middle (7, 15) |
| Background | transparent |
| Used in | strategic map, scattered over open hexes (each biome lists its kinds in biomes.json) |

Small things that make each biome feel different. They do nothing in the game. Each biome lists its kinds in `src/data/biomes.json`; pebbles lie in every biome and bones in three, so keep those two in neutral colours.

- **reeds** (the only thing that grows out of water), **bones**, **pebbles**, **stalagmite**, **puddle**, **roots**, **sprout**, **mushroom**,
- **crystal:** pale pink-white salt crystals (Salt Mines),
- **urn:** a clay burial urn, **brokenPillar:** the stump of a stone column with a fallen chunk (Old Crypts),
- **glowMushroom:** a mushroom with a bright cap; the game adds a light in the biome's glow colour around it.

## Map objects

| Key | Size | What |
|---|---|---|
| map_lair | 52×30 | The lair: a dark pool with a glowing yellow-green rim, reeds and old bones around it. Anchor: bottom middle, 9 px below the hex centre. |
| map_shrine | 26×46 | A shrine of the Great Serpent: a stone pillar on a plinth, a serpent coiled round it, a glowing teal gem on top. |
| map_passage | 40×64 | A way up to the surface: rubble on the ground under a shaft of pale light falling from a crack in the cave roof. |
| map_muck | 16×10 | A glistening lump of swamp muck. |
| map_moisture | 16×20 | A spring: a small pool with water trickling down into it from above. |
| map_encounter_1, _2, _3 | 22×36, 36×38, 44×40 | People of the Order waiting there, with a red banner bearing a gold flame. More of them and a bigger banner the stronger the group: one soldier (tier 1), two (tier 2), three with a torch (tier 3). Tier 1 is drawn (2026-10-06: a Man-at-Arms beside a banner on a pole, as tall and narrow as GPT drew it); tiers 2 and 3 are still drawn in code. |
| map_hydra | 26×28 | The hydra on the map: the battle body in miniature, bronze like the cover (GAME_DESIGN.md §13), with three heads on short necks and amber eyes. Drawn since 2026-10-06. The map draws it over everything on its own hex, so on its lair it sits in the pool, in front of the glowing rim. |

All objects: 1 frame, anchor at the feet (bottom middle) unless noted, transparent background.

## Map thresholds: map_threshold_<id>, map_threshold_<id>_open

Thresholds are the few ways through the rock bands between the rings of the world (`GAME_DESIGN.md` §9.3, `src/data/world.json`). Each has two images: **closed** (it blocks the tunnel; the hydra has to deal with it) and **open** (what is left once it is dealt with). 1 frame each, transparent background.

**Closed** (`map_threshold_<id>`): 30×30 px (`rootWall` 30×32). Anchor: bottom middle; the game puts it **10 px below the hex centre**, at the front of the hex, so it fills the tunnel. The hex under it is drawn as the floor it will have when open. Rock in the row in front may hide its lowest few pixels, so put the important part in the upper two thirds.

| Key | What |
|---|---|
| map_threshold_rubbleChoke | A mound of fallen boulders and broken stone filling the tunnel, biggest stones at the bottom. Grey-brown, lighter than the cave floor so it reads as rubble. Dug through over a few turns. |
| map_threshold_rootWall | Roots as thick as a man's leg grown across the tunnel every which way, a darker tangle behind them. A Biter gnaws through. |
| map_threshold_saltPlug | A block of white rock salt sealing the tunnel. Someone began carving a saint's face into it and stopped after the brows, one eye and a nose. An Acid Spitter dissolves it. |
| map_threshold_smoulderingSeam | A wall of black coal, cracked, glowing orange from inside, a few threads of smoke. The game adds an orange light. A Mist Breather smothers it. |

`draughtCrack` has no closed image: while hidden it looks like plain rock, and the game draws drifting air (`map_draught`) on the hexes next to it.

**Open** (`map_threshold_<id>_open`): 30×22 px. They **lie flat on the hex** (drawn under everything that stands): anchor bottom middle, 10 px below the hex centre, so the image covers the hex face, its top edge at the top point of the face. Keep them low and quiet, like a stain on the floor. Exception: `map_threshold_oldWorkings_open` is 30×30 and **stands** like a closed one (feet 10 px below the hex centre).

| Key | What |
|---|---|
| map_threshold_rubbleChoke_open | Rubble pushed to both sides of a way dug through, a clear path in the middle. |
| map_threshold_rootWall_open | Gnawed root stumps at both sides, the bitten ends pale; wood chips on the floor. |
| map_threshold_saltPlug_open | A crust of white salt round the edges where the plug was, a little puddle of brine in the middle. |
| map_threshold_smoulderingSeam_open | A patch of grey ash with a few dull red embers, smothered. |
| map_threshold_draughtCrack_open | A dark, jagged crack across the floor, wide enough to squeeze through, pale wisps of air rising from it. |
| map_threshold_cinderScar_open | A patch of black glass where the rock melted long ago, a few orange specks still warm (made by the Cinderkin, tiny fire insects, in huge numbers). |
| map_threshold_oldWorkings_open | The mouth of an old shaft of the Order: two timber props and a beam, cut dead straight, rails running in, a long-dead lantern of the Order (gold) hanging on a nail. |

## Map places: map_place_<id>

Places are the things worth finding in the world (`src/data/world.json`, `places`). 1 frame each, transparent background, **feet at the bottom middle**, which the game puts 3 px below the hex centre, like every standing object. Light from the upper left. The game adds a soft light over most of them (`PLACE_GLOWS` in `src/scenes/MapScene.ts`), so a glowing part can stay modest.

**Landmarks** are tall, one per biome, meant to be recognised from afar. When one stands in front of the hydra, a closed threshold, an encounter or a shrine, the game makes it see-through (anything 40 px or taller), so the bottom of a landmark can be busy but the silhouette should read on its own.

| Key | Size | Biome | What |
|---|---|---|---|
| map_place_sunkenOak | 56×64 | Root Tangle | A whole oak that fell through the ceiling and landed upside down: its roots spread up like a crown, its branches dug into the floor, one green leaf out of spite. |
| map_place_drownedChapel | 48×64 | Flooded Caves | The bell tower of a chapel of the Order standing out of black water: grey stone, a pointed spire, a golden bell in the arch. |
| map_place_ossuaryCathedral | 56×64 | Old Crypts | A gothic cathedral front built of bone: a tall arch, a rose window ringed with skulls, a gable, a candle glowing inside the dark door. |
| map_place_saltSaint | 40×64 | Salt Mines | A tall statue of a miner carved from white salt, holding his pick, standing on a plinth, licked to a shine. |
| map_place_motherCap | 64×64 | Fungal Deeps | A giant mushroom whose cap is the ceiling of the cave: a wide purple cap, a pale stalk, gills glowing pink-white underneath. |

**Locations** (1–2 per biome) and **rare places**:

| Key | Size | What |
|---|---|---|
| map_place_undertow | 40×24 | Flooded Caves. A round pool of black water turning in a slow spiral, pale teal streaks on it. Lies low. |
| map_place_gallowsRoots | 40×40 | Root Tangle. Roots grown down from the Order's gallows tree above, hanging from a beam of root, holding skulls and bones, filed neatly. |
| map_place_brineLake | 44×26 | Salt Mines. A still lake of pale grey-green brine with a thick white salt rim. Lies low. |
| map_place_ninefoldCamp | 44×40 | Salt Mines. A camp of the Ninefold (cultists who adore the hydra): a patched tent, a small fire, and a green banner with nine little heads on it. |
| map_place_myceliumWhisper | 40×26 | Fungal Deeps. A web of glowing purple mycelium spreading over the floor from one bright point. Lies low. |
| map_place_silentBell | 32×44 | Fungal Deeps. A big stone bell of the Hushed hanging in a stone frame, overgrown with purple fungus, a faint teal line of humming under it. |
| map_place_lostSurvey | 36×26 | Rare, in a dead end. The bones of a survey party of the Order, still holding their instruments: a brass instrument on a tripod, scattered papers. |
| map_place_hushedStair | 40×44 | Rare, ring 3. Stone stairs going down to a dark doorway with a door that has no handle on this side; faint teal lines humming on the door. |

## Map finds: map_remains, map_hoard, map_muck_rich, map_moisture_rich

1 frame each, transparent background, feet at the bottom middle (3 px below the hex centre).

| Key | Size | What |
|---|---|---|
| map_remains | 22×14 | Someone who died here, lying down: a skull, ribs, long bones, what is left of a satchel. Greyed out by the game once searched. |
| map_hoard | 26×20 | Supplies somebody piled up: a wooden chest with a gold clasp, a sack, a flask of water, a bone. |
| map_muck_rich | 22×14 | A big heap of glistening swamp muck with golden bits in it (a rich deposit; bigger than `map_muck`). |
| map_moisture_rich | 22×26 | A spring pouring from above into a wide pool (a rich spring; bigger than `map_moisture`). |

## Map helpers: map_glow, map_mark, map_fog_edge, map_draught, map_echo

Can stay code placeholders:

- **map_glow** (64×64): a soft round light in white; the game tints it and adds it on top (lair, shrines, springs, glowing fungi, torches).
- **map_mark** (30×24): the outline of a squashed hex in white, tinted by the game to show where the hydra can go this turn.
- **map_fog_edge** (30×28): a ragged pattern of dark pixels laid over known hexes next to the unknown, so the darkness doesn't end in a hard line.
- **map_draught** (24×16): three pale wavy streaks of moving air in gusts, bright in the middle and fading at the ends. Drawn over the hexes next to a hidden threshold, drifting and pulsing; centred 4 px above the hex centre.
- **map_echo** (16×16): a bright dot with two pairs of arcs spreading left and right, like sound. Floats 16 px above a hex at the edge of the known map, where an echo of a place was heard, until the place is seen.

## Battle graphics: the slanted view

The battle is a board of hexes seen from a slant (like the board in Into the Breach, but made of hexes), with the hydra's body in the middle. Rules for every battle graphic, on top of the general ones above:

- **Seen from a slant:** the ground is squashed (a hex is 42 px wide and 36 px tall on screen); people and the hydra stand up and are seen from the side and a little from above (three-quarter view).
- **Everyone faces right.** The game mirrors them when they face left.
- Light from the upper left. Transparent background (tiles only have transparency outside the hex).
- The board is 13 hexes across and 9 rows deep. Hex centres are 42 px apart within a row and rows are 27 px apart.
- The numbers that the game relies on (tile sizes, the body's anchor, where feet stand) are also in `src/assets/battleArt.ts`.

## Battle tiles: battle_tile_<biome>_<ground|water>

| | |
|---|---|
| Size | 42×46 px each |
| Frames | 1 |
| Anchor | centre of the top face, (21, 18) |
| Background | transparent outside the tile |
| Used in | battle board; one tile per hex |

The battle board looks like the place of the encounter: the tiles of its biome, and the `water` tile if the encounter stood in water. Current keys: `lairSwamp`, `floodedCaves`, `rootTangle`, `fungalDeeps`, `oldCrypts`, `saltMines`, each with `_ground` and `_water`. With `"file": null` the game draws a placeholder from the biome's colours in `src/data/biomes.json`.

Two parts, one under the other:

- **Top face (upper 36 px):** a pointy-top hex squashed vertically: top point at (21, 0), straight sides at x=0 and x=41 from y=9 to y=27, bottom point at (21, 35). Keep it quiet and low-contrast (soldiers, heads and HP bars are drawn on top) with a 1 px darker rim, so neighbouring hexes read as separate fields.
- **Wall (lower 10 px):** earth under the two lower edges of the hex, as if the board were a thick slab: darker on the left half, a little lighter on the right, a few darker horizontal layers. Only the front row of the board shows its walls; the next row covers the rest.

**In HD** (`?hd=1`) the battle board has no tiles when its ground has a texture: the whole board is painted from the texture as one surface, walls along the front edge (`paintBoard` in `src/assets/terrain.ts`), with a faint line along the sides of the hexes. The line round a head's reach, the rings round targets, the light, the torch glow and the soft shadows are made in code and are not art to replace.

The ground should match the biome's map ground (see map_ground_*), only larger: swamp mud, wet stone, dark soil with roots, spongy fungal ground; the water tiles are murky still water in the biome's tint.

Prompt sketch: *"Pixel art game tile, 42x46 pixels, transparent background. A pointy-top hexagon floor tile seen from a slanted top-down angle (squashed vertically, 42 wide and 36 tall), [dark olive swamp mud / wet grey-green stone / dark soil with roots / purplish spongy fungal ground / murky still water], subtle detail and a 1 px darker rim; below its two lower edges a 10 px thick earth side wall, darker on the left, slightly lighter on the right, like a board game slab. Hard pixels, no anti-aliasing, dark fantasy underground."*

## battle_body

| | |
|---|---|
| Size | 144×110 px |
| Frames | 1 (static for now) |
| Anchor | middle of its footprint, (72, 70) from the left and top edges (`BODY_FOOT` in `src/assets/battleArt.ts`) |
| Background | transparent |
| Used in | battle, the hydra's Body |

The hydra's torso seen from the side and above, **without heads and necks** (the game draws the necks, and the heads are separate images). Since 2026-10-06 it is drawn in the style of the cover and the head portraits: a heavy mound of thick serpent coils, old bronze scales in a near-black net, pale cream belly plates along the sides of the coils, dark olive moss (prompt: `docs/ART_PROMPTS.md`, section "Hydra w bitwie"). The lowest coil covers the seven hexes and overhangs them a little at the sides; the coils pile up into a crown about 70 px above the anchor. It has no front or back: necks leave it in every direction and soldiers stand all around it, so no tail and no head-shaped bumps.

The necks leave the body on an oval round the crown: its middle 40 px above the anchor, 34 px to either side and 14 px to the front and back (`NECK_RING`), each on the side its head looks to. The game draws them in the body's colours: the dark net as the outline, bronze scales, a lit stripe on the upper left and the cream belly plates on the side the head looks to.

GPT drew the coils wider than the prompt's 144×128 (about 4 to 3), so the image is 144×110. The first body (2026-10-03) was a squat green mound, 132×110 with its anchor at (66, 66); it stays in the repository's history.

## battle_head

| | |
|---|---|
| Size | 36×18 px (the jaw: 36×9 px) |
| Frames | 1 (static for now) |
| Anchor | centre |
| Background | transparent |
| Used in | battle, one per head, at the end of its neck |

One hydra head seen from the side, **snout pointing right**, a glowing eye, a long mouth line. Draw it in **pale grey / white with a dark outline**: the game tints it with the colour of the head's class (from `src/data/heads.json`), so one image serves all classes. It stays in use until each class has its own head (next section).

Real art comes in two parts, so the game can open the mouth: **battle_head** is the head without its lower jaw (36×18, the art sits at the bottom middle of the image) and **battle_head_jaw** is the lower jaw alone (36×9, the art sits at the top right, so the tips of both jaws line up). The game hangs the jaw under the head, both centred on the same point, the jaw's top edge overlapping the head's bottom edge by 3 px (`JAW_OVERLAP` in `src/assets/battleArt.ts`), so the teeth interlock and the mouth is shut. To bite, the jaw turns around its back end (the leftmost drawn pixel of the jaw image, found by the game). GPT draws both parts side by side on one picture (`art/raw/battle_head.png`) and the import splits them. The placeholder head has its jaw drawn in, so its battle_head_jaw stays empty.

The size was 20×14 until the first GPT head (2026-10-03): GPT drew it at about 43×21 pixels of its own, and squeezed to 20 px it turned to noise. At 36 px it keeps its eye, teeth and crest.

## Class heads: battle_head_<class>, battle_head_<class>_jaw

| | |
|---|---|
| Size | head and jaw, width × height in px: biter 40×24 and 40×12; acidSpitter 38×26 and 38×12; mistBreather 38×24 and 38×12; screamer 38×28 and 38×12; glutton 38×24 and 38×22 (the swollen throat hangs from the jaw); spare 32×18 and 32×10; strangler 44×18 and 44×10; tender 40×26 and 40×12; lantern 40×34 and 40×12 (the lure rises above the head). Only the Biter's (and the old green Spare's) are measured from a picture; the others are guesses from the portraits, tuned when each is imported. |
| Frames | 1 (static; the game animates it, as battle_head) |
| Anchor | centre, as battle_head |
| Background | transparent |
| Used in | battle, every head of that class |

Each head class gets its own head and jaw (GAME_DESIGN.md §13), drawn from its painted portrait in `art/concept/portraits/` and in its own colours: the game does **not** tint them. They come in the same two pieces as battle_head: GPT draws the head without its lower jaw and the jaw alone side by side on one picture (`art/raw/battle_head_<class>.png`), the import splits them, the head sits at the bottom middle of its image and the jaw at the top right. The class's feature (bolt, hood, gills, bone pipes, lure and so on) belongs to the head piece and may make it taller or longer than the skull, so each class's size is tuned in the manifest after its import, to keep the skulls about the same size (the Biter's is the biggest). Prompts: `docs/ART_PROMPTS.md`, section "Hydra w bitwie".

The battle shows a class's own head as soon as its image is imported, and the tinted battle_head for the classes still without one. The Biter has its own head since 2026-10-06. Moss hangs below the Biter's mouth, so its jaw tucks 11 px under the head image instead of 3 (`JAW_OVERLAP_BY_CLASS` in `src/assets/battleArt.ts`); each new head gets its number at import, from where its mouth line is.

## Order soldiers: battle_enemy_manAtArms, battle_enemy_headhunter, battle_enemy_torchbearer

| | |
|---|---|
| Size | 26×38 px each |
| Frames | 1 (static for now; the game makes them bob, hop and lunge) |
| Anchor | feet, at the bottom middle (13, 37) |
| Background | transparent |
| Used in | battle, one per soldier standing on a hex |

People of the Order of the Eternal Flame, standing, seen from the side and a little from above, **facing right**, holding their gear on the right side (towards the enemy). Each must be recognisable at a glance by colour and gear:

- **battle_enemy_manAtArms:** banner-red tabard with a small gold flame, steel helmet with a visor, a sword held upright. Drawn since 2026-10-06 (plate armour, a red cape and a small shield, like the cover); the other two are still drawn in code.
- **battle_enemy_headhunter:** dark blood-red, broader build, a big axe.
- **battle_enemy_torchbearer:** a lay brother in a brown habit, tonsured head, no helmet, carrying a burning torch: the only bright, warm flame on the board. The middle of the flame is **10 px right of and 32 px above the feet** (in the HD picture 20 and 64 px; `TORCH_FLAME` in `src/assets/battleArt.ts`): in HD the torch's light and glow shine from there.

A new enemy type needs an image with the key `battle_enemy_<type id from enemies.json>`; without one, the game shows the Man-at-Arms.

The Order looks like the soldiers on the game's cover (plate armour, red tabards and capes, red banners), with a gold flame as its emblem instead of the cover's lion. Prompts: `docs/ART_PROMPTS.md`, section "Zakon i hydra na mapie, Zakon w bitwie: próba".

## portrait_oldMotherToad

| | |
|---|---|
| Size | 128×160 px |
| Frames | 1 |
| Anchor | top-left |
| Background | transparent |
| Used in | dialogues (from M5); not shown in the game yet |

Old Mother Toad, guardian of the lair and mentor: a bust (head and shoulders), seen from the front and turned a little to the side. Portraits are a separate shot and don't follow the game camera.

Since 2026-10-04 dialogue portraits are painted (GAME_DESIGN.md §13). This pixel portrait stays until M5, when a painted one with its own spec replaces it.

## battle_stump, battle_scar

| | |
|---|---|
| Size | 10×8 px each |
| Frames | 1 |
| Anchor | centre |
| Background | transparent |
| Used in | battle, on the rim of the body where a head was severed |

- **battle_stump:** a fresh neck stump seen from a slant: a raw dark red oval with a darker rim. Two new heads will grow from it.
- **battle_scar:** the same stump burnt shut: charred black-brown, no red. Nothing grows from it.

## battle_mist_puff

20×11 px, anchor centre. A small puff of mist: solid middle breaking up into scattered pixels at the edge, **white**. The game tints it pale greenish grey (or yellow-green when the Mist turns to Acid Fog) and floats a few of them over each misty hex. Can stay a code placeholder; in HD, without a file, the game floats soft puffs made in code instead.

## battle_shadow, battle_hex_mark, battle_hex_fill

Helpers that can stay code placeholders:

- **battle_shadow** (22×7): a plain oval, drawn black and half see-through under each soldier's feet.
- **battle_hex_mark** (42×36): the outline of a squashed hex in white, tinted by the game to show a head's reach, targets and where the body is going.
- **battle_hex_fill** (42×36): the same hex filled white, tinted pale for Mist over a hex.

In HD the game draws soft shadows, lines and soft Mist patches in code instead, so these three are only for the classic game.
