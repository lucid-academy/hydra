// Small life on the underground map (GAME_DESIGN.md §13, "Mapa bliżej Songs of Conquest"): fireflies over the swamp,
// drips and glints in the Flooded Caves, spores rising in the Fungal Deeps, dust in the crypts, sparkles on salt.
// Drawn in code, only on hexes in sight on the screen, a few at a time, so a big map costs no more than a small one.
// Purely for looks: nothing here touches the simulation, so it may use Math.random().

import * as Phaser from 'phaser';
import { pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import type { Tile } from '../sim/map';
import { LIGHT_TEXTURE, LIGHT_TEXTURE_SIZE } from './mapLight';

/** How a mote moves: floats up swaying, drops and splashes, flickers where it is, or drifts slowly sideways. */
type Motion = 'rise' | 'fall' | 'twinkle' | 'drift';

interface Mote {
  motion: Motion;
  color: number;
  /** Across, in screen units. */
  size: number;
  /** How bright at most (0–1). */
  alpha: number;
  /** How long one lives, in ms. */
  life: number;
  /** A soft glow drawn over the light (else a pixel of dust, dimmed by the light like the ground). */
  glows: boolean;
  /** Only over water, or only off it. */
  on?: 'water' | 'dry';
}

/** The life of each biome; one is picked at random for each new mote. Biomes not listed have none. */
const LIFE: Readonly<Record<string, readonly Mote[]>> = {
  lairSwamp: [
    { motion: 'drift', color: 0xc6e04a, size: 5, alpha: 0.85, life: 4200, glows: true },
    { motion: 'rise', color: 0xc6e04a, size: 4, alpha: 0.7, life: 3600, glows: true },
    { motion: 'twinkle', color: 0xa8c890, size: 6, alpha: 0.45, life: 900, glows: true, on: 'water' },
  ],
  floodedCaves: [
    { motion: 'fall', color: 0xa8e0e8, size: 1, alpha: 0.9, life: 900, glows: false },
    { motion: 'twinkle', color: 0x7fd0e0, size: 5, alpha: 0.6, life: 1100, glows: true, on: 'water' },
    { motion: 'drift', color: 0x7fd0e0, size: 4, alpha: 0.5, life: 3800, glows: true },
  ],
  rootTangle: [
    { motion: 'fall', color: 0x8a6a40, size: 1, alpha: 0.8, life: 1400, glows: false },
    { motion: 'drift', color: 0xd9a93b, size: 4, alpha: 0.55, life: 4000, glows: true },
  ],
  oldCrypts: [
    { motion: 'drift', color: 0xc8c0b0, size: 1, alpha: 0.6, life: 5000, glows: false },
    { motion: 'twinkle', color: 0xe0b060, size: 5, alpha: 0.45, life: 1300, glows: true },
  ],
  saltMines: [
    { motion: 'twinkle', color: 0xfff4f0, size: 4, alpha: 0.75, life: 700, glows: true, on: 'dry' },
    { motion: 'drift', color: 0xe8d8d0, size: 1, alpha: 0.55, life: 4500, glows: false },
  ],
  fungalDeeps: [
    { motion: 'rise', color: 0xc65bd6, size: 5, alpha: 0.75, life: 4400, glows: true },
    { motion: 'rise', color: 0xe0a0f0, size: 3, alpha: 0.6, life: 3800, glows: true },
    { motion: 'drift', color: 0x9070c0, size: 1, alpha: 0.6, life: 4200, glows: false },
  ],
};

/** A new mote every this many ms, at most this many at once; tries this many spots for each. */
const PACE = { everyMs: 140, most: 36, tries: 6 } as const;
/** The dust pixel. */
const DOT_TEXTURE = 'map_life_dot';

export interface LifeDepths {
  /** Under the light (dust is dimmed like the ground). */
  dust: number;
  /** Over the light (glows shine). */
  glow: number;
}

export class MapLife {
  private count = 0;
  private wait = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: HexLayout,
    private readonly depths: LifeDepths,
    /** The tile at a hex when the hydra sees it now (life is only where she looks), else null. */
    private readonly seenTile: (h: Hex) => Tile | null,
  ) {
    if (!scene.textures.exists(DOT_TEXTURE)) {
      const texture = scene.textures.createCanvas(DOT_TEXTURE, 2, 2)!;
      texture.context.fillStyle = '#ffffff';
      texture.context.fillRect(0, 0, 2, 2);
      texture.refresh();
    }
  }

  /** Called every frame: now and then a new mote somewhere on the screen. */
  update(deltaMs: number): void {
    this.wait -= deltaMs;
    if (this.wait > 0) return;
    this.wait = PACE.everyMs * (0.5 + Math.random());
    if (this.count >= PACE.most) return;
    const view = this.scene.cameras.main.worldView;
    for (let i = 0; i < PACE.tries; i++) {
      const x = view.x + Math.random() * view.width;
      const y = view.y + Math.random() * view.height;
      const tile = this.seenTile(pixelToHex(this.layout, x, y));
      if (!tile || tile.terrain === 'rock') continue;
      const kinds = (LIFE[tile.biome] ?? []).filter((m) => !m.on || (m.on === 'water') === (tile.terrain === 'water'));
      if (kinds.length === 0) continue;
      this.spawn(kinds[Math.floor(Math.random() * kinds.length)]!, x, y);
      return;
    }
  }

  private spawn(mote: Mote, x: number, y: number): void {
    const image = mote.glows
      ? this.scene.add.image(x, y, LIGHT_TEXTURE).setScale(mote.size / LIGHT_TEXTURE_SIZE).setBlendMode(Phaser.BlendModes.ADD).setDepth(this.depths.glow)
      : this.scene.add.image(x, y, DOT_TEXTURE).setScale(mote.size / 2).setDepth(this.depths.dust);
    image.setTint(mote.color).setAlpha(0);
    this.count++;
    const done = () => {
      image.destroy();
      this.count--;
    };
    const life = mote.life * (0.75 + Math.random() * 0.5);
    const side = Math.random() < 0.5 ? -1 : 1;
    switch (mote.motion) {
      case 'rise':
        this.scene.tweens.add({ targets: image, y: y - 26 - Math.random() * 14, duration: life, ease: 'Sine.easeOut', onComplete: done });
        this.scene.tweens.add({ targets: image, x: x + side * 5, duration: life / 3, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
        this.fade(image, mote.alpha, life);
        break;
      case 'drift':
        this.scene.tweens.add({ targets: image, x: x + side * (14 + Math.random() * 10), y: y - 6 + Math.random() * 8, duration: life, ease: 'Sine.easeInOut', onComplete: done });
        this.fade(image, mote.alpha, life);
        break;
      case 'twinkle':
        this.scene.tweens.add({ targets: image, alpha: mote.alpha, duration: life / 2, yoyo: true, ease: 'Sine.easeInOut', onComplete: done });
        break;
      case 'fall': {
        // A drop from above (or a crumb of earth), and a small splash where it lands.
        image.setPosition(x, y - 34).setAlpha(mote.alpha);
        this.scene.tweens.add({
          targets: image,
          y,
          duration: life * 0.6,
          ease: 'Quad.easeIn',
          onComplete: () => {
            image.setTexture(LIGHT_TEXTURE).setBlendMode(Phaser.BlendModes.ADD).setDepth(this.depths.glow).setScale(4 / LIGHT_TEXTURE_SIZE, 2 / LIGHT_TEXTURE_SIZE).setAlpha(mote.alpha * 0.6);
            this.scene.tweens.add({ targets: image, scaleX: 14 / LIGHT_TEXTURE_SIZE, scaleY: 6 / LIGHT_TEXTURE_SIZE, alpha: 0, duration: life * 0.4, ease: 'Sine.easeOut', onComplete: done });
          },
        });
        break;
      }
    }
  }

  /** Fades in, stays, fades out over its life. */
  private fade(image: Phaser.GameObjects.Image, alpha: number, life: number): void {
    this.scene.tweens.chain({
      targets: image,
      tweens: [
        { alpha, duration: life * 0.25, ease: 'Sine.easeOut' },
        { alpha, duration: life * 0.45 },
        { alpha: 0, duration: life * 0.3, ease: 'Sine.easeIn' },
      ],
    });
  }
}
