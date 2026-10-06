// Light on the map in HD (GAME_DESIGN.md §13): brighter around the hydra and around whatever glows (mushrooms, places,
// shrines, the Order's torches), in the light's colour, and a little dimmer everywhere else. A picture of the light
// over the whole map is drawn again whenever a light changes, and lies over the map so that it multiplies the colours
// under it twice over: mid-grey leaves a colour as it is, darker dims it, lighter brightens it.
// Also the two soft pictures this needs, made here rather than drawn as art: a round light, and the shadow that lies
// under things standing on the ground.

import * as Phaser from 'phaser';

/** One pixel of the light per this many screen units; the light's grey where nothing shines (0x80 leaves colours as they are). */
const LIGHT = { cell: 2, ambient: 0x6c6c72 };

/** The round light: white in the middle, fading out to nothing at the edge. Not a power of two (Phaser would repeat it). */
export const LIGHT_TEXTURE = 'map_soft_light';
export const LIGHT_TEXTURE_SIZE = 120;
/** The shadow under a thing standing on the ground: a soft dark oval, twice as wide as it is tall. */
export const SHADOW_TEXTURE = 'map_soft_shadow';
export const SHADOW_TEXTURE_WIDTH = 60;

/** A light: where its middle is, how far it reaches (screen units), its colour, and how much it brightens there (0–1). */
export interface Light {
  x: number;
  y: number;
  radius: number;
  color: number;
  strength: number;
}

/** Makes the soft light and shadow pictures, once per game. */
export function makeSoftTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(LIGHT_TEXTURE)) {
    const size = LIGHT_TEXTURE_SIZE;
    const texture = scene.textures.createCanvas(LIGHT_TEXTURE, size, size)!;
    const gradient = texture.context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Falls off smoothly, with no visible edge.
    for (let i = 0; i <= 10; i++) gradient.addColorStop(i / 10, `rgba(255,255,255,${((1 - (i / 10) ** 2) ** 2).toFixed(3)})`);
    texture.context.fillStyle = gradient;
    texture.context.fillRect(0, 0, size, size);
    texture.refresh();
    texture.setSmoothPixelArt(false);
  }
  if (!scene.textures.exists(SHADOW_TEXTURE)) {
    const width = SHADOW_TEXTURE_WIDTH;
    const texture = scene.textures.createCanvas(SHADOW_TEXTURE, width, width / 2)!;
    const context = texture.context;
    context.save();
    context.scale(1, 0.5);
    const gradient = context.createRadialGradient(width / 2, width / 2, 0, width / 2, width / 2, width / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,0.45)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, width);
    context.restore();
    texture.refresh();
    texture.setSmoothPixelArt(false);
  }
}

export class MapLight {
  private readonly texture: Phaser.Textures.DynamicTexture;
  private readonly image: Phaser.GameObjects.Image;

  /** `area` is the part of the world the light covers (screen units); `depth` puts it over what it lights. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly area: { x: number; y: number; width: number; height: number },
    depth: number,
  ) {
    makeSoftTextures(scene);
    if (scene.textures.exists('map_light')) scene.textures.remove('map_light');
    this.texture = scene.textures.addDynamicTexture('map_light', Math.ceil(area.width / LIGHT.cell), Math.ceil(area.height / LIGHT.cell))!;
    // Smooth, not pixel art: light has no pixels.
    this.texture.setSmoothPixelArt(false);
    this.image = scene.add
      .image(area.x, area.y, this.texture)
      .setOrigin(0, 0)
      .setScale(LIGHT.cell)
      .setDepth(depth)
      .setBlendMode(twiceMultiply(scene));
  }

  /** Draws the light again, from these lights. */
  draw(lights: readonly Light[]): void {
    const texture = this.texture;
    texture.clear();
    texture.fill(LIGHT.ambient, 1);
    for (const light of lights) {
      texture.stamp(LIGHT_TEXTURE, undefined, (light.x - this.area.x) / LIGHT.cell, (light.y - this.area.y) / LIGHT.cell, {
        scale: (light.radius * 2) / LIGHT_TEXTURE_SIZE / LIGHT.cell,
        tint: light.color,
        alpha: light.strength,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
    texture.render();
  }

  destroy(): void {
    this.image.destroy();
    this.scene.textures.remove(this.texture);
  }
}

/** The blend mode that multiplies colours by twice the light's (made once per game; WebGL only, as HD always is). */
let twiceMultiplyMode: { renderer: unknown; mode: number } | null = null;

function twiceMultiply(scene: Phaser.Scene): number {
  const renderer = scene.sys.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return Phaser.BlendModes.MULTIPLY;
  if (twiceMultiplyMode?.renderer !== renderer) {
    const gl = renderer.gl;
    // The new mode's number is its place in the list (addBlendMode's own answer is one less in this Phaser version).
    const mode = renderer.blendModes.length;
    renderer.addBlendMode([gl.DST_COLOR, gl.SRC_COLOR], gl.FUNC_ADD);
    twiceMultiplyMode = { renderer, mode };
  }
  return twiceMultiplyMode.mode;
}
