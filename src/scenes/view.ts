// Scenes are laid out on the 640×360 screen (SCREEN in scaling.ts). In the classic view the canvas has exactly that
// many pixels; in HD (?hd=1) it has the window's real pixels, art has twice the pixels, and cameras zoom the layout up
// to fill the canvas. These helpers keep scenes working the same in both.

import * as Phaser from 'phaser';
import { SCREEN } from '../scaling';

/** Art for HD has this many pixels per screen unit (public/images-hd/, made by `npm run art`). */
export const HD_DENSITY = 2;

/** Where the HD version of an image file is: images/x.png → images-hd/x.png. */
export function hdFile(file: string): string {
  return file.replace(/^images\//, 'images-hd/');
}

/** Canvas pixels per screen unit: 1 in the classic view, more in HD. */
export function viewScale(scene: Phaser.Scene): number {
  const { width, height } = scene.scale.gameSize;
  return Math.min(width / SCREEN.width, height / SCREEN.height);
}

/** Page (CSS) pixels per screen unit: how big the game looks in the window, at any resolution. */
export function pageScale(scene: Phaser.Scene): number {
  return viewScale(scene) * scene.scale.zoom;
}

/** Points a scene's camera at the whole 640×360 screen, and again whenever the window changes size. */
export function fitScreenCamera(scene: Phaser.Scene): void {
  const fit = (): void => {
    // Zooming around the top-left corner keeps the screen's (0, 0) in the corner, for things that scroll and don't.
    scene.cameras.main.setOrigin(0, 0).setZoom(viewScale(scene));
  };
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
}

/**
 * Where to put something that doesn't scroll (scroll factor 0) in a scene whose camera zooms around its middle, so it
 * shows at (x, y) of the 640×360 screen, and how much to scale it so it keeps its size there.
 */
export function pinnedToScreen(scene: Phaser.Scene, x: number, y: number): { x: number; y: number; scale: number } {
  const camera = scene.cameras.main;
  const k = viewScale(scene);
  const middleX = camera.width * camera.originX;
  const middleY = camera.height * camera.originY;
  return { x: middleX + (x * k - middleX) / camera.zoom, y: middleY + (y * k - middleY) / camera.zoom, scale: k / camera.zoom };
}

/**
 * Makes a texture whose image has `density` pixels per screen unit report its size in units, so the game places and
 * sizes it exactly like 1× art. Phaser draws a texture `resolution` times smaller; the trim makes every frame
 * (and every image showing it) measure in units too.
 */
export function useDensity(texture: Phaser.Textures.Texture, density: number): void {
  if (density === 1) return;
  for (const source of texture.source) source.resolution = density;
  for (const name of texture.getFrameNames(true)) {
    const frame = texture.get(name);
    const width = frame.cutWidth / density;
    const height = frame.cutHeight / density;
    frame.setTrim(width, height, 0, 0, width, height);
  }
}

/**
 * In HD every text is drawn at the canvas's resolution, so it stays sharp when cameras zoom the screen up, and smooth
 * (letters are not pixel art). Phaser draws text into its own small canvas, one pixel per unit unless told otherwise.
 */
export function sharpenText(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const makeText = factory.text;
  factory.text = function (this: Phaser.GameObjects.GameObjectFactory, x, y, content, style) {
    const resolution = Math.ceil(viewScale(this.scene));
    const text = makeText.call(this, x, y, content, { resolution, ...style });
    text.texture.setSmoothPixelArt(false);
    return text;
  };
}
