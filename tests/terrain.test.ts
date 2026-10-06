import { describe, expect, it } from 'vitest';
import { hexRowSpans } from '../src/assets/drawing';
import { cutTile, GROUND_SHADING, isTerrainTextureKey, paintBoard } from '../src/assets/terrain';
import type { Pixels, TileShape } from '../src/assets/terrain';
import { hexesInRange, hexKey, hexNeighbors, hexToPixel } from '../src/sim/hex';

/** A texture where every pixel says where it is: red = x, green = y, blue = 200. */
function coordinateTexture(width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set([x, y, 200, 255], (y * width + x) * 4);
  }
  return { width, height, data };
}

const at = (p: Pixels, x: number, y: number) => [...p.data.slice((y * p.width + x) * 4, (y * p.width + x) * 4 + 4)];
const BATTLE: TileShape = { width: 42, faceHeight: 36, wallDepth: 10 };
const NO_SHADING = { face: 1, rim: 1, wallLeft: 1, wallRight: 1, wallLayers: 1 };

describe('cutting hex tiles from textures', () => {
  const texture = coordinateTexture(96, 67);

  it('makes a tile of the face plus its walls, transparent outside the hex', () => {
    const tile = cutTile(texture, texture, BATTLE, GROUND_SHADING, 1);
    expect([tile.width, tile.height]).toEqual([42, 46]);
    expect(at(tile, 0, 0)[3]).toBe(0); // corners stay see-through
    expect(at(tile, 41, 45)[3]).toBe(0);
    expect(at(tile, 21, 18)[3]).toBe(255); // middle of the face
    expect(at(tile, 21, 45)[3]).toBe(255); // wall under the bottom point
  });

  it('copies one piece of the texture into the face, pixel for pixel', () => {
    const tile = cutTile(texture, texture, BATTLE, NO_SHADING, 7);
    const [x0, y0] = at(tile, 10, 18);
    expect(at(tile, 11, 18).slice(0, 2)).toEqual([x0! + 1, y0]);
    expect(at(tile, 10, 19).slice(0, 2)).toEqual([x0, y0! + 1]);
    // The piece lies inside the texture, so no seams from wrapping round.
    expect(x0! - 10).toBeGreaterThanOrEqual(0);
    expect(x0! - 10 + 42).toBeLessThanOrEqual(96);
  });

  it('darkens the rim of the face and the walls, the left wall more than the right', () => {
    const tile = cutTile(coordinateTexture(96, 67), texture, BATTLE, GROUND_SHADING, 3);
    const [x0, x1] = hexRowSpans(42, 36)[18]!;
    expect(at(tile, x0, 18)[2]).toBeLessThan(200); // rim
    expect(at(tile, x0 + 1, 18)[2]).toBe(200); // inside
    expect(at(tile, x1 - 1, 18)[2]).toBeLessThan(200);
    const left = at(tile, 10, 40)[2]!;
    const right = at(tile, 31, 40)[2]!;
    expect(left).toBeLessThan(right);
    expect(right).toBeLessThan(200);
  });

  it('always cuts the same way for the same seed, and differently for another', () => {
    const a = cutTile(texture, texture, BATTLE, GROUND_SHADING, 11);
    const b = cutTile(texture, texture, BATTLE, GROUND_SHADING, 11);
    expect(a.data).toEqual(b.data);
    const others = [12, 13, 14, 15].map((seed) => cutTile(texture, texture, BATTLE, GROUND_SHADING, seed));
    expect(others.some((c) => at(c, 21, 18).join() !== at(a, 21, 18).join())).toBe(true);
  });

  it('copes with a texture smaller than the tile by wrapping round', () => {
    const tile = cutTile(coordinateTexture(16, 16), coordinateTexture(16, 16), BATTLE, NO_SHADING, 5);
    expect(at(tile, 21, 18)[3]).toBe(255);
  });

  it('knows which manifest images are textures', () => {
    expect(isTerrainTextureKey('texture_ground_lairSwamp_mud')).toBe(true);
    expect(isTerrainTextureKey('map_ground_lairSwamp_mud')).toBe(false);
  });
});

describe('painting the whole battle board as one picture', () => {
  // A board of radius 2 laid out like the battle (42 wide, rows 27 apart), moved so it starts at the picture's corner.
  const hexes = hexesInRange({ q: 0, r: 0 }, 2);
  const layout = { columnWidth: 42, rowHeight: 27, originX: 0, originY: 0 };
  const raw = hexes.map((h) => hexToPixel(layout, h));
  const left = Math.min(...raw.map((c) => c.x)) - 21;
  const top = Math.min(...raw.map((c) => c.y)) - 18;
  const centers = raw.map((c) => ({ x: c.x - left, y: c.y - top }));
  const size = { width: Math.max(...centers.map((c) => c.x)) + 21 + 2, height: Math.max(...centers.map((c) => c.y)) + 18 + 10 + 2 };
  const face = coordinateTexture(300, 260);
  const wall: Pixels = { width: 1, height: 1, data: new Uint8ClampedArray([250, 0, 0, 255]) };
  const board = paintBoard(face, wall, centers, size, BATTLE, NO_SHADING);
  const isWall = (x: number, y: number) => at(board, x, y)[0] === 250 && at(board, x, y)[2] === 0;

  it('shows the texture right where each face lies, so neighbours join without a seam', () => {
    let faces = 0;
    let wrong = 0;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const [red, green, blue, alpha] = at(board, x, y);
        if (alpha === 0 || isWall(x, y)) continue;
        faces++;
        if (red !== x || green !== y || blue !== 200) wrong++;
      }
    }
    expect(wrong).toBe(0);
    expect(faces).toBeGreaterThan(19 * 1000);
  });

  it('leaves no gap inside the board: a hex with all six neighbours shows only face', () => {
    const onBoard = new Set(hexes.map(hexKey));
    const spans = hexRowSpans(BATTLE.width, BATTLE.faceHeight);
    let gaps = 0;
    hexes.forEach((h, i) => {
      if (!hexNeighbors(h).every((n) => onBoard.has(hexKey(n)))) return;
      const x = Math.round(centers[i]!.x - 21);
      const y = Math.round(centers[i]!.y - 18);
      spans.forEach(([x0, x1], row) => {
        for (let col = x0; col < x1; col++) if (at(board, x + col, y + row)[3] !== 255 || isWall(x + col, y + row)) gaps++;
      });
    });
    expect(gaps).toBe(0);
  });

  it('shows walls under the front edge only, and nothing outside the board', () => {
    const front = hexes.findIndex((h) => h.q === 0 && h.r === 2);
    const bottom = { x: Math.round(centers[front]!.x), y: Math.round(centers[front]!.y + 18) };
    expect(isWall(bottom.x, bottom.y + 2)).toBe(true);
    const middle = hexes.findIndex((h) => h.q === 0 && h.r === 0);
    expect(isWall(Math.round(centers[middle]!.x), Math.round(centers[middle]!.y + 18) + 2)).toBe(false);
    expect(at(board, 0, 0)[3]).toBe(0);
    expect(at(board, board.width - 1, board.height - 1)[3]).toBe(0);
  });
});
