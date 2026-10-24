// The surface (GAME_DESIGN.md §5.6, §9): one map over the underground, on the same hexes, so a Passage comes out right
// above where it starts. The castle with the cathedral of the Eternal Flame stands on its hill on the far side from the
// first Passage; Flame Shrines, camps of the Order, villages, a mill and watchtowers lie between, among fields, forest,
// hills, crags and a river. Deterministic: the same seed and the same Passages give the same surface. A surface that
// breaks a rule is thrown away and built again, with the random numbers going on from where they stopped.

import { hexKey } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import { HexGrid, between, pickSpread, shuffled, smoothNoise, stepsFrom } from './generator/grid';
import type { Range, Weighted } from './generator/settings';
import type { MapObject, SurfaceMap, TerrainTable, TerrainType, Tile } from './types';

export interface SurfaceGeneratorSettings {
  /** The same as the underground's, so every Passage has its hex on both maps. */
  radius: number;
  /** The surface's biome (biomes.json): its name, ground looks and decorations. */
  biome: string;
  /** The castle stands this many hexes in from the edge, on a hill this many hexes round. */
  castle: { fromEdge: number; hillRadius: number };
  /** Share of the land under forest and under hills, and how blobby each is (passes of smoothing). */
  forest: { share: number; smoothing: number };
  hills: { share: number; smoothing: number };
  /** Clumps of bare crag nobody can cross, and how many hexes each. */
  crags: { count: Range; size: Range };
  /** How much the river wanders (0 = straight across). */
  river: { winding: number };
  /**
   * Flame Shrines: how many, how far apart and from the Passages and the castle. A shrine's guard is a group of its tier
   * (groupsByTier), and its tier is 1 + how many of tierByCastleDistance its distance from the castle is within.
   */
  flameShrines: { count: number; minApart: number; minFromPassage: number; minFromCastle: number; tierByCastleDistance: readonly number[]; groupsByTier: Readonly<Record<number, Weighted>> };
  camps: { count: number; minFromPassage: number; minFromCastle: number };
  /** Villages, the mill, watchtowers: how many of each, and what they like to stand by. */
  settlements: ReadonlyArray<{ id: string; count: number; by: 'river' | 'hill' | 'field' }>;
  /** Things lying about (surface.json finds); a unique one comes up at most once. */
  finds: { count: number; minFromPassage: number; pool: ReadonlyArray<{ id: string; weight: number; unique: boolean }> };
  eventSites: number;
  /** Objects keep at least this many steps from each other. */
  spacing: number;
}

const MAX_ATTEMPTS = 100;
/** The kind of settlement the Order sets out from. */
export const CAMP = 'camp';

/** `passages`: where the underground's Passages are; the first is the one nearest the lair. */
export function generateSurface(seed: number, settings: SurfaceGeneratorSettings, terrain: TerrainTable, passages: readonly Hex[]): SurfaceMap {
  return generateSurfaceWithReport(seed, settings, terrain, passages).map;
}

/** The surface, and why the attempts before it were thrown away (for tests and tuning). */
export function generateSurfaceWithReport(seed: number, settings: SurfaceGeneratorSettings, terrain: TerrainTable, passages: readonly Hex[]): { map: SurfaceMap; rejected: string[] } {
  // Its own stream of random numbers, so the surface never changes the underground.
  const rng = new Rng((seed ^ 0x50f7ace) >>> 0);
  const grid = new HexGrid(settings.radius);
  const rejected: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = tryGenerate(rng, grid, settings, terrain, passages);
    if (typeof result !== 'string') return { map: result, rejected };
    rejected.push(result);
  }
  throw new Error(`Surface generator failed ${MAX_ATTEMPTS} times for seed ${seed} (last: ${rejected[rejected.length - 1]}); check generator in surface.json.`);
}

function tryGenerate(rng: Rng, grid: HexGrid, s: SurfaceGeneratorSettings, terrainRules: TerrainTable, passageHexes: readonly Hex[]): SurfaceMap | string {
  const n = grid.size;
  const passages = passageHexes.map((h) => grid.indexOf(h)).filter((i): i is number => i !== undefined);
  if (passages.length === 0) return 'passages: none on the map';
  const centre = grid.indexOf({ q: 0, r: 0 })!;
  const terrain: TerrainType[] = new Array<TerrainType>(n).fill('field');
  const objects: Array<MapObject | null> = new Array<MapObject | null>(n).fill(null);
  const nearest = (from: readonly number[], i: number) => Math.min(...from.map((f) => grid.steps(i, f)));

  // ---- The castle: on the far side from the first Passage, on its hill.
  const first = passages[0]!;
  const angle = Math.atan2(grid.y[first]! - grid.y[centre]!, grid.x[first]! - grid.x[centre]!) + Math.PI + (rng.next() - 0.5) * 0.6;
  // As far out that way as keeps it fromEdge steps in from the edge (the map is a hex, so how far depends on the way).
  let castle: number | undefined;
  for (let reach = s.radius - s.castle.fromEdge; reach > 0 && castle === undefined; reach -= 0.5) {
    const at = grid.at(Math.cos(angle) * reach, Math.sin(angle) * reach);
    if (at !== undefined && grid.steps(at, centre) <= s.radius - s.castle.fromEdge) castle = at;
  }
  if (castle === undefined) return 'castle: off the map';

  // ---- Ground: hills and forest in blobs, crags in clumps; the castle's hill.
  const hills = smoothNoise(rng, grid, s.hills.smoothing);
  const forest = smoothNoise(rng, grid, s.forest.smoothing);
  for (let i = 0; i < n; i++) {
    if (hills[i]! >= 1 - s.hills.share) terrain[i] = 'hill';
    else if (forest[i]! >= 1 - s.forest.share) terrain[i] = 'forest';
  }
  for (let i = 0; i < n; i++) if (grid.steps(i, castle) <= s.castle.hillRadius) terrain[i] = 'hill';
  const keepClear = (i: number) => nearest(passages, i) <= 2 || grid.steps(i, castle) <= s.castle.hillRadius + 1;
  for (let c = between(rng, s.crags.count); c > 0; c--) {
    const options = Array.from({ length: n }, (_, i) => i).filter((i) => !keepClear(i) && grid.steps(i, centre) < s.radius - 1);
    if (options.length === 0) break;
    const clump = [rng.pick(options)];
    for (let size = between(rng, s.crags.size); clump.length < size; ) {
      const next = shuffled(rng, grid.neighbors[rng.pick(clump)]!).find((j) => !clump.includes(j) && !keepClear(j));
      if (next === undefined) break;
      clump.push(next);
    }
    for (const i of clump) terrain[i] = 'rock';
  }

  // ---- The river: from one edge across to the other, wandering, round the castle's hill.
  const edge = Array.from({ length: n }, (_, i) => i).filter((i) => grid.steps(i, centre) === s.radius);
  const riverAngle = rng.next() * Math.PI * 2;
  const edgeAt = (a: number) => edge.reduce((best, i) => (angleGap(grid, centre, i, a) < angleGap(grid, centre, best, a) ? i : best), edge[0]!);
  let at = edgeAt(riverAngle);
  const mouth = edgeAt(riverAngle + Math.PI + (rng.next() - 0.5));
  const river = [at];
  while (at !== mouth && river.length < n) {
    const options = grid.neighbors[at]!.filter((j) => !river.includes(j) && grid.steps(j, castle) > s.castle.hillRadius);
    if (options.length === 0) return 'river: stuck';
    const score = (j: number) => grid.steps(j, mouth) + rng.next() * s.river.winding;
    at = options.reduce((best, j) => (score(j) < score(best) ? j : best));
    river.push(at);
  }
  for (const i of river) terrain[i] = 'water';

  // ---- The Passages: open ground round them, so the hydra can come out.
  for (const p of passages) {
    if (terrain[p] === 'rock' || terrain[p] === 'forest') terrain[p] = 'field';
    for (const j of grid.neighbors[p]!) if (terrain[j] === 'rock') terrain[j] = 'field';
    objects[p] = { kind: 'passage' };
  }
  objects[castle] = { kind: 'castle' };

  const taken = [...passages, castle];
  const land = (i: number) => terrain[i] !== 'rock' && terrain[i] !== 'water' && objects[i] === null && grid.steps(i, centre) <= s.radius - 1;
  const place = (candidates: number[], count: number, minApart: number, what: string, make: (i: number, k: number) => MapObject): number[] | string => {
    const picked = pickSpread(rng, grid, candidates, count, minApart, () => 1, taken);
    if (picked.length < count) return `${what}: only ${picked.length} of ${count} fit`;
    picked.forEach((i, k) => {
      objects[i] = make(i, k);
      // Shrines, camps and villages stand in the open.
      if (terrain[i] === 'forest') terrain[i] = 'field';
      taken.push(i);
    });
    return picked;
  };
  const all = Array.from({ length: n }, (_, i) => i);

  // ---- Flame Shrines: spread over the land; nearer the castle, a stronger guard.
  const fs = s.flameShrines;
  const shrineSpots = all.filter((i) => land(i) && nearest(passages, i) >= fs.minFromPassage && grid.steps(i, castle) >= fs.minFromCastle);
  const shrines = place(shrineSpots, fs.count, fs.minApart, 'flame shrines', (i) => {
    const tier = 1 + fs.tierByCastleDistance.filter((d) => grid.steps(i, castle) <= d).length;
    const groups = fs.groupsByTier[tier] ?? fs.groupsByTier[1]!;
    return { kind: 'flameShrine', burning: true, groupId: rng.weightedPick(groups).id, tier };
  });
  if (typeof shrines === 'string') return shrines;

  // ---- Camps of the Order, then the villages, the mill and the watchtowers.
  const campSpots = all.filter((i) => land(i) && nearest(passages, i) >= s.camps.minFromPassage && grid.steps(i, castle) >= s.camps.minFromCastle);
  const camps = place(campSpots, s.camps.count, s.spacing, 'camps', () => ({ kind: 'settlement', settlementId: CAMP }));
  if (typeof camps === 'string') return camps;
  for (const settlement of s.settlements) {
    const by = (i: number) =>
      settlement.by === 'river' ? grid.neighbors[i]!.some((j) => terrain[j] === 'water') : settlement.by === 'hill' ? terrain[i] === 'hill' : terrain[i] === 'field';
    const spots = all.filter((i) => land(i) && nearest(passages, i) >= 3 && by(i));
    const placed = place(spots, settlement.count, s.spacing, settlement.id, () => ({ kind: 'settlement', settlementId: settlement.id }));
    if (typeof placed === 'string') return placed;
  }

  // ---- Finds and event sites, in the open or in the woods.
  const findSpots = all.filter((i) => land(i) && nearest(passages, i) >= s.finds.minFromPassage);
  const used = new Set<string>();
  const finds = place(findSpots, s.finds.count, s.spacing, 'finds', () => {
    const pool = s.finds.pool.filter((f) => !(f.unique && used.has(f.id)));
    const find = rng.weightedPick(pool);
    used.add(find.id);
    return { kind: 'find', findId: find.id, looted: false };
  });
  if (typeof finds === 'string') return finds;
  const events = place(findSpots.filter(land), s.eventSites, s.spacing, 'event sites', () => ({ kind: 'event', eventId: null, done: false }));
  if (typeof events === 'string') return events;

  // ---- Every Passage reaches everything on foot (the Order walks round crags and over hills).
  const walkable = (i: number) => terrainRules[terrain[i]!].moveCost !== null;
  const steps = stepsFrom(grid, [first], walkable);
  for (let i = 0; i < n; i++) if (objects[i] && steps[i] === -1) return `reach: ${objects[i]!.kind} cut off from the Passages`;

  const tiles = new Map<string, Tile>();
  grid.hexes.forEach((h, i) => tiles.set(hexKey(h), { hex: h, biome: s.biome, ring: 0, region: 'surface', terrain: terrain[i]!, object: objects[i] ?? null }));
  return {
    radius: s.radius,
    tiles,
    castle: grid.hexes[castle]!,
    passages: passages.map((i) => grid.hexes[i]!),
    camps: camps.map((i) => grid.hexes[i]!),
    shrines: shrines.map((i) => grid.hexes[i]!),
  };
}

/** How far the direction from the middle to hex `i` is from angle `a`, 0..π. */
function angleGap(grid: HexGrid, centre: number, i: number, a: number): number {
  const d = Math.abs(Math.atan2(grid.y[i]! - grid.y[centre]!, grid.x[i]! - grid.x[centre]!) - a) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
