# Credits

## Graphics

- Terrain textures (`texture_ground_*`, `texture_rock_*`), the hydra's body and head (`battle_body`, `battle_head`, `battle_head_jaw`) and the portrait of Old Mother Toad (`portrait_oldMotherToad`): made by Piotr with GPT image generation in Codex (OpenAI), October 2026. The originals and the prompts he used are in `art/raw/`; the game uses versions shrunk by `npm run art` (`public/images/`).
- Painted portraits of the nine head classes and Old Mother Toad (`art/concept/portraits/`): made by Piotr with GPT image generation (OpenAI), October 2026. At his request Claude cut them out of the sheet and shortened the tongues of five heads; the original sheet is kept unchanged. Not in the game yet (dialogues come with M5).
- Everything else is still a placeholder drawn in code (`src/assets/placeholders.ts`). No external asset packs.

## Libraries

- [Phaser](https://phaser.io) — MIT
- [zod](https://zod.dev) — MIT
- [sharp](https://sharp.pixelplumbing.com) — Apache-2.0, used only by the art import script (`npm run art`), not in the game
