# Hydra

Browser roguelite: you are a hydra from an underground swamp, fighting the Order of the Eternal Flame.

Play: https://lucid-academy.github.io/hydra/

- Design: [GAME_DESIGN.md](GAME_DESIGN.md)
- Working rules: [CLAUDE.md](CLAUDE.md)
- Graphics spec: [docs/ASSETS.md](docs/ASSETS.md)
- Balance report: [docs/BALANCE.md](docs/BALANCE.md)
- Where the work stands (in Polish): [docs/HANDOFF.md](docs/HANDOFF.md)

## Commands

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript checks
npm test           # unit tests
npm run build      # production build into dist/
npm run shots      # screenshots of the built game into docs/screens/
npm run smoke      # plays the built game like a player: map, battles, death and the next generation, save and Continue, New Lineage, the Book (add "-- phone" for a phone-sized screen)
npm run balance    # many automatic battles per enemy group; results go to docs/BALANCE.md
```

URL parameters: `?seed=123` (replay a run), `?scene=title` (start in a scene: `title`, `map`, `battle`, `generation`, `book`), `?debug=1` (debug overlay), `?scene=battle&group=patrol` (test battle against an enemy group from `src/data/enemies.json`), `&hp=5` (start that test battle with 5 body HP), `?speed=4` (battles run 4× faster), `?scene=map&near=shrine` (start the map next to the nearest shrine; also `passage`, `encounter`, `moisture`, `muck`, `remains`, `hoard`, a place id like `brineLake`, a threshold id like `saltPlug`, or `mark` for a shrine of the Serpent's mark), `&reveal=1` (show the whole map), `&zoom=0.45` (map camera zoom; with `reveal=1` it shows a whole world), `?modifiers=wetYear,myceliumBloom,oldWorkings` (turn on world modifiers from `src/data/world.json`), `?scene=map&say=toadWelcome` (show a dialogue from `src/data/dialogues.json`; with `?scene=battle`, a Serpent's battle line like `battleFires`), `?scene=map&event=titheBox` (an event from `src/data/events.json` right next to the hydra), `&flags=hushedSongHeard,surveyDone` (start with these story flags set), `&conditions=warmed` (start with these conditions from `src/data/world.json` on the hydra, for 5 turns), `&ancestors=3` (the lineage starts with 3 hydras already dead, each with one mutation; `?scene=generation` means 1).

Saving: the game is saved in the browser (localStorage, keys `hydra.profile.v1` for the lineages and `hydra.run.v1` for the living hydra's run) after every move and when the page is hidden. A test URL (any `scene` other than `title`, or `near`, `event`, `say`, `flags`, `conditions`, `reveal`, `modifiers`, `group`, `hp`, `ancestors`) plays in memory only: it neither loads nor overwrites the save. `?seed=` and `?debug=1` alone are not test URLs.
