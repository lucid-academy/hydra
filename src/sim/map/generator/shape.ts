// Step 1 and 2 of the world: where the lair's swamp, the rings and the rock bands between them lie.
// The rings are measured from a middle that can sit a little off the lair, and their borders wobble,
// so each world has its own lopsided potato shape. Bands of solid rock separate the rings.

import type { Rng } from '../../rng';
import { betweenReal, type HexGrid } from './grid';
import type { UndergroundGeneratorSettings } from './settings';

export const ZONE_LAIR = 0;
/** Band outside ring k: ZONE_BAND + k. Rings use their own number (1, 2, 3...). */
export const ZONE_BAND = 10;
export const ZONE_OUTSIDE = 20;

export interface WorldShape {
  /** Middle of the rings (flat coordinates; the lair is at 0, 0). */
  readonly cx: number;
  readonly cy: number;
  /** Per hex: ZONE_LAIR, a ring number, ZONE_BAND + k for the band outside ring k, or ZONE_OUTSIDE. */
  readonly zone: Int8Array;
  /** Per hex: angle around the rings' middle, and distance from it. */
  readonly angle: Float64Array;
  readonly rho: Float64Array;
  /** Middle of the band outside ring k (or the world's edge for the last ring), at an angle. */
  edge(k: number, angle: number): number;
  /** Thickness of the band outside ring k, at an angle. */
  thickness(k: number, angle: number): number;
}

/** Angles at which the ring borders are worked out; in between they are interpolated. */
const SAMPLES = 360;
/** The world's edge keeps this far inside the map's edge (the outermost hexes are rock anyway). */
const MAP_EDGE_MARGIN = 0.6;
/** Ring 1 starts this far outside the lair's radius. */
const LAIR_EDGE_MARGIN = 0.6;
/** Extra room on top of the minimum ring width, because hexes don't line up with straight lines. */
const WIDTH_MARGIN = 0.7;

export function makeShape(rng: Rng, grid: HexGrid, s: UndergroundGeneratorSettings): WorldShape | null {
  const rings = s.rings.length;
  const offset = rng.next() * s.ringCenterOffset;
  const offsetAngle = rng.next() * Math.PI * 2;
  const cx = Math.cos(offsetAngle) * offset;
  const cy = Math.sin(offsetAngle) * offset;

  // Each border wobbles as a few waves added together, so shapes come out like potatoes and kidneys.
  const wobbles = s.rings.map(() => {
    const phases = [rng.next(), rng.next(), rng.next()].map((p) => p * Math.PI * 2);
    return (a: number) => s.edgeWobble * (0.5 * Math.sin(2 * a + phases[0]!) + 0.3 * Math.sin(3 * a + phases[1]!) + 0.2 * Math.sin(5 * a + phases[2]!));
  });
  const thicknesses = s.rings.slice(0, -1).map(() => {
    const p1 = rng.next() * Math.PI * 2;
    const p2 = rng.next() * Math.PI * 2;
    const [thin, thick] = s.bandThickness;
    return (a: number) => thin + (thick - thin) * Math.min(1, Math.max(0, 0.5 + 0.35 * Math.sin(2 * a + p1) + 0.15 * Math.sin(5 * a + p2)));
  });
  const lairPhase = rng.next() * Math.PI * 2;
  const lairRadiusAt = (a: number) => s.lairRadius + 0.5 * Math.sin(3 * a + lairPhase);

  // Borders at each sampled angle. Going outward, a ring too thin is widened; if the rings then don't fit inside
  // the map, every ring and band gives up room in proportion to what it has above its minimum.
  const minWidth = s.minRingWidth + WIDTH_MARGIN;
  const minBand = s.bandThickness[0];
  const edges: Float64Array[] = Array.from({ length: rings }, () => new Float64Array(SAMPLES));
  const bands: Float64Array[] = Array.from({ length: rings }, () => new Float64Array(SAMPLES));
  for (let j = 0; j < SAMPLES; j++) {
    const a = (j / SAMPLES) * Math.PI * 2;
    const lairEdge = rayToCircle(cx, cy, a, s.lairRadius + LAIR_EDGE_MARGIN);
    const mapEdge = rayToHexagon(cx, cy, a, s.radius - MAP_EDGE_MARGIN);
    const band = s.rings.map((_, k) => (k < rings - 1 ? thicknesses[k]!(a) : 0));
    const width: number[] = [];
    let inner = lairEdge;
    s.rings.forEach((ring, k) => {
      const wanted = ring.outerEdge + wobbles[k]!(a) - band[k]! / 2;
      width.push(Math.max(minWidth, (k === rings - 1 ? Math.min(wanted, mapEdge) : wanted) - inner));
      inner += width[k]! + band[k]!;
    });
    // Too far out for the map: the outermost ring gives up room first, then the band inside it, then the next ring in,
    // so the inner rings keep their own shapes. Not enough room even then: try another world.
    let excess = inner - mapEdge;
    for (let k = rings - 1; k >= 0 && excess > 1e-9; k--) {
      const fromRing = Math.min(excess, width[k]! - minWidth);
      width[k] = width[k]! - fromRing;
      excess -= fromRing;
      if (k > 0) {
        const fromBand = Math.min(excess, band[k - 1]! - minBand);
        band[k - 1] = band[k - 1]! - fromBand;
        excess -= fromBand;
      }
    }
    if (excess > 1e-9) return null;
    let at = lairEdge;
    for (let k = 0; k < rings; k++) {
      at += width[k]!;
      edges[k]![j] = at + band[k]! / 2;
      bands[k]![j] = band[k]!;
      at += band[k]!;
    }
  }
  const sampled = (values: Float64Array, a: number): number => {
    const t = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * SAMPLES;
    const j = Math.floor(t);
    const f = t - j;
    return values[j % SAMPLES]! * (1 - f) + values[(j + 1) % SAMPLES]! * f;
  };
  const edge = (k: number, a: number) => sampled(edges[k - 1]!, a);
  const thickness = (k: number, a: number) => sampled(bands[k - 1]!, a);

  const n = grid.size;
  const zone = new Int8Array(n);
  const angle = new Float64Array(n);
  const rho = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = grid.x[i]!;
    const y = grid.y[i]!;
    angle[i] = Math.atan2(y - cy, x - cx);
    rho[i] = Math.hypot(x - cx, y - cy);
    if (Math.hypot(x, y) <= lairRadiusAt(Math.atan2(y, x))) {
      zone[i] = ZONE_LAIR;
      continue;
    }
    zone[i] = ZONE_OUTSIDE;
    for (let k = 1; k <= rings; k++) {
      const middle = edge(k, angle[i]!);
      const half = k < rings ? thickness(k, angle[i]!) / 2 : 0;
      if (rho[i]! < middle - half) {
        zone[i] = k;
        break;
      }
      if (k < rings && rho[i]! < middle + half) {
        zone[i] = ZONE_BAND + k;
        break;
      }
    }
  }
  // The outermost hexes of the map are always rock.
  const middle = grid.indexOf({ q: 0, r: 0 })!;
  for (let i = 0; i < n; i++) if (grid.steps(i, middle) >= s.radius) zone[i] = ZONE_OUTSIDE;

  // Rings never touch: where two meet, the outer hex becomes band rock. A ring's stray bits become band rock too.
  for (let k = 1; k <= rings; k++) {
    for (let i = 0; i < n; i++) {
      if (zone[i] !== k) continue;
      for (const j of grid.neighbors[i]!) {
        if (zone[j]! > k && zone[j]! <= rings) zone[j] = ZONE_BAND + Math.min(k, rings - 1);
        if (k > 1 && zone[j] === ZONE_LAIR) zone[i] = ZONE_BAND + 1;
      }
    }
    keepLargestPart(grid, zone, k, k < rings ? ZONE_BAND + k : ZONE_OUTSIDE);
  }

  return { cx, cy, zone, angle, rho, edge, thickness };
}

/** Hexes of zone `z` not connected to its largest part become `replacement`. */
function keepLargestPart(grid: HexGrid, zone: Int8Array, z: number, replacement: number): void {
  const part = new Int32Array(grid.size).fill(-1);
  const sizes: number[] = [];
  for (let i = 0; i < grid.size; i++) {
    if (zone[i] !== z || part[i] !== -1) continue;
    const id = sizes.length;
    const queue = [i];
    part[i] = id;
    for (let head = 0; head < queue.length; head++) {
      for (const j of grid.neighbors[queue[head]!]!) {
        if (zone[j] === z && part[j] === -1) {
          part[j] = id;
          queue.push(j);
        }
      }
    }
    sizes.push(queue.length);
  }
  const largest = sizes.indexOf(Math.max(...sizes));
  for (let i = 0; i < grid.size; i++) if (zone[i] === z && part[i] !== largest) zone[i] = replacement;
}

/**
 * Narrowest width of each ring, in hexes: from the ring's inner side, the fewest steps to the rock outside it.
 * Index 0 is unused; index k is ring k.
 */
export function ringWidths(grid: HexGrid, zone: Int8Array, rings: number): number[] {
  const widths = [0];
  for (let k = 1; k <= rings; k++) {
    const outside = (z: number) => z === ZONE_OUTSIDE || z === ZONE_BAND + k || (z > k && z <= rings);
    const sources: number[] = [];
    for (let i = 0; i < grid.size; i++) if (outside(zone[i]!)) sources.push(i);
    const steps = stepFrom(grid, sources);
    const inner = (z: number) => (k === 1 ? z === ZONE_LAIR : z === ZONE_BAND + k - 1);
    let narrowest = Infinity;
    for (let i = 0; i < grid.size; i++) {
      if (zone[i] !== k || !grid.neighbors[i]!.some((j) => inner(zone[j]!))) continue;
      narrowest = Math.min(narrowest, steps[i]!);
    }
    widths.push(narrowest);
  }
  return widths;
}

function stepFrom(grid: HexGrid, sources: number[]): Int32Array {
  const steps = new Int32Array(grid.size).fill(-1);
  const queue = [...sources];
  for (const s of sources) steps[s] = 0;
  for (let head = 0; head < queue.length; head++) {
    for (const j of grid.neighbors[queue[head]!]!) {
      if (steps[j] !== -1) continue;
      steps[j] = steps[queue[head]!]! + 1;
      queue.push(j);
    }
  }
  return steps;
}

/** Distance from (cx, cy) along angle `a` to the circle of radius r around (0, 0). The point must be inside it. */
function rayToCircle(cx: number, cy: number, a: number, r: number): number {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const b = cx * ux + cy * uy;
  return -b + Math.sqrt(b * b - (cx * cx + cy * cy) + r * r);
}

/** Distance from (cx, cy) along angle `a` to the edge of the map's hexagon (corners `r` from (0, 0), pointy-top hexes). */
function rayToHexagon(cx: number, cy: number, a: number, r: number): number {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  let nearest = Infinity;
  for (let side = 0; side < 6; side++) {
    // Corners of the area covered by hexesInRange: at 0°, 60°, ... (hex (r, 0) lies at x = r).
    const a0 = (side * Math.PI) / 3;
    const a1 = ((side + 1) * Math.PI) / 3;
    const x0 = Math.cos(a0) * r;
    const y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const y1 = Math.sin(a1) * r;
    // Solve (cx, cy) + t·u = (x0, y0) + s·(x1 - x0, y1 - y0).
    const ex = x1 - x0;
    const ey = y1 - y0;
    const det = ux * -ey - uy * -ex;
    if (Math.abs(det) < 1e-12) continue;
    const dx = x0 - cx;
    const dy = y0 - cy;
    const t = (dx * -ey - dy * -ex) / det;
    const sOnEdge = (ux * dy - uy * dx) / det;
    if (t > 0 && sOnEdge >= -1e-9 && sOnEdge <= 1 + 1e-9) nearest = Math.min(nearest, t);
  }
  return nearest;
}

/** A random angle (radians). */
export function randomAngle(rng: Rng): number {
  return betweenReal(rng, [0, Math.PI * 2]);
}
