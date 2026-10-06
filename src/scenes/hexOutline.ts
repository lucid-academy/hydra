// The line around a group of hexes on the map, such as everywhere the hydra can go this turn (in HD, GAME_DESIGN.md
// §13): one line around the whole group, with rounded corners, instead of an outline on every hex.
// Plain geometry, no Phaser, so it can be tested.

import { HEX_DIRECTIONS, hexAdd, hexKey, hexToPixel } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';

export interface Point {
  x: number;
  y: number;
}

/**
 * The closed lines around a group of hexes: its outer edge, and the edge of every hole in it (hexes inside that are
 * not in the group). Each line is a list of hex corners; the last one joins back to the first.
 */
export function hexOutlines(hexes: Iterable<Hex>, layout: HexLayout): Point[][] {
  const group = new Map<string, Hex>();
  for (const h of hexes) group.set(hexKey(h), h);

  // The corners of a hex, from its centre. The side towards neighbour `d` (HEX_DIRECTIONS) runs from corner d to d + 1.
  const halfWidth = layout.columnWidth / 2;
  const top = (layout.rowHeight * 2) / 3;
  const side = layout.rowHeight / 3;
  const corners: Point[] = [
    { x: halfWidth, y: side },
    { x: halfWidth, y: -side },
    { x: 0, y: -top },
    { x: -halfWidth, y: -side },
    { x: -halfWidth, y: side },
    { x: 0, y: top },
  ];

  // Every side between a hex of the group and one outside it, found by the corner it starts at. All of them run the
  // same way round their hex, so where one ends the next one starts, and each corner starts at most one.
  const sides = new Map<string, { from: Point; to: Point }>();
  for (const h of group.values()) {
    const centre = hexToPixel(layout, h);
    HEX_DIRECTIONS.forEach((direction, d) => {
      if (group.has(hexKey(hexAdd(h, direction)))) return;
      const a = corners[d]!;
      const b = corners[(d + 1) % 6]!;
      const from = { x: centre.x + a.x, y: centre.y + a.y };
      sides.set(pointKey(from), { from, to: { x: centre.x + b.x, y: centre.y + b.y } });
    });
  }

  const lines: Point[][] = [];
  for (const [startKey, first] of sides) {
    if (!sides.has(startKey)) continue;
    const line: Point[] = [];
    let side: { from: Point; to: Point } | undefined = first;
    let key = startKey;
    while (side) {
      sides.delete(key);
      line.push(side.from);
      key = pointKey(side.to);
      side = sides.get(key);
    }
    lines.push(line);
  }
  return lines;
}

/** Rounds the corners of a closed line by cutting each one off, `passes` times (Chaikin's method). */
export function roundCorners(line: readonly Point[], passes: number): Point[] {
  let points = [...line];
  for (let pass = 0; pass < passes; pass++) {
    const cut: Point[] = [];
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]!;
      cut.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    });
    points = cut;
  }
  return points;
}

/** Corners of neighbouring hexes are the same point; rounding makes them the same key too. */
function pointKey(p: Point): string {
  return `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
}
