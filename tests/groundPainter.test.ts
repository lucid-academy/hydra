import { describe, expect, it } from 'vitest';
import { GroundPainter, HexGrid } from '../src/assets/groundPainter';
import type { GroundTexture } from '../src/assets/groundPainter';
import type { Pixels } from '../src/assets/terrain';
import { hexesInRange, hexToPixel } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';

const LAYOUT = { columnWidth: 30, rowHeight: 18, originX: 0, originY: 0 };
const DENSITY = 2;
const LIFT = 12;
const RADIUS = 3;
const ORIGIN = { x: -130, y: -110 };
const SIZE = { width: 520, height: 420 };

function flat(red: number, green: number, blue: number, kind: GroundTexture['kind']): GroundTexture {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < data.length; i += 4) data.set([red, green, blue, 255], i);
  return { kind, pixels: { width: 4, height: 4, data } };
}

const GROUND = 0;
const MOSS = 1;
const WATER = 2;
const ROCK = 3;
const TEXTURES = [flat(120, 100, 70, 'ground'), flat(60, 110, 50, 'ground'), flat(40, 80, 110, 'water'), flat(90, 90, 95, 'rock')];

/** A small map: moss everywhere, a rock in the middle, a ground hex and a water hex beside it. Known: what `known` says. */
function makePainter(known: (h: Hex) => boolean, seed = 7): { painter: GroundPainter; grid: HexGrid } {
  const grid = new HexGrid(RADIUS + 3);
  for (const h of hexesInRange({ q: 0, r: 0 }, RADIUS)) {
    const texture = h.q === 0 && h.r === 0 ? ROCK : h.q === 1 && h.r === 0 ? GROUND : h.q === -1 && h.r === 1 ? WATER : MOSS;
    grid.setLook(h.q, h.r, { texture, rock: texture === ROCK });
    grid.setKnown(h.q, h.r, known(h));
  }
  const painter = new GroundPainter(
    { layout: LAYOUT, density: DENSITY, lift: LIFT, originX: ORIGIN.x, originY: ORIGIN.y, width: SIZE.width, height: SIZE.height, seed },
    grid,
    TEXTURES,
  );
  return { painter, grid };
}

function paintAll(painter: GroundPainter, only = -1): Pixels {
  const out = { width: SIZE.width, height: SIZE.height, data: new Uint8ClampedArray(SIZE.width * SIZE.height * 4) };
  painter.paint({ x0: 0, y0: 0, x1: SIZE.width, y1: SIZE.height }, out, 0, 0, only);
  return out;
}

/** The ground pixel at a point of the world. */
function pixelOf(x: number, y: number): [number, number] {
  return [Math.floor((x - ORIGIN.x) * DENSITY), Math.floor((y - ORIGIN.y) * DENSITY)];
}

const alphaAt = (p: Pixels, x: number, y: number): number => p.data[(y * p.width + x) * 4 + 3]!;

/** How many values differ between two pictures of the same size (quicker than comparing them with toEqual). */
function differences(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) count++;
  return count + Math.abs(a.length - b.length);
}

describe('painting the map ground', () => {
  it('paints nothing the hydra does not know', () => {
    const { painter } = makePainter(() => false);
    const pixels = paintAll(painter);
    expect(pixels.data.every((value) => value === 0)).toBe(true);
  });

  it('paints exactly the pixels whose hex is known', () => {
    const near = (h: Hex): boolean => Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r) <= 2;
    const { painter, grid } = makePainter(near);
    const pixels = paintAll(painter);
    let painted = 0;
    let wrong = 0;
    for (let y = 0; y < SIZE.height; y++) {
      for (let x = 0; x < SIZE.width; x++) {
        const owner = painter.ownerAt(x, y);
        const shown = owner >= 0 && grid.known[owner] === 1;
        if (alphaAt(pixels, x, y) !== (shown ? 255 : 0)) wrong++;
        if (shown) painted++;
      }
    }
    expect(wrong).toBe(0);
    expect(painted).toBeGreaterThan(10000);
    // The middle of a known hex is painted, the middle of an unknown one is not.
    const known = hexToPixel(LAYOUT, { q: 1, r: -1 });
    const unknown = hexToPixel(LAYOUT, { q: 3, r: -1 });
    expect(alphaAt(pixels, ...pixelOf(known.x, known.y + 4))).toBe(255);
    expect(alphaAt(pixels, ...pixelOf(unknown.x, unknown.y + 4))).toBe(0);
  });

  it('raises known rock: its top shows above its place, a cliff below it, ground in front', () => {
    const { painter, grid } = makePainter(() => true);
    const rock = grid.index(0, 0);
    expect(painter.ownerAt(...pixelOf(0, -LIFT))).toBe(rock);
    expect(painter.ownerAt(...pixelOf(0, 6))).toBe(rock);
    const inFront = painter.ownerAt(...pixelOf(0, 24));
    expect(inFront).toBeGreaterThanOrEqual(0);
    expect(grid.rock[inFront]).toBe(0);
  });

  it('shows the ground behind rock the hydra does not know yet', () => {
    const { painter, grid } = makePainter((h) => !(h.q === 0 && h.r === 0));
    // Where known rock would show its top, the hex behind it shows instead.
    const behind = painter.ownerAt(...pixelOf(0, -LIFT - 4));
    expect(grid.rock[behind]).toBe(0);
    expect(grid.known[behind]).toBe(1);
  });

  it('always paints the same map the same way, and another seed differently', () => {
    const first = paintAll(makePainter(() => true).painter);
    const again = paintAll(makePainter(() => true).painter);
    const other = paintAll(makePainter(() => true, 8).painter);
    expect(differences(again.data, first.data)).toBe(0);
    expect(differences(other.data, first.data)).toBeGreaterThan(0);
  });

  it('paints the same in pieces as all at once', () => {
    const { painter } = makePainter(() => true);
    const whole = paintAll(painter);
    const pieces = { width: SIZE.width, height: SIZE.height, data: new Uint8ClampedArray(SIZE.width * SIZE.height * 4) };
    for (const [x0, y0, x1, y1] of [
      [0, 0, 250, 250],
      [250, 0, SIZE.width, 250],
      [0, 250, 250, SIZE.height],
      [250, 250, SIZE.width, SIZE.height],
    ] as const) {
      // Each piece painted into its own small picture, then copied in, like the chunks on the map.
      const part = { width: x1 - x0, height: y1 - y0, data: new Uint8ClampedArray((x1 - x0) * (y1 - y0) * 4) };
      painter.paint({ x0, y0, x1, y1 }, part, x0, y0);
      for (let y = y0; y < y1; y++) pieces.data.set(part.data.subarray((y - y0) * part.width * 4, (y - y0 + 1) * part.width * 4), (y * SIZE.width + x0) * 4);
    }
    expect(differences(pieces.data, whole.data)).toBe(0);
  });

  it("paints a rock's own picture with just its pixels, all inside its rectangle", () => {
    const { painter, grid } = makePainter(() => true);
    const rock = grid.index(0, 0);
    const whole = paintAll(painter);
    const block = paintAll(painter, rock);
    const rect = painter.hexRect(0, 0);
    let count = 0;
    let wrong = 0;
    let outside = 0;
    for (let y = 0; y < SIZE.height; y++) {
      for (let x = 0; x < SIZE.width; x++) {
        const i = (y * SIZE.width + x) * 4;
        if (painter.ownerAt(x, y) === rock) {
          count++;
          for (let c = 0; c < 4; c++) if (block.data[i + c] !== whole.data[i + c]) wrong++;
        } else if (block.data[i + 3] !== 0) {
          wrong++;
        }
        if (block.data[i + 3] !== 0 && !(x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1)) outside++;
      }
    }
    expect(wrong).toBe(0);
    expect(outside).toBe(0);
    expect(count).toBeGreaterThan(500);
  });

  it('tells how dark each square shows, the quick way giving what each pixel says', () => {
    const near = (h: Hex): boolean => Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r) <= 2;
    const { painter, grid } = makePainter(near);
    // Seen around the rock, remembered further out, unknown beyond.
    const levels = new Float32Array(grid.size * grid.size).fill(1);
    for (const h of hexesInRange({ q: 0, r: 0 }, RADIUS)) {
      const distance = (Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r)) / 2;
      if (distance <= 1) levels[grid.index(h.q, h.r)] = 0;
      else if (distance <= 2) levels[grid.index(h.q, h.r)] = 0.5;
    }
    const cell = 4;
    const { values, across, down } = painter.shownLevels(levels, cell);
    expect([across, down]).toEqual([Math.ceil(SIZE.width / DENSITY / cell), Math.ceil(SIZE.height / DENSITY / cell)]);
    let wrong = 0;
    for (let y = 0; y < down; y++) {
      for (let x = 0; x < across; x++) {
        const owner = painter.ownerAt(Math.floor((x + 0.5) * cell * DENSITY), Math.floor((y + 0.5) * cell * DENSITY));
        if (values[y * across + x] !== (owner >= 0 ? levels[owner] : 1)) wrong++;
      }
    }
    expect(wrong).toBe(0);
    expect(values).toContain(0);
    expect(values).toContain(0.5);
  });

  it('works the darkness out again around changed hexes only, the same as all over', () => {
    const near = (h: Hex): boolean => Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r) <= 2;
    const { painter, grid } = makePainter(near);
    const cell = 4;
    const levels = new Float32Array(grid.size * grid.size).fill(1);
    for (const h of hexesInRange({ q: 0, r: 0 }, 1)) levels[grid.index(h.q, h.r)] = 0;
    const before = painter.shownLevels(levels, cell).values;

    // The hydra moves on: the rock and a hex beyond it come into sight, the old place is remembered.
    const changed = [grid.index(0, 0), grid.index(2, -1), grid.index(-1, 0)];
    grid.setKnown(2, -1, true);
    const after = levels.slice();
    after[changed[0]!] = 0.5;
    after[changed[1]!] = 0;
    after[changed[2]!] = 0.5;
    let area = painter.squaresAround(0, 0, cell);
    for (const index of changed.slice(1)) {
      const { q, r } = grid.hexAt(index);
      const around = painter.squaresAround(q, r, cell);
      area = { x0: Math.min(area.x0, around.x0), y0: Math.min(area.y0, around.y0), x1: Math.max(area.x1, around.x1), y1: Math.max(area.y1, around.y1) };
    }
    const partly = painter.shownLevels(after, cell, before.slice(), area).values;
    const fully = painter.shownLevels(after, cell).values;
    expect(partly).toEqual(fully);
    expect(fully).not.toEqual(before);

    // Any one hex going dark changes nothing outside its own squares.
    for (const h of hexesInRange({ q: 0, r: 0 }, RADIUS)) {
      const one = after.slice();
      one[grid.index(h.q, h.r)] = 0.25;
      const square = painter.shownLevels(one, cell, fully.slice(), painter.squaresAround(h.q, h.r, cell)).values;
      expect(square).toEqual(painter.shownLevels(one, cell).values);
    }
  });
});
