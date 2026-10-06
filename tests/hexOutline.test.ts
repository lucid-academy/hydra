import { describe, expect, it } from 'vitest';
import { hexEdges, hexOutlines, roundCorners } from '../src/scenes/hexOutline';
import { hex, hexesInRange, hexNeighbors } from '../src/sim/hex';

const LAYOUT = { columnWidth: 30, rowHeight: 18, originX: 0, originY: 0 };
const sorted = (points: Array<{ x: number; y: number }>) => points.map((p) => `${p.x},${p.y}`).sort();

describe('the line around a group of hexes', () => {
  it('goes round a single hex through its six corners', () => {
    const lines = hexOutlines([hex(0, 0)], LAYOUT);
    expect(lines).toHaveLength(1);
    expect(sorted(lines[0]!)).toEqual(sorted([
      { x: 15, y: 6 },
      { x: 15, y: -6 },
      { x: 0, y: -12 },
      { x: -15, y: -6 },
      { x: -15, y: 6 },
      { x: 0, y: 12 },
    ]));
  });

  it('goes round neighbours as one, leaving out the side they share', () => {
    const lines = hexOutlines([hex(0, 0), hex(1, 0)], LAYOUT);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(10);
    // Each corner once: the line doesn't cross itself.
    expect(new Set(sorted(lines[0]!)).size).toBe(10);
  });

  it('also goes round a hole in the group', () => {
    const ring = hexNeighbors(hex(0, 0));
    const lines = hexOutlines(ring, LAYOUT);
    expect(lines.map((line) => line.length).sort((a, b) => a - b)).toEqual([6, 18]);
  });

  it('counts a hex given twice once', () => {
    expect(hexOutlines([hex(2, -1), hex(2, -1)], LAYOUT)[0]).toHaveLength(6);
  });

  it('has no line for no hexes', () => {
    expect(hexOutlines([], LAYOUT)).toEqual([]);
  });
});

describe('rounding corners', () => {
  it('cuts every corner off, keeping the line inside the old one', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 8 },
      { x: 0, y: 8 },
    ];
    const once = roundCorners(square, 1);
    expect(once).toEqual([
      { x: 2, y: 0 },
      { x: 6, y: 0 },
      { x: 8, y: 2 },
      { x: 8, y: 6 },
      { x: 6, y: 8 },
      { x: 2, y: 8 },
      { x: 0, y: 6 },
      { x: 0, y: 2 },
    ]);
    const thrice = roundCorners(square, 3);
    expect(thrice).toHaveLength(32);
    for (const p of thrice) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(8);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(8);
    }
  });
});

describe('the sides of a group of hexes', () => {
  const key = ([a, b]: [{ x: number; y: number }, { x: number; y: number }]) => [`${a.x},${a.y}`, `${b.x},${b.y}`].sort().join(' ');

  it('gives every side of a single hex', () => {
    expect(hexEdges([hex(0, 0)], LAYOUT)).toHaveLength(6);
  });

  it('gives a side two hexes share only once', () => {
    expect(hexEdges([hex(0, 0), hex(1, 0)], LAYOUT)).toHaveLength(11);
    // A hex and its six neighbours: 42 sides, 12 of them shared.
    const edges = hexEdges(hexesInRange(hex(0, 0), 1), LAYOUT);
    expect(edges).toHaveLength(30);
    expect(new Set(edges.map(key)).size).toBe(30);
  });
});
