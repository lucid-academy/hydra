// Loads every image listed in the manifest (or draws its placeholder), cuts hex tiles out of terrain textures,
// then starts the first scene. In HD the images come from public/images-hd/, with twice the pixels.

import * as Phaser from 'phaser';
import { placeholderFor } from '../assets/placeholders';
import { isTerrainTextureKey } from '../assets/terrain';
import { buildTerrainTiles } from '../assets/terrainTiles';
import { getContext } from './context';
import { SceneKey, startableScenes } from './sceneKeys';
import { HD_DENSITY, hdFile, useDensity } from './view';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    const { data, params } = getContext(this);
    const density = params.hd ? HD_DENSITY : 1;
    for (const [key, entry] of Object.entries(data.manifest.images)) {
      if (entry.file === null) continue;
      const file = params.hd ? hdFile(entry.file) : entry.file;
      // An animation: its frames side by side in one file, each width × height.
      if (entry.frames !== undefined) this.load.spritesheet(key, file, { frameWidth: entry.width * density, frameHeight: entry.height * density });
      else this.load.image(key, file);
    }
  }

  create(): void {
    const { data, params } = getContext(this);
    if (params.hd) {
      for (const [key, entry] of Object.entries(data.manifest.images)) if (entry.file !== null) useDensity(this.textures.get(key), HD_DENSITY);
    }
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

    this.scene.start(first);
    if (params.debug) this.scene.launch(SceneKey.DebugOverlay);
  }
}
