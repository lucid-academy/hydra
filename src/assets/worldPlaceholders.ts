// Placeholder graphics for what the M2c world puts on the map: thresholds (closed and open), places, remains,
// hoards, rich deposits and the hint marks. Simple shapes in the palettes of GAME_DESIGN.md, until real art exists.
// Sizes and anchors are in the manifest and docs/ASSETS.md; everything stands on its bottom middle.

import type * as Phaser from 'phaser';
import { color } from '../scenes/context';
import { Rng } from '../sim/rng';
import { hexRowSpans } from './drawing';
import type { PlaceholderDrawer } from './drawing';

type Graphics = Phaser.GameObjects.Graphics;
type Draw = (g: Graphics, cx: number, b: number, width: number, height: number) => void;

const px = (g: Graphics, fill: string, x: number, y: number, w = 1, h = 1, alpha = 1) => {
  g.fillStyle(color(fill), alpha);
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};

/** A drawer that hands the drawing a fresh graphics object, the middle of the bottom edge and the size. */
function drawer(draw: Draw): PlaceholderDrawer {
  return (scene, key, width, height) => {
    const g = scene.make.graphics({}, false);
    draw(g, Math.floor(width / 2), height - 1, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  };
}

/** A lump of rock: dark outline, body, lighter top. */
function stone(g: Graphics, x: number, y: number, w: number, h: number, body: string, light: string): void {
  px(g, '#100d0a', x - 1, y - 1, w + 2, h + 2);
  px(g, body, x, y, w, h);
  px(g, light, x, y, w - 1, Math.max(1, Math.floor(h / 3)));
}

/** A soft ellipse built from rows, so it stays crisp. */
function ellipse(g: Graphics, cx: number, cy: number, rx: number, ry: number, fill: string, alpha = 1): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
    if (half > 0) px(g, fill, cx - half, cy + dy, half * 2, 1, alpha);
  }
}

/** Something lying flat on the hex face (open thresholds): the face's shape, from the bottom. */
function flatSpans(width: number, height: number): Array<[number, number]> {
  return hexRowSpans(width, height);
}

// ---------------------------------------------------------------- thresholds, closed

const rubbleChoke = drawer((g, cx, b) => {
  const rng = new Rng(11);
  // A mound of boulders filling the tunnel, biggest at the bottom.
  for (let row = 0; row < 5; row++) {
    const y = b - 6 - row * 5;
    const half = 13 - row * 2;
    for (let x = cx - half; x < cx + half - 3; x += rng.int(5, 7)) {
      stone(g, x + rng.int(-1, 1), y + rng.int(-1, 1), rng.int(5, 7), rng.int(4, 6), row % 2 ? '#7a6e60' : '#665a4e', '#a89a88');
    }
  }
  px(g, '#2a221c', cx - 12, b - 2, 24, 2);
});

const rootWall = drawer((g, cx, b) => {
  // Thick roots across the tunnel, every which way, with a darker tangle behind them.
  px(g, '#140e08', cx - 13, b - 28, 26, 27);
  px(g, '#24180e', cx - 12, b - 27, 24, 25);
  const roots: Array<[number, number, number, number]> = [
    [-12, -26, 10, -2],
    [11, -27, -9, -3],
    [-4, -28, -2, -1],
    [5, -28, 7, -1],
    [-13, -14, 12, -18],
  ];
  for (const [x0, y0, x1, y1] of roots) {
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cx + x0 + (x1 - x0) * t + Math.sin(t * 6) * 1.5;
      const y = b + y0 + (y1 - y0) * t;
      px(g, '#1a120b', x - 2, y - 1, 5, 3);
      px(g, '#6b4a2a', x - 1, y, 3, 1);
      px(g, '#8a6238', x - 1, y - 1, 1, 1);
    }
  }
});

const saltPlug = drawer((g, cx, b) => {
  // A plug of white salt with a face someone began to carve, and gave up on.
  px(g, '#3a3430', cx - 13, b - 26, 26, 26);
  px(g, '#d8d0c8', cx - 12, b - 25, 24, 24);
  px(g, '#f4eee8', cx - 11, b - 25, 10, 22);
  px(g, '#b8aea4', cx + 6, b - 24, 5, 22);
  for (const [x, y] of [[-8, -20], [3, -12], [-2, -6], [6, -19]] as const) px(g, '#ffffff', cx + x, b + y, 2, 1);
  // The unfinished saint: brows, one eye, a nose.
  px(g, '#8a8078', cx - 5, b - 19, 4, 1);
  px(g, '#8a8078', cx + 1, b - 19, 4, 1);
  px(g, '#6a6058', cx - 4, b - 17, 2, 2);
  px(g, '#8a8078', cx - 1, b - 16, 1, 4);
  px(g, '#a89e94', cx - 12, b - 2, 24, 2);
});

const smoulderingSeam = drawer((g, cx, b) => {
  const rng = new Rng(5);
  // Black coal, cracked, glowing from inside; a little smoke.
  px(g, '#0a0806', cx - 13, b - 24, 26, 24);
  px(g, '#221c18', cx - 12, b - 23, 24, 22);
  px(g, '#2e2622', cx - 12, b - 23, 24, 6);
  for (let i = 0; i < 4; i++) {
    let x = cx + rng.int(-9, 9);
    for (let y = b - 22; y < b - 2; y++) {
      x += rng.int(-1, 1);
      px(g, y % 3 === 0 ? '#f0a040' : '#c84a1a', x, y, 1, 1);
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = cx + rng.int(-6, 6);
    for (let y = 0; y < 5; y++) px(g, '#8a8078', x + Math.round(Math.sin(y + i) * 1.5), b - 25 - y, 1, 1, 0.5);
  }
});

// ---------------------------------------------------------------- thresholds, open (lying flat on the floor)

/** Rubble pushed to both sides of a way dug through. */
const rubbleChokeOpen = drawer((g, cx, b, width, height) => {
  const rng = new Rng(12);
  flatSpans(width, height).forEach(([x0, x1], y) => {
    if (y < 4 || y > height - 5) return;
    for (const x of [x0 + 1 + rng.int(0, 2), x1 - 5 - rng.int(0, 2)]) if (rng.chance(0.45)) stone(g, x, y, rng.int(2, 4), 2, '#5a5046', '#7a6e60');
  });
  px(g, '#3a3028', cx - 2, b - 10, 4, 1, 0.6);
});

/** Gnawed root stumps at the sides, and chips on the floor. */
const rootWallOpen = drawer((g, cx, b, width, height) => {
  const rng = new Rng(13);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = cx + side * (9 + i * 2);
      const y = b - 6 - i * 4;
      px(g, '#1a120b', x - 2, y - 3, 4, 5);
      px(g, '#6b4a2a', x - 1, y - 2, 2, 3);
      px(g, '#c49a6a', x - 1, y - 3, 2, 1); // the bitten end
    }
  }
  for (let i = 0; i < 7; i++) px(g, '#a8845a', cx + rng.int(-6, 6), b - rng.int(3, height - 6), 2, 1);
  void width;
});

/** A crust of salt where the plug was, and a little brine. */
const saltPlugOpen = drawer((g, cx, b, width, height) => {
  const spans = flatSpans(width, height);
  spans.forEach(([x0, x1], y) => {
    if (y < 2 || y > height - 3) return;
    px(g, '#d8d0c8', x0 + 1, y, 3, 1, 0.9);
    px(g, '#d8d0c8', x1 - 4, y, 3, 1, 0.9);
  });
  ellipse(g, cx, b - 9, 6, 3, '#9ab8b8', 0.7);
  px(g, '#f4eee8', cx - 2, b - 10, 2, 1);
});

/** Ash and a few dull embers, smothered. */
const smoulderingSeamOpen = drawer((g, cx, b) => {
  const rng = new Rng(14);
  ellipse(g, cx, b - 10, 12, 6, '#2a2420', 0.85);
  for (let i = 0; i < 9; i++) px(g, rng.chance(0.3) ? '#7a2a14' : '#4a423c', cx + rng.int(-10, 10), b - 10 + rng.int(-4, 4), 2, 1);
});

/** A dark crack across the floor, with pale air coming out of it. */
const draughtCrackOpen = drawer((g, cx, b) => {
  let y = b - 14;
  for (let x = cx - 12; x <= cx + 12; x++) {
    y += x % 3 === 0 ? (x < cx ? 1 : -1) : 0;
    px(g, '#050403', x, y - 1, 1, 4);
    px(g, '#1a1612', x, y + 3, 1, 1);
  }
  for (const dx of [-6, 1, 7]) for (let i = 0; i < 4; i++) px(g, '#d8e4e8', cx + dx + Math.round(Math.sin(i) * 1.5), b - 16 - i, 1, 1, 0.5);
});

/** A floor of black glass, melted long ago, still faintly warm. */
const cinderScarOpen = drawer((g, cx, b, width, height) => {
  const rng = new Rng(15);
  flatSpans(width, height).forEach(([x0, x1], y) => {
    if (y < 3 || y > height - 4) return;
    px(g, '#141012', x0 + 3, y, x1 - x0 - 6, 1, 0.85);
  });
  for (let i = 0; i < 8; i++) px(g, rng.chance(0.4) ? '#e0782c' : '#3a3440', cx + rng.int(-9, 9), b - rng.int(5, height - 6), 2, 1);
  px(g, '#6a6070', cx - 6, b - 14, 5, 1); // a glassy shine
});

/** Timber props of an old shaft, cut dead straight, and the rails it ran on. */
const oldWorkingsOpen = drawer((g, cx, b) => {
  px(g, '#3a2a1a', cx - 12, b - 26, 3, 24);
  px(g, '#3a2a1a', cx + 9, b - 26, 3, 24);
  px(g, '#5a4028', cx - 12, b - 28, 24, 3);
  px(g, '#7a5a38', cx - 12, b - 28, 24, 1);
  px(g, '#6a6058', cx - 6, b - 12, 1, 11);
  px(g, '#6a6058', cx + 5, b - 12, 1, 11);
  for (let y = b - 11; y < b; y += 3) px(g, '#4a3420', cx - 7, y, 14, 1);
  px(g, '#d9a93b', cx + 6, b - 24, 2, 3); // a lantern of the Order, long out
});

// ---------------------------------------------------------------- landmarks

/** An oak upside down: roots up like a crown, branches dug into the floor. */
const sunkenOak = drawer((g, cx, b) => {
  for (let y = b - 44; y < b - 6; y++) {
    const half = 4 + Math.round((b - y) / 22);
    px(g, '#1a120b', cx - half - 1, y, half * 2 + 2, 1);
    px(g, '#5a4028', cx - half, y, half * 2, 1);
    px(g, '#7a5a38', cx - half, y, 2, 1);
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    for (let r = 0; r < 18; r++) px(g, r < 2 ? '#5a4028' : '#3a2a1a', cx + Math.cos(a) * r * 1.3, b - 44 + Math.sin(a) * r * 0.9, 2, 2);
  }
  for (const dx of [-14, -7, 6, 13]) for (let y = 0; y < 8; y++) px(g, '#3a2a1a', cx + dx * (y / 8) + Math.sign(dx) * 3, b - 8 + y, 2, 1);
  px(g, '#6b8a44', cx + 3, b - 36, 3, 2); // a green leaf, out of spite
});

/** A chapel's bell tower standing out of black water. */
const drownedChapel = drawer((g, cx, b) => {
  ellipse(g, cx, b - 4, 22, 4, '#0f3a3d');
  px(g, '#101414', cx - 9, b - 46, 18, 42);
  px(g, '#4a5050', cx - 8, b - 45, 16, 41);
  px(g, '#5a6262', cx - 8, b - 45, 4, 41);
  for (let y = 0; y < 12; y++) px(g, '#2a3030', cx - Math.round((12 - y) * 0.75), b - 58 + y, Math.round((12 - y) * 1.5) + 1, 1); // the spire
  px(g, '#101414', cx - 4, b - 40, 8, 10); // the arch
  px(g, '#d9a93b', cx - 2, b - 38, 4, 5); // the bell
  px(g, '#f0d070', cx - 1, b - 38, 1, 2);
  for (let x = -20; x <= 20; x += 5) px(g, '#7fd0e0', cx + x, b - 5 + (x % 2), 3, 1, 0.6);
});

/** A gothic front of bone: an arch, a rose window of skulls, chandeliers inside. */
const ossuaryCathedral = drawer((g, cx, b) => {
  px(g, '#151210', cx - 24, b - 44, 48, 44);
  px(g, '#6b6458', cx - 23, b - 43, 46, 43);
  px(g, '#8a8276', cx - 23, b - 43, 6, 43);
  for (let y = 0; y < 14; y++) px(g, '#4a443c', cx - (14 - y), b - 58 + y, (14 - y) * 2, 1); // the gable
  px(g, '#0a0806', cx - 7, b - 26, 14, 26); // the door
  for (let y = 0; y < 5; y++) px(g, '#0a0806', cx - 7 + y, b - 31 + y, 14 - y * 2, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    px(g, '#e8e0d0', cx + Math.cos(a) * 5 - 1, b - 38 + Math.sin(a) * 4 - 1, 2, 2); // skulls round the window
  }
  px(g, '#e0b060', cx - 1, b - 20, 2, 2); // a candle inside
});

/** A tall salt statue of a miner with his pick, licked to a shine. */
const saltSaint = drawer((g, cx, b) => {
  px(g, '#3a3430', cx - 10, b - 6, 20, 6);
  px(g, '#a89e94', cx - 9, b - 6, 18, 4); // plinth
  px(g, '#3a3430', cx - 7, b - 50, 14, 45);
  px(g, '#e8e0d8', cx - 6, b - 49, 12, 43);
  px(g, '#ffffff', cx - 6, b - 49, 3, 43);
  px(g, '#c8bcb4', cx + 3, b - 49, 3, 43);
  px(g, '#3a3430', cx - 5, b - 60, 10, 11);
  px(g, '#f4eee8', cx - 4, b - 59, 8, 9); // head
  px(g, '#d8d0c8', cx - 5, b - 62, 10, 3); // helmet
  px(g, '#8a8078', cx + 7, b - 52, 2, 26); // pick handle
  px(g, '#c8c0b8', cx + 4, b - 54, 9, 2);
});

/** A mushroom whose cap is the ceiling: a wide purple cap, a pale stalk, light underneath. */
const motherCap = drawer((g, cx, b) => {
  for (let y = b - 34; y < b - 2; y++) px(g, '#d8cfe0', cx - 6 - Math.round((y - b + 34) / 10), y, 12 + Math.round((y - b + 34) / 5), 1);
  px(g, '#b8aec0', cx + 2, b - 34, 3, 32);
  ellipse(g, cx, b - 40, 31, 12, '#1a1020');
  ellipse(g, cx, b - 41, 30, 11, '#7a3a8a');
  ellipse(g, cx - 4, b - 45, 18, 5, '#a858b8');
  for (let x = -26; x <= 26; x += 4) px(g, '#f0c8f8', cx + x, b - 31, 2, 1, 0.8); // gills glowing
  for (const [x, y] of [[-14, -46], [9, -44], [-2, -49]] as const) px(g, '#f0c8f8', cx + x, b + y, 3, 2);
});

// ---------------------------------------------------------------- locations and rare places

/** Black water turning in a slow spiral. */
const undertow = drawer((g, cx, b) => {
  ellipse(g, cx, b - 11, 19, 10, '#06181a');
  ellipse(g, cx, b - 11, 17, 8, '#0f3a3d');
  for (let i = 0; i < 60; i++) {
    const a = i / 6;
    const r = 2 + i / 4.2;
    px(g, '#7fd0e0', cx + Math.cos(a) * r, b - 11 + Math.sin(a) * r * 0.5, 1, 1, 0.75);
  }
});

/** Roots grown down from a gallows tree, keeping the bones it dropped. */
const gallowsRoots = drawer((g, cx, b) => {
  px(g, '#1a120b', cx - 16, b - 38, 32, 4);
  px(g, '#5a4028', cx - 15, b - 37, 30, 2);
  for (const dx of [-11, -2, 8]) {
    for (let y = b - 34; y < b - 12 - Math.abs(dx); y++) px(g, '#3a2a1a', cx + dx + Math.round(Math.sin(y / 4)), y, 2, 1);
    const y = b - 12 - Math.abs(dx);
    px(g, '#e8e0d0', cx + dx - 1, y, 4, 3); // a skull
    px(g, '#1a1612', cx + dx, y + 1, 1, 1);
    px(g, '#d8d0c0', cx + dx, y + 3, 2, 5); // and the rest, filed neatly
  }
  for (let x = -14; x <= 14; x += 4) px(g, '#d8d0c0', cx + x, b - 2, 3, 1);
});

/** A still lake of brine, white at the edges. */
const brineLake = drawer((g, cx, b) => {
  ellipse(g, cx, b - 12, 21, 11, '#e8e0d8');
  ellipse(g, cx, b - 12, 18, 9, '#5a8a8a');
  ellipse(g, cx - 3, b - 14, 10, 4, '#7aa8a8');
  for (const [x, y] of [[-17, -6], [15, -16], [10, -4]] as const) px(g, '#ffffff', cx + x, b + y, 3, 1);
});

/** A tent, a fire, and a banner with nine heads, spelled creatively. */
const ninefoldCamp = drawer((g, cx, b) => {
  for (let y = 0; y < 22; y++) px(g, y % 4 === 0 ? '#5a4a30' : '#7a6440', cx - 18 + Math.round(y / 2), b - 4 - y, 22 - y, 1); // the tent
  px(g, '#1a1410', cx - 8, b - 12, 4, 8); // its opening
  px(g, '#6b4a2a', cx + 12, b - 36, 1, 32); // banner pole
  px(g, '#3f6a4a', cx + 13, b - 36, 10, 9);
  for (let i = 0; i < 9; i++) px(g, '#b7d13a', cx + 14 + (i % 3) * 3, b - 35 + Math.floor(i / 3) * 3, 1, 1); // nine heads
  px(g, '#3a2a1a', cx + 1, b - 3, 9, 2); // the fire
  px(g, '#e0782c', cx + 3, b - 7, 5, 4);
  px(g, '#f0c040', cx + 4, b - 6, 2, 2);
});

/** A web of mycelium glowing faintly on the floor. */
const myceliumWhisper = drawer((g, cx, b) => {
  const rng = new Rng(21);
  ellipse(g, cx, b - 12, 18, 10, '#2a2032', 0.9);
  for (let i = 0; i < 14; i++) {
    let x = cx;
    let y = b - 12;
    const a = (i / 14) * Math.PI * 2;
    for (let s = 0; s < 14; s++) {
      x += Math.cos(a) * 1.2 + rng.int(-1, 1) * 0.5;
      y += Math.sin(a) * 0.6;
      px(g, s % 4 === 0 ? '#f0c8f8' : '#c65bd6', x, y, 1, 1, 0.8);
    }
  }
  px(g, '#f0c8f8', cx - 1, b - 13, 3, 2);
});

/** A stone bell of the Hushed in a frame, grown over with fungus. */
const silentBell = drawer((g, cx, b) => {
  px(g, '#3a3036', cx - 13, b - 40, 3, 40);
  px(g, '#3a3036', cx + 10, b - 40, 3, 40);
  px(g, '#4a4046', cx - 13, b - 42, 26, 3);
  for (let y = 0; y < 22; y++) {
    const half = 4 + Math.round(y / 3);
    px(g, '#101014', cx - half - 1, b - 36 + y, half * 2 + 2, 1);
    px(g, '#5a5a62', cx - half, b - 36 + y, half * 2, 1);
  }
  px(g, '#7fe0d6', cx - 10, b - 15, 20, 1, 0.6); // the hum, seen and not heard
  for (const [x, y] of [[-8, -24], [5, -30], [3, -18], [-4, -33]] as const) px(g, '#c65bd6', cx + x, b + y, 3, 2);
});

/** A survey party of the Order, still holding its instruments: bones, a tripod, papers. */
const lostSurvey = drawer((g, cx, b) => {
  px(g, '#6b5530', cx + 6, b - 22, 1, 20);
  px(g, '#6b5530', cx + 3, b - 4, 4, 1);
  px(g, '#6b5530', cx + 7, b - 4, 4, 1);
  px(g, '#d9a93b', cx + 4, b - 24, 5, 3); // the instrument
  for (const dx of [-12, -3]) {
    px(g, '#e8e0d0', cx + dx, b - 6, 4, 3);
    px(g, '#d8d0c0', cx + dx + 4, b - 5, 6, 1);
    px(g, '#d8d0c0', cx + dx + 5, b - 4, 1, 3);
  }
  for (const [x, y] of [[-14, -10], [-8, -2], [10, -8]] as const) px(g, '#f0e8d0', cx + x, b + y, 4, 3);
});

/** Stairs going down to a door with no handle on this side. */
const hushedStair = drawer((g, cx, b) => {
  px(g, '#151218', cx - 15, b - 40, 30, 40);
  px(g, '#3a3440', cx - 14, b - 39, 28, 38);
  px(g, '#05040a', cx - 8, b - 30, 16, 26); // the doorway
  for (let y = 0; y < 6; y++) px(g, '#05040a', cx - 8 + y, b - 35 + y, 16 - y * 2, 1);
  px(g, '#2a3a3a', cx - 6, b - 26, 12, 20); // the door
  px(g, '#7fe0d6', cx - 6, b - 16, 12, 1, 0.7); // humming lines
  px(g, '#7fe0d6', cx - 4, b - 21, 8, 1, 0.5);
  for (let i = 0; i < 4; i++) px(g, '#4a4450', cx - 10 + i, b - 4 + i - 3, 20 - i * 2, 1);
});

// ---------------------------------------------------------------- finds and hints

/** Someone who died here: a skull, ribs, long bones. */
const remains = drawer((g, cx, b) => {
  px(g, '#1a1612', cx - 9, b - 6, 18, 6);
  px(g, '#e8e0d0', cx - 9, b - 6, 5, 4); // skull
  px(g, '#1a1612', cx - 8, b - 5, 1, 1);
  for (let i = 0; i < 4; i++) px(g, '#d8d0c0', cx - 3 + i * 2, b - 6, 1, 4); // ribs
  px(g, '#d8d0c0', cx - 3, b - 3, 8, 1);
  px(g, '#bfb7a8', cx + 5, b - 2, 5, 1); // a leg
  px(g, '#6b5530', cx + 3, b - 8, 4, 2); // what is left of a satchel
});

/** Supplies piled up by somebody: sacks, a chest, a few bones. */
const hoard = drawer((g, cx, b) => {
  px(g, '#1a1410', cx - 12, b - 12, 13, 12);
  px(g, '#6b4a2a', cx - 11, b - 11, 11, 10); // chest
  px(g, '#d9a93b', cx - 6, b - 8, 2, 2);
  px(g, '#3a2a1a', cx - 11, b - 8, 11, 1);
  ellipse(g, cx + 6, b - 6, 6, 5, '#7a6440');
  ellipse(g, cx + 6, b - 7, 5, 3, '#9a8458');
  px(g, '#3f9fb8', cx + 2, b - 14, 3, 4); // a flask
  px(g, '#e8e0d0', cx + 9, b - 2, 3, 2);
});

/** A big heap of Muck, with golden bits in it. */
const muckRich = drawer((g, cx, b) => {
  ellipse(g, cx, b - 6, 10, 6, '#1b140a');
  ellipse(g, cx, b - 7, 9, 5, '#5b3b1a');
  ellipse(g, cx - 2, b - 9, 5, 2, '#7a5228');
  for (const [x, y] of [[-4, -9], [3, -7], [0, -11], [6, -5]] as const) px(g, '#e0b860', cx + x, b + y, 2, 1);
});

/** A spring pouring from above into a wide pool. */
const moistureRich = drawer((g, cx, b) => {
  ellipse(g, cx, b - 4, 10, 4, '#0b2a33');
  ellipse(g, cx, b - 4, 9, 3, '#3f9fb8');
  px(g, '#7fd0e0', cx - 2, b - 24, 3, 19);
  px(g, '#e0f8ff', cx - 1, b - 24, 1, 12);
  px(g, '#e0f8ff', cx + 2, b - 5, 3, 1);
});

/** Wisps of moving air, pale, to be drawn over the floor: a bright line with a faint shadow under it, in gusts. */
const draught = drawer((g, cx, b, width) => {
  for (let line = 0; line < 3; line++) {
    const y0 = b - 3 - line * 5;
    for (let x = 1; x < width - 1; x++) {
      if ((x + line * 4) % 10 >= 7) continue; // a gap between gusts
      const y = y0 + Math.round(Math.sin(x / 3 + line * 2) * 1.5);
      const fade = 1 - Math.abs(x - cx) / (width * 0.8);
      px(g, '#f4fbfb', x, y, 1, 1, fade);
      px(g, '#8aa4aa', x, y + 1, 1, 1, fade * 0.6);
    }
  }
});

/** Where an echo was heard: rings spreading from a point. */
const echo = drawer((g, cx, b, width, height) => {
  const cy = b - Math.floor(height / 2) + 1;
  px(g, '#e8f4f8', cx - 1, cy - 1, 2, 2);
  for (const r of [4, 7]) {
    for (let a = -0.9; a <= 0.9; a += 0.15) {
      px(g, '#a8c8d8', cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1);
      px(g, '#a8c8d8', cx - Math.cos(a) * r - 1, cy + Math.sin(a) * r, 1, 1);
    }
  }
  void width;
});

export const worldPlaceholderDrawers: Readonly<Record<string, PlaceholderDrawer>> = {
  map_threshold_rubbleChoke: rubbleChoke,
  map_threshold_rootWall: rootWall,
  map_threshold_saltPlug: saltPlug,
  map_threshold_smoulderingSeam: smoulderingSeam,
  map_threshold_rubbleChoke_open: rubbleChokeOpen,
  map_threshold_rootWall_open: rootWallOpen,
  map_threshold_saltPlug_open: saltPlugOpen,
  map_threshold_smoulderingSeam_open: smoulderingSeamOpen,
  map_threshold_draughtCrack_open: draughtCrackOpen,
  map_threshold_cinderScar_open: cinderScarOpen,
  map_threshold_oldWorkings_open: oldWorkingsOpen,
  map_place_sunkenOak: sunkenOak,
  map_place_drownedChapel: drownedChapel,
  map_place_ossuaryCathedral: ossuaryCathedral,
  map_place_saltSaint: saltSaint,
  map_place_motherCap: motherCap,
  map_place_undertow: undertow,
  map_place_gallowsRoots: gallowsRoots,
  map_place_brineLake: brineLake,
  map_place_ninefoldCamp: ninefoldCamp,
  map_place_myceliumWhisper: myceliumWhisper,
  map_place_silentBell: silentBell,
  map_place_lostSurvey: lostSurvey,
  map_place_hushedStair: hushedStair,
  map_remains: remains,
  map_hoard: hoard,
  map_muck_rich: muckRich,
  map_moisture_rich: moistureRich,
  map_draught: draught,
  map_echo: echo,
};
