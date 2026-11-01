# Hydra

Browser roguelite: you are a hydra from an underground swamp, fighting the Order of the Eternal Flame.

Play: https://lucid-academy.github.io/hydra/

- Design: [GAME_DESIGN.md](GAME_DESIGN.md)
- Working rules: [CLAUDE.md](CLAUDE.md)
- Graphics spec: [docs/ASSETS.md](docs/ASSETS.md)
- Balance reports: [battles](docs/BALANCE.md), [whole runs](docs/BALANCE_RUNS.md)
- Where the work stands (in Polish): [docs/HANDOFF.md](docs/HANDOFF.md)

## Commands

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript checks
npm test           # unit tests
npm run build      # production build into dist/
npm run shots      # screenshots of the built game into docs/screens/
npm run smoke      # plays the built game like a player: map, battles, death and the next generation, the surface, the castle's cathedral to the ending, save and Continue, New Lineage, the Book (add "-- phone" for a phone-sized screen)
npm run balance    # many automatic battles per enemy group; results go to docs/BALANCE.md
npm run balance:runs  # a bot plays many whole runs on the map (Alert stages, expeditions, the surface, the castle); results go to docs/BALANCE_RUNS.md
```

URL parameters: `?seed=123` (replay a run), `?scene=title` (start in a scene: `title`, `map`, `battle`, `generation`, `book`, `ending`; `ending` shows a hydra who has just won), `?debug=1` (debug overlay), `?scene=battle&group=patrol` (test battle against an enemy group from `src/data/enemies.json`), `&hp=5` (start that test battle with 5 body HP), `?speed=4` (battles run 4× faster), `?scene=map&near=shrine` (start the map next to the nearest shrine; also `passage`, `encounter`, `moisture`, `muck`, `remains`, `hoard`, a place id like `brineLake`, a threshold id like `saltPlug`, or `mark` for a shrine of the Serpent's mark), `&reveal=1` (show the whole map), `&zoom=0.45` (map camera zoom; with `reveal=1` it shows a whole world), `?modifiers=wetYear,myceliumBloom,oldWorkings` (turn on world modifiers from `src/data/world.json`), `?scene=map&say=toadWelcome` (show a dialogue from `src/data/dialogues.json`; with `?scene=battle`, a Serpent's battle line like `battleFires`), `?scene=map&event=titheBox` (an event from `src/data/events.json` right next to the hydra), `&flags=hushedSongHeard,surveyDone` (start with these story flags set), `&conditions=warmed` (start with these conditions from `src/data/world.json` on the hydra, for 5 turns), `&ancestors=3` (the lineage starts with 3 hydras already dead, each with one mutation; `?scene=generation` means 1), `&eggs=3` (with `ancestors`: the eggs the last of them left; `0` means none, so the lineage dies out), `&hidden=1` (with `ancestors`: Old Mother Toad keeps an egg hidden), `?scene=map&alert=60` (start with this Alert), `&units=patrol,messenger` (the Order's people of these kinds near the hydra; also `expedition`, `greatBurning`), `?scene=battle&allies=3` (the test battle is the battle for the lair, with 3 Broodlings), `&heads=strangler,lantern` (the test battle's heads, by class; with `?scene=map`, the hydra's heads), `&level=3` (the test battle's heads are level 3; with `?scene=map`, the hydra's heads), `?ults=1` (ultimate skills on key E), `?scene=map&surface=1` (start up on the surface, on the first Passage; with `&near=flameShrine`, `castle`, `camp`, `village`, `mill`, `watchtower` or a find, next to the nearest one up there; with `?scene=battle`, the test battle is fought up there in mist), `&exposed=1` (with `surface`: no mist under the hydra; in a battle, an Exposed one), `&night=1` (start on the first turn of the night), `?scene=battle&castle=2` (the test battle is that part of the castle's assault, from 0; 2, the cathedral, has the Eternal Flame), `?scene=map&surface=1&near=castle&castle=2` (the castle's gate stands open and 2 parts are taken; she starts at its walls; add `&heads=biter,biter,acidSpitter,mistBreather,strangler,tender&level=4` for a hydra who could win there).

Controls: tap or click to move and order; on the map a mouse plans the way with the first click and sets off with the second. The mouse wheel or two fingers zoom the map. In battle, Ctrl or Shift + click, or a finger held on a head, adds it to the picked heads; a tap on the Eternal Flame sends the body to smother it. The Menu button (or Esc) has the sound volume, the lineage's seed and Quit.

Saving: the game is saved in the browser (localStorage, keys `hydra.profile.v1` for the lineages and `hydra.run.v1` for the living hydra's run; `hydra.settings.v1` keeps the sound volume) after every move and when the page is hidden. A test URL (any `scene` other than `title`, or `near`, `event`, `say`, `flags`, `conditions`, `alert`, `units`, `reveal`, `modifiers`, `group`, `hp`, `allies`, `ancestors`, `eggs`, `hidden`, `heads`, `level`, `ults`, `surface`, `exposed`, `night`, `castle`) plays in memory only: it neither loads nor overwrites the save. `?seed=` and `?debug=1` alone are not test URLs.
