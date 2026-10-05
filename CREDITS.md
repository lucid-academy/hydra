# Credits

## Graphics

- Terrain textures (`texture_ground_*`, `texture_rock_*`), the hydra's body and head (`battle_body`, `battle_head`, `battle_head_jaw`), the portrait of Old Mother Toad (`portrait_oldMotherToad`), the map's decorations (`map_deco_*`), places (`map_place_*`), lair (`map_lair`), thresholds (`map_threshold_*`), shrine (`map_shrine`), finds (`map_muck*`, `map_moisture*`, `map_remains`, `map_hoard`), and The Spare's head (`battle_head_spare`, `battle_head_spare_jaw`): made by Piotr with GPT image generation in Codex (OpenAI), October 2026. Files he uploaded under other names are matched to the game's names in `art/aliases.json`. The originals and the prompts he used are in `art/raw/`; the game uses versions shrunk by `npm run art` (`public/images/`).
- Painted portraits of the nine head classes and Old Mother Toad (`art/concept/portraits/`): made by Piotr with GPT image generation (OpenAI), October 2026. At his request Claude cut them out of the sheet and shortened the tongues of five heads; the original sheet is kept unchanged. Not in the game yet (dialogues come with M5).
- Everything else is still a placeholder drawn in code (`src/assets/placeholders.ts`, `mapPlaceholders.ts`, `worldPlaceholders.ts`): on the map that is the hydra, the Order's encounters, the passage, the reach marks, the fog edge, the lights and the draught and echo hints. No external asset packs.

## Fonts

- Cinzel and Crimson Pro (SIL Open Font License 1.1), loaded from Google Fonts. Only the dialogue demo page (`public/dialogue-demo/`) uses them, not the game.

## Libraries

- [Phaser](https://phaser.io) — MIT
- [zod](https://zod.dev) — MIT
- [sharp](https://sharp.pixelplumbing.com) — Apache-2.0, used only by the art import script (`npm run art`), not in the game
