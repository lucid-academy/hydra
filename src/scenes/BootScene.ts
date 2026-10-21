// Loads every image listed in the manifest (or draws its placeholder), cuts hex tiles out of terrain textures,
// then starts the first scene. The images have twice the pixels of the 640×360 layout (HD, GAME_DESIGN.md §13) and the
// fonts come from public/fonts/; the first scene waits for the fonts, because a text keeps the font it was made with.

import * as Phaser from 'phaser';
import { placeholderFor } from '../assets/placeholders';
import { isTerrainTextureKey } from '../assets/terrain';
import { buildTerrainTiles } from '../assets/terrainTiles';
import { loadFonts } from '../ui/fonts';
import { getContext } from './context';
import { SceneKey, startableScenes } from './sceneKeys';
import { HD_DENSITY, useDensity } from './view';

export class BootScene extends Phaser.Scene {
  private fontsReady: Promise<void> = Promise.resolve();

  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    const { data } = getContext(this);
    this.fontsReady = loadFonts();
    for (const [key, entry] of Object.entries(data.manifest.images)) {
      if (entry.file === null) continue;
      // An animation: its frames side by side in one file, each width × height (in units, so twice that in pixels).
      if (entry.frames !== undefined) this.load.spritesheet(key, entry.file, { frameWidth: entry.width * HD_DENSITY, frameHeight: entry.height * HD_DENSITY });
      else this.load.image(key, entry.file);
    }
  }

  create(): void {
    const { data, params } = getContext(this);
    for (const [key, entry] of Object.entries(data.manifest.images)) if (entry.file !== null) useDensity(this.textures.get(key), HD_DENSITY);
    for (const [key, entry] of Object.entries(data.manifest.images)) {
      if (entry.file !== null || isTerrainTextureKey(key)) continue;
      const draw = placeholderFor(key);
      if (!draw) throw new Error(`Manifest image "${key}" has no file and no placeholder drawer.`);
      draw(this, key, entry.width, entry.height, data.palette, data);
    }
    buildTerrainTiles(this, data);

    let first: string = SceneKey.Title;
    if (params.scene !== null) {
      if (startableScenes.includes(params.scene)) first = params.scene;
      else console.warn(`?scene=${params.scene} is unknown. Available: ${startableScenes.join(', ')}`);
    }

    void this.fontsReady.then(() => {
      this.scene.start(first);
      if (params.debug) this.scene.launch(SceneKey.DebugOverlay);
    });
  }
}
