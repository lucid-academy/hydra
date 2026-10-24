// Placeholder graphics for the surface (M4): the Order's castle, its camps and Flame Shrines, villages, the mill,
// watchtowers, things lying about, trees, and the Torchbearers going to light a shrine again. Simple shapes in the
// palettes of GAME_DESIGN.md, until real art exists. Sizes are in the manifest and docs/ASSETS.md; everything stands
// on its bottom middle.

import type * as Phaser from 'phaser';
import { color } from '../scenes/context';
import { Rng } from '../sim/rng';
import type { PlaceholderDrawer } from './drawing';

type Graphics = Phaser.GameObjects.Graphics;
type Draw = (g: Graphics, cx: number, b: number) => void;

const px = (g: Graphics, fill: string, x: number, y: number, w = 1, h = 1, alpha = 1) => {
  g.fillStyle(color(fill), alpha);
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};

function drawer(draw: Draw): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    draw(g, Math.floor(width / 2), height - 1);
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

const OUTLINE = '#120e0a';
const STONE = '#8a8478';
const STONE_LIGHT = '#b0a898';
const STONE_DARK = '#5a554c';
const ROOF = '#7a3428';
const THATCH = '#a08a48';
const WOOD = '#6b4a2a';
const RED = '#9e2323';
const GOLD = '#d9a93b';
const FIRE = '#ffcf5c';
const FLAME = '#e0702a';

/** A wall of stone blocks: outline, body, a lighter top row, mortar lines. */
function wall(g: Graphics, x: number, y: number, w: number, h: number): void {
  px(g, OUTLINE, x - 1, y - 1, w + 2, h + 2);
  px(g, STONE, x, y, w, h);
  px(g, STONE_LIGHT, x, y, w, 2);
  for (let row = y + 4; row < y + h; row += 4) px(g, STONE_DARK, x, row, w, 1);
}

/** Battlements along a wall's top. */
function crenels(g: Graphics, x: number, y: number, w: number): void {
  for (let i = x; i < x + w - 1; i += 4) {
    px(g, OUTLINE, i - 1, y - 4, 4, 4);
    px(g, STONE_LIGHT, i, y - 3, 2, 3);
  }
}

/** A pennant on a pole. */
function banner(g: Graphics, x: number, top: number, length: number, fill = RED): void {
  px(g, WOOD, x, top, 1, length);
  px(g, fill, x + 1, top, 6, 4);
  px(g, fill, x + 1, top + 4, 3, 1);
}

/** A small flame: outer orange, inner yellow. */
function flame(g: Graphics, cx: number, b: number, size: number): void {
  for (let y = 0; y < size * 2; y++) {
    const half = Math.max(0, Math.round(size * Math.sin(((y + 1) / (size * 2 + 1)) * Math.PI) * 0.8));
    px(g, FLAME, cx - half, b - y, half * 2 + 1, 1);
    if (half > 1) px(g, FIRE, cx - half + 1, b - y, half * 2 - 1, 1);
  }
}

/** A simple house: walls, a door, a roof. */
function house(g: Graphics, x: number, b: number, w: number, h: number, roof: string): void {
  px(g, OUTLINE, x - 1, b - h - 1, w + 2, h + 1);
  px(g, '#c8b898', x, b - h, w, h);
  px(g, '#3a2a1a', x + Math.floor(w / 2) - 1, b - 5, 3, 5);
  px(g, '#3a2a1a', x + 2, b - h + 3, 2, 2);
  for (let y = 0; y < Math.ceil(w / 2) + 1; y++) {
    px(g, OUTLINE, x - 2 + y, b - h - 1 - y, w + 4 - y * 2, 1);
    if (w + 2 - y * 2 > 0) px(g, roof, x - 1 + y, b - h - 1 - y, w + 2 - y * 2, 1);
  }
}

// ---------------------------------------------------------------- the Order

/** The Castle of the Eternal Flame: a keep between two towers, the gate shut, a flame on top. */
const castle = drawer((g, cx, b) => {
  wall(g, cx - 20, b - 22, 40, 20); // the curtain wall
  crenels(g, cx - 20, b - 22, 40);
  wall(g, cx - 9, b - 38, 18, 18); // the keep
  crenels(g, cx - 9, b - 38, 18);
  for (const x of [-26, 18]) {
    wall(g, cx + x, b - 32, 8, 30);
    crenels(g, cx + x, b - 32, 8);
  }
  px(g, OUTLINE, cx - 5, b - 12, 10, 11); // the gate, shut
  px(g, WOOD, cx - 4, b - 11, 8, 10);
  px(g, '#3a2a1a', cx, b - 11, 1, 10);
  px(g, '#3a2a1a', cx - 1, b - 32, 2, 4); // the keep's window
  banner(g, cx - 22, b - 44, 12);
  banner(g, cx + 22, b - 44, 12);
  px(g, GOLD, cx - 2, b - 44, 5, 4); // the brazier on top, and its flame
  flame(g, cx, b - 45, 3);
});

/** A camp of the Order: two tents, a flagpole, a fire. */
const camp = drawer((g, cx, b) => {
  for (const [x, w] of [[-14, 14], [2, 12]] as const) {
    for (let y = 0; y < w / 2 + 2; y++) {
      px(g, OUTLINE, cx + x + y - 1, b - 3 - y, w - y * 2 + 2, 1);
      px(g, y % 3 === 0 ? '#c8bca0' : '#e0d6bc', cx + x + y, b - 3 - y, w - y * 2, 1);
    }
    px(g, '#3a2a1a', cx + x + Math.floor(w / 2) - 1, b - 6, 2, 4);
  }
  px(g, RED, cx - 9, b - 9, 4, 3); // the Order's mark on a tent
  banner(g, cx + 11, b - 25, 22);
  px(g, '#3a2a1a', cx - 3, b - 2, 6, 2);
  flame(g, cx, b - 3, 2);
});

/** A Flame Shrine, burning: a stone pillar with a brazier and a tall flame. */
const flameShrine = drawer((g, cx, b) => {
  px(g, OUTLINE, cx - 7, b - 4, 14, 4);
  px(g, STONE_DARK, cx - 6, b - 3, 12, 3); // the step
  px(g, OUTLINE, cx - 4, b - 20, 8, 17);
  px(g, STONE, cx - 3, b - 19, 6, 16);
  px(g, STONE_LIGHT, cx - 3, b - 19, 2, 16);
  px(g, RED, cx - 1, b - 14, 2, 5); // the Order's mark
  px(g, OUTLINE, cx - 7, b - 23, 14, 4);
  px(g, GOLD, cx - 6, b - 22, 12, 2); // the brazier
  flame(g, cx, b - 23, 4);
});

/** A Flame Shrine put out: the same pillar, the brazier cold, mist spilling over it. */
const flameShrineOut = drawer((g, cx, b) => {
  px(g, OUTLINE, cx - 7, b - 4, 14, 4);
  px(g, STONE_DARK, cx - 6, b - 3, 12, 3);
  px(g, OUTLINE, cx - 4, b - 20, 8, 17);
  px(g, STONE_DARK, cx - 3, b - 19, 6, 16);
  px(g, STONE, cx - 3, b - 19, 2, 16);
  px(g, OUTLINE, cx - 7, b - 23, 14, 4);
  px(g, '#6a5a3a', cx - 6, b - 22, 12, 2);
  px(g, '#3a3430', cx - 4, b - 24, 8, 1); // ash
  for (const [x, y, w] of [[-9, -22, 7], [2, -24, 8], [-6, -12, 5], [4, -8, 6]] as const) px(g, '#a9b8a8', cx + x, b + y, w, 2, 0.55);
});

/** Torchbearers going to light a shrine again: two soldiers, a ladder, a lit torch. */
const relight = drawer((g, cx, b) => {
  for (const x of [-5, 4]) {
    px(g, '#2a2a2e', cx + x - 2, b - 4, 2, 4);
    px(g, '#2a2a2e', cx + x + 1, b - 4, 2, 4);
    px(g, OUTLINE, cx + x - 4, b - 13, 9, 10);
    px(g, '#6b5530', cx + x - 3, b - 12, 7, 8);
    px(g, OUTLINE, cx + x - 3, b - 18, 7, 6);
    px(g, '#c9a27a', cx + x - 2, b - 17, 5, 4);
  }
  for (let y = 0; y < 16; y += 3) px(g, WOOD, cx - 10, b - 22 + y, 5, 1); // the ladder
  px(g, WOOD, cx - 10, b - 22, 1, 18);
  px(g, WOOD, cx - 6, b - 22, 1, 18);
  px(g, WOOD, cx + 9, b - 22, 1, 12); // the torch
  flame(g, cx + 9, b - 22, 2);
});

// ---------------------------------------------------------------- people's places

/** A village: three houses huddled together, shutters closed. */
const village = drawer((g, cx, b) => {
  house(g, cx - 16, b - 3, 10, 8, THATCH);
  house(g, cx + 6, b - 4, 11, 9, ROOF);
  house(g, cx - 5, b, 10, 8, THATCH);
  px(g, '#e8e0d0', cx + 13, b - 1, 3, 2); // the goose
  px(g, '#e0702a', cx + 16, b - 1, 1, 1);
});

/** A watermill: a house on the bank and its wheel. */
const mill = drawer((g, cx, b) => {
  house(g, cx - 12, b - 2, 14, 12, ROOF);
  const wx = cx + 8;
  const wy = b - 10;
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2;
    px(g, WOOD, wx + Math.cos(angle) * 8, wy + Math.sin(angle) * 8, 2, 2);
  }
  for (let a = 0; a < 4; a++) {
    const angle = (a / 4) * Math.PI;
    for (let r = -7; r <= 7; r++) px(g, '#4a3420', wx + Math.cos(angle) * r, wy + Math.sin(angle) * r, 1, 1);
  }
  px(g, '#7fb8c8', cx + 1, b - 2, 15, 2, 0.7); // water
});

/** A watchtower of the Order on its hill, the ladder pulled up. */
const watchtower = drawer((g, cx, b) => {
  px(g, OUTLINE, cx - 5, b - 26, 10, 26);
  px(g, WOOD, cx - 4, b - 25, 2, 25);
  px(g, WOOD, cx + 2, b - 25, 2, 25);
  for (let y = b - 22; y < b; y += 6) px(g, '#4a3420', cx - 4, y, 8, 1);
  px(g, OUTLINE, cx - 7, b - 33, 14, 8);
  px(g, '#8a6a40', cx - 6, b - 32, 12, 6); // the hut on top
  px(g, '#1a1410', cx - 2, b - 30, 4, 3);
  banner(g, cx + 5, b - 37, 6);
});

/** Something lying about: a sack and a pot. */
const find = drawer((g, cx, b) => {
  px(g, OUTLINE, cx - 7, b - 7, 8, 7);
  px(g, '#a08a58', cx - 6, b - 6, 6, 6);
  px(g, '#c8b080', cx - 6, b - 6, 2, 3);
  px(g, '#6b5530', cx - 5, b - 8, 4, 2);
  px(g, OUTLINE, cx + 1, b - 6, 6, 6);
  px(g, '#7a4a30', cx + 2, b - 5, 4, 5);
  px(g, GOLD, cx - 1, b - 10, 2, 2, 0.8); // a glint, so she notices
});

/** A tree of the surface's woods: a dark crown on a short trunk. */
const tree = drawer((g, cx, b) => {
  const rng = new Rng(7);
  px(g, OUTLINE, cx - 2, b - 8, 4, 8);
  px(g, '#4a3420', cx - 1, b - 8, 2, 8);
  for (let y = 0; y < 18; y++) {
    const half = Math.round(7 * Math.sin(((y + 1) / 19) * Math.PI));
    px(g, OUTLINE, cx - half - 1, b - 7 - y, half * 2 + 2, 1);
    px(g, y > 12 ? '#3e5a2c' : '#2e4a22', cx - half, b - 7 - y, half * 2, 1);
  }
  for (let i = 0; i < 6; i++) px(g, '#4e6a34', cx + rng.int(-5, 3), b - 10 - rng.int(0, 13), 2, 1);
});

export const surfacePlaceholderDrawers: Readonly<Record<string, PlaceholderDrawer>> = {
  map_castle: castle,
  map_settlement_camp: camp,
  map_flame_shrine: flameShrine,
  map_flame_shrine_out: flameShrineOut,
  map_relight: relight,
  map_settlement_village: village,
  map_settlement_mill: mill,
  map_settlement_watchtower: watchtower,
  map_find: find,
  map_tree: tree,
};
