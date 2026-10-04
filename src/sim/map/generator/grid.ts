// Small tools the world generator shares: the hexes of the map as numbers, smoothed noise,
// spreading things apart, and searching for paths.

import { HEX_DIRECTIONS, hex, hexAdd, hexKey, hexNeighbors, hexToPixel, hexesInRange } from '../../hex';
import type { Hex } from '../../hex';
import type { Rng } from '../../rng';

/** Hex centres on a flat map where neighbours are 1 apart, for straight-line distances and angles. */
const FLAT = { columnWidth: 1, rowHeight: Math.sqrt(3) / 2, originX: 0, originY: 0 };

/** The hexes of the map numbered 0..n-1, with each hex's neighbours and flat position (fast to work with). */
export class HexGrid {
  readonly hexes: Hex[];
  readonly neighbors: number[][];
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly index: Map<string, number>;
  /** Neighbour of hex i in direction d (HEX_DIRECTIONS) at [i * 6 + d], or -1 off the map. */
  private readonly inDirection: Int32Array;

  constructor(readonly radius: number) {
    this.hexes = hexesInRange(hex(0, 0), radius);
    this.index = new Map(this.hexes.map((h, i) => [hexKey(h), i]));
    this.neighbors = this.hexes.map((h) => hexNeighbors(h).flatMap((n) => this.index.get(hexKey(n)) ?? []));
    this.x = Float64Array.from(this.hexes, (h) => hexToPixel(FLAT, h).x);
    this.y = Float64Array.from(this.hexes, (h) => hexToPixel(FLAT, h).y);
    this.inDirection = new Int32Array(this.hexes.length * 6).fill(-1);
    this.hexes.forEach((h, i) => HEX_DIRECTIONS.forEach((d, k) => (this.inDirection[i * 6 + k] = this.index.get(hexKey(hexAdd(h, d))) ?? -1)));
  }

  /** The neighbour of hex i in direction d (0–5, as HEX_DIRECTIONS), or -1 off the map. */
  neighborIn(i: number, d: number): number {
    return this.inDirection[i * 6 + (((d % 6) + 6) % 6)]!;
  }

  get size(): number {
    return this.hexes.length;
  }

  indexOf(h: Hex): number | undefined {
    return this.index.get(hexKey(h));
  }

  /** Straight-line distance between two hexes (neighbours are 1 apart). */
  between(a: number, b: number): number {
    return Math.hypot(this.x[a]! - this.x[b]!, this.y[a]! - this.y[b]!);
  }

  /** Steps between two hexes. */
  steps(a: number, b: number): number {
    const p = this.hexes[a]!;
    const q = this.hexes[b]!;
    return (Math.abs(p.q - q.q) + Math.abs(p.r - q.r) + Math.abs(p.q + p.r - q.q - q.r)) / 2;
  }

  /** The hex nearest to a flat position, or undefined outside the map. */
  at(x: number, y: number): number | undefined {
    const r = y / FLAT.rowHeight;
    const q = x - r / 2;
    // Rounding in cube coordinates, as in hexRound().
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return this.indexOf(hex(rq, rr));
  }
}

/**
 * Random values over the hexes, averaged with their neighbours `passes` times (so they form blobs),
 * then turned into ranks from 0 to 1 (so "the top 30%" really is 30% of the hexes).
 */
export function smoothNoise(rng: Rng, grid: HexGrid, passes: number): Float64Array {
  const n = grid.size;
  let values = Float64Array.from({ length: n }, () => rng.next());
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = values[i]!;
      for (const j of grid.neighbors[i]!) sum += values[j]!;
      next[i] = sum / (grid.neighbors[i]!.length + 1);
    }
    values = next;
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a]! - values[b]!);
  const ranks = new Float64Array(n);
  order.forEach((i, rank) => (ranks[i] = rank / Math.max(1, n - 1)));
  return ranks;
}

/**
 * Picks up to `count` hexes at least `minApart` steps from each other (and from `taken`), favouring higher weights.
 * Returns fewer when they don't fit.
 */
export function pickSpread(rng: Rng, grid: HexGrid, candidates: readonly number[], count: number, minApart: number, weight: (i: number) => number = () => 1, taken: readonly number[] = []): number[] {
  let pool = candidates
    .filter((i) => taken.every((t) => grid.steps(i, t) >= minApart))
    .map((i) => ({ i, weight: Math.max(0.001, weight(i)) }));
  const picked: number[] = [];
  while (picked.length < count && pool.length > 0) {
    const choice = rng.weightedPick(pool).i;
    picked.push(choice);
    pool = pool.filter((p) => grid.steps(p.i, choice) >= minApart);
  }
  return picked;
}

/** Random whole number between the two ends of a range, both included. */
export function between(rng: Rng, [min, max]: readonly [number, number]): number {
  return rng.int(min, max);
}

/** Random number between the two ends of a range. */
export function betweenReal(rng: Rng, [min, max]: readonly [number, number]): number {
  return min + rng.next() * (max - min);
}

/** The list in a random order (the list itself is not changed). */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Cheapest path from `from` to `to` (both included), where `cost(i)` is the price of stepping onto hex i
 * (null = can't). A* with the number of steps as the estimate, so costs must be at least `minCost`.
 */
export function cheapestPath(grid: HexGrid, from: number, to: number, cost: (i: number) => number | null, minCost = 0.5): number[] | null {
  const n = grid.size;
  const best = new Float64Array(n).fill(Infinity);
  const cameFrom = new Int32Array(n).fill(-1);
  const heap = new MinHeap();
  best[from] = 0;
  heap.push(from, grid.steps(from, to) * minCost);
  while (heap.size > 0) {
    const current = heap.pop();
    if (current === to) break;
    for (const next of grid.neighbors[current]!) {
      const step = cost(next);
      if (step === null) continue;
      const total = best[current]! + step;
      if (total >= best[next]!) continue;
      best[next] = total;
      cameFrom[next] = current;
      heap.push(next, total + grid.steps(next, to) * minCost);
    }
  }
  if (best[to] === Infinity) return null;
  const path = [to];
  while (path[path.length - 1] !== from) path.push(cameFrom[path[path.length - 1]!]!);
  return path.reverse();
}

/** Steps from the nearest source to every hex, moving only through hexes where `passable` is true (-1 = not reached). */
export function stepsFrom(grid: HexGrid, sources: readonly number[], passable: (i: number) => boolean): Int32Array {
  const steps = new Int32Array(grid.size).fill(-1);
  const queue = [...sources];
  for (const s of sources) steps[s] = 0;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    for (const next of grid.neighbors[current]!) {
      if (steps[next] !== -1 || !passable(next)) continue;
      steps[next] = steps[current]! + 1;
      queue.push(next);
    }
  }
  return steps;
}

/** A binary heap of hex numbers, cheapest first (for path search). */
class MinHeap {
  private readonly items: number[] = [];
  private readonly priorities: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, priority: number): void {
    this.items.push(item);
    this.priorities.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent]! <= this.priorities[i]!) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0]!;
    const lastItem = this.items.pop()!;
    const lastPriority = this.priorities.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.priorities[0] = lastPriority;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.priorities[left]! < this.priorities[smallest]!) smallest = left;
        if (right < this.items.length && this.priorities[right]! < this.priorities[smallest]!) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b]!, this.items[a]!];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b]!, this.priorities[a]!];
  }
}
