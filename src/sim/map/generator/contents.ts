// Steps 8–10 of the world: what lies where.
// Thresholds become map objects. Every dead end gets exactly one thing. Landmarks, biome locations and rare places
// go into fitting chambers, and every patch holds one thing from its biome. Then the passages to the surface,
// the encounters (stronger ring by ring), the resources, and last, where echoes come from.

import type { Hex } from '../../hex';
import type { Rng } from '../../rng';
import { DRAUGHT_CRACK } from '../rules';
import type { GroundType, Loot, MapObject } from '../types';
import type { Painted } from './biomes';
import type { CaveDeadEnd, Caves } from './caves';
import { between, pickSpread, shuffled, stepsFrom } from './grid';
import type { HexGrid } from './grid';
import type { DeadEndContent, PlaceSettings, UndergroundGeneratorSettings } from './settings';
import { ZONE_LAIR } from './shape';
import type { WorldShape } from './shape';

/** In a corridor one hex wide, an encounter is this much more likely (a guard in a narrow pass). */
const NARROW_ENCOUNTER_WEIGHT = 1.6;
/** Resources keep this many steps apart. */
const RESOURCE_SPACING = 2;

export interface ContentsPlan {
  /** Rare places this world has (ids). */
  rare: readonly string[];
}

export interface Contents {
  objects: Array<MapObject | null>;
  /** Places and patches the hydra can hear before it sees them. */
  echoSources: Array<{ at: number; placeId: string | null; biome: string }>;
}

/** What lies where, or why it didn't fit (then the world is tried again). */
export function placeContents(
  rng: Rng,
  grid: HexGrid,
  shape: WorldShape,
  caves: Caves,
  painted: Painted,
  s: UndergroundGeneratorSettings,
  plan: ContentsPlan,
): Contents | string {
  const n = grid.size;
  const rings = s.rings.length;
  const { zone } = shape;
  const { open, kept, chamberOf, deadEndOf, narrow } = caves;
  const { biomeOf, terrainOf, chamberBiome, patch } = painted;
  const objects: Array<MapObject | null> = new Array<MapObject | null>(n).fill(null);
  /** Hexes nothing more may go on: objects, and the hexes of the Undertow's current. */
  const reserved = new Uint8Array(n);
  const lairCenter = grid.indexOf({ q: 0, r: 0 })!;
  const put = (i: number, object: MapObject) => {
    objects[i] = object;
    reserved[i] = 1;
  };
  const free = (i: number) => open[i] === 1 && !kept[i] && !reserved[i] && zone[i] !== ZONE_LAIR;
  const wetYear = s.modifiers.includes('wetYear') ? s.modifierRules.wetYear : null;
  const canBeWater = (i: number) => (s.biomes[biomeOf[i]!]?.ground.water ?? 0) > 0;

  put(lairCenter, { kind: 'lair' });

  // ---- Thresholds. Closed ones are rock until opened; then their hex gets the ground of the side they are entered from.
  for (const t of caves.thresholds) {
    const ground = [terrainOf[t.gate]!, terrainOf[t.innerLanding]!].find((g) => g !== 'rock');
    const dig = s.digTurns[t.kind];
    put(t.gate, {
      kind: 'threshold',
      thresholdId: t.kind,
      state: t.alwaysOpen ? 'open' : t.kind === DRAUGHT_CRACK ? 'hidden' : 'closed',
      border: t.border,
      floor: (ground ?? 'mud') as GroundType,
      dug: 0,
      digsNeeded: dig ? between(rng, dig) : 0,
    });
  }

  // ---- Small finds: remains, rich deposits, shrines.
  const usedLines = new Set<string>();
  const remainsAt = (i: number, poolHint: string | null) => {
    // Lines of the hex's own biome, or of any biome, each line equally likely; a line is used once while others are left.
    const pools = [...new Set([poolHint ?? biomeOf[i]!, 'any'])].filter((p) => (s.remainsLines[p] ?? 0) > 0);
    const options = pools.flatMap((pool) => Array.from({ length: s.remainsLines[pool]! }, (_, line) => ({ pool, line, weight: 1 })));
    if (options.length === 0) throw new Error('No remains lines (world.json remains)');
    const fresh = options.filter((o) => !usedLines.has(`${o.pool}:${o.line}`));
    const { pool, line } = rng.weightedPick(fresh.length > 0 ? fresh : options);
    usedLines.add(`${pool}:${line}`);
    put(i, { kind: 'remains', pool, line, loot: remainsLoot(rng, s), looted: false });
  };
  const richAt = (i: number) => {
    const { muckPerDeposit, moisturePerSource, richMultiplier } = s.resources;
    if (rng.chance(0.5)) {
      if (canBeWater(i)) terrainOf[i] = 'water';
      put(i, { kind: 'moisture', amount: moisturePerSource * richMultiplier, rich: true });
    } else {
      put(i, { kind: 'muck', amount: muckPerDeposit * richMultiplier, rich: true });
    }
  };
  let blessings: string[] = [];
  const shrinesIn = new Array<number>(rings + 1).fill(0);
  const shrineAt = (i: number) => {
    if (blessings.length === 0) blessings = shuffled(rng, s.shrineBlessingIds);
    put(i, { kind: 'shrine', blessingId: blessings.pop()!, used: false });
    shrinesIn[zone[i]!] = (shrinesIn[zone[i]!] ?? 0) + 1;
  };
  const place = (i: number, placeId: string, carryPath: Hex[] | null = null) =>
    put(i, { kind: 'place', placeId, visited: false, used: [], readyOnTurn: {}, carryPath });

  // ---- Dead ends: exactly one thing in each. The Lost Survey takes one, if this world has it.
  const guards: number[] = [];
  const placesById = new Map(s.places.map((p) => [p.id, p]));
  const rareIn = (where: PlaceSettings['where']) => plan.rare.filter((id) => placesById.get(id)?.where === where);
  const takenEnds = new Set<number>();
  for (const id of rareIn('deadEnd')) {
    // In a ring with a hidden way outward, leaving that ring enough dead ends for its shrines.
    const options = caves.deadEnds
      .map((d, index) => ({ d, index }))
      .filter(({ d }) => d.crack === null && d.ring < rings)
      .filter(({ d }) => caves.deadEnds.filter((e) => e.ring === d.ring && e.crack === null).length > s.rings[d.ring - 1]!.minShrines);
    if (options.length === 0) return `places: no dead end left for ${id}`;
    const { d, index } = rng.pick(options);
    place(d.content, id);
    takenEnds.add(index);
  }
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const ends = shuffled(
      rng,
      caves.deadEnds.map((d, index) => ({ d, index })).filter(({ d, index }) => d.ring === k && d.crack === null && !takenEnds.has(index)),
    );
    ends.forEach(({ d }, j) => {
      const content: DeadEndContent = j < ring.minShrines ? 'shrine' : rng.weightedPick(ring.deadEndContents).id;
      fillDeadEnd(d, content, k);
    });
  }

  function fillDeadEnd(d: CaveDeadEnd, content: DeadEndContent, k: number): void {
    if (content === 'remains') remainsAt(d.content, null);
    else if (content === 'shrine') shrineAt(d.content);
    else if (content === 'richDeposit') richAt(d.content);
    else {
      // A Guarded Hoard: resources in the pocket, and an encounter where the side passage meets it.
      put(d.content, { kind: 'hoard', loot: s.hoardLoot });
      const guard = d.spur[d.spur.length - 1]!;
      put(guard, encounter(k));
      guards.push(guard);
    }
  }

  function encounter(k: number): MapObject {
    const tier = s.rings[k - 1]!.encounterTier;
    const groups = s.groupsByTier[tier];
    if (!groups || groups.length === 0) throw new Error(`No enemy group has tier ${tier}`);
    return { kind: 'encounter', groupId: rng.weightedPick(groups).id, tier };
  }

  // ---- Places. Landmarks first: one per main biome, in its biggest chamber of the ring where it is main.
  const chamberHasPlace = caves.chambers.map(() => false);
  const chamberIndices = caves.chambers.map((_, index) => index);
  /** The free hex of a chamber nearest its middle (null if the chamber is full). */
  const spotIn = (c: number): number | null => {
    const chamber = caves.chambers[c]!;
    const spots = chamber.hexes.filter((i) => free(i) && !narrow[i]);
    if (spots.length === 0) return null;
    return spots.reduce((best, i) => (grid.between(i, chamber.center) < grid.between(best, chamber.center) ? i : best));
  };
  const landmarkOf = new Map(s.places.filter((p) => p.type === 'landmark' && p.biome).map((p) => [p.biome!, p.id]));
  const placedLandmarks = new Set<string>();
  for (let k = 1; k <= rings; k++) {
    for (const biome of s.rings[k - 1]!.mainBiomes) {
      const id = landmarkOf.get(biome);
      if (!id || placedLandmarks.has(id)) continue;
      const options = chamberIndices
        .filter((c) => caves.chambers[c]!.ring === k && chamberBiome[c] === biome && !patch[c])
        .sort((a, b) => caves.chambers[b]!.hexes.length - caves.chambers[a]!.hexes.length);
      const c = options.find((c) => spotIn(c) !== null);
      if (c === undefined) return `places: no chamber for the landmark ${id}`;
      place(spotIn(c)!, id);
      chamberHasPlace[c] = true;
      placedLandmarks.add(id);
    }
  }

  // Biome locations: patches of their biome first (a patch always holds something of its biome), then its own chambers.
  const locationsOf = new Map<string, string[]>();
  for (const p of s.places) if (p.type === 'location' && p.biome) locationsOf.set(p.biome, [...(locationsOf.get(p.biome) ?? []), p.id]);
  for (const [biome, pool] of locationsOf) {
    const count = Math.min(pool.length, between(rng, s.locationsPerBiome));
    const chosen = shuffled(rng, pool).slice(0, count);
    const targets = [
      ...shuffled(rng, chamberIndices.filter((c) => patch[c] && chamberBiome[c] === biome)),
      ...shuffled(rng, chamberIndices.filter((c) => !patch[c] && chamberBiome[c] === biome)),
    ];
    for (const id of chosen) {
      const carries = placesById.get(id)!.carries;
      for (const c of targets) {
        if (chamberHasPlace[c]) continue;
        const at = spotIn(c);
        if (at === null) continue;
        const path = carries ? currentFrom(at) : null;
        if (carries && !path) continue;
        if (path) for (const i of path) reserved[i] = 1;
        place(at, id, path ? path.map((i) => grid.hexes[i]!) : null);
        chamberHasPlace[c] = true;
        break;
      }
    }
  }

  /**
   * The Undertow's current: from its hex towards home (the lair, or the way in to this ring), as far as it carries.
   * The hexes it passes become water where their biome has water. Null if it can't flow anywhere.
   */
  function currentFrom(start: number): number[] | null {
    const homes = [lairCenter, ...caves.thresholds.map((t) => t.outerLanding)];
    const steps = stepsFrom(grid, homes, (i) => open[i] === 1);
    const length = between(rng, s.undertowLength);
    const path: number[] = [];
    let at = start;
    while (path.length < length && steps[at]! > 0) {
      const options = grid.neighbors[at]!.filter((j) => steps[j] === steps[at]! - 1 && !reserved[j] && !kept[j] && deadEndOf[j] === -1);
      if (options.length === 0) break;
      at = rng.pick(options);
      path.push(at);
    }
    // It must carry the hydra at least two hexes (it lets go on the last one, which nothing else may use).
    if (path.length < 2) return null;
    for (const i of path) if (canBeWater(i)) terrainOf[i] = 'water';
    if (canBeWater(start)) terrainOf[start] = 'water';
    return path;
  }

  // Rare places that live in a chamber (the Hushed Stair, in the last ring).
  for (const id of rareIn('chamber')) {
    const ring = placesById.get(id)!.ring;
    const options = shuffled(rng, chamberIndices.filter((c) => !patch[c] && !chamberHasPlace[c] && (ring === null || caves.chambers[c]!.ring === ring)));
    const c = options.find((c) => spotIn(c) !== null);
    if (c === undefined) return `places: no chamber for ${id}`;
    place(spotIn(c)!, id);
    chamberHasPlace[c] = true;
  }

  // Patches without a location hold a find of their biome; chambers with one way out are dead ends, so they hold something
  // too: first the shrines their ring still lacks.
  for (const c of chamberIndices) {
    const chamber = caves.chambers[c]!;
    const holdsSomething = chamberHasPlace[c] || chamber.hexes.some((i) => objects[i] !== null);
    if (holdsSomething || (!patch[c] && chamber.exits > 1)) continue;
    const at = spotIn(c);
    if (at === null) return `finds: chamber ${c} full`;
    const ring = s.rings[chamber.ring - 1]!;
    const find = patch[c]
      ? (s.patchFinds[chamberBiome[c]!] ?? 'remains')
      : shrinesIn[chamber.ring]! < ring.minShrines
        ? 'shrine'
        : rng.weightedPick(ring.deadEndContents.filter((w) => w.id !== 'guardedHoard')).id;
    if (find === 'shrine') shrineAt(at);
    else if (find === 'richDeposit') richAt(at);
    else remainsAt(at, patch[c] ? chamberBiome[c]! : null);
  }
  // A ring whose dead ends are all taken (by its Draught Crack and patches) still gets its shrines: in a chamber of its own,
  // as far from the lair as there is room.
  for (let k = 1; k <= rings; k++) {
    const options = chamberIndices
      .filter((c) => caves.chambers[c]!.ring === k && !patch[c] && !chamberHasPlace[c])
      .map((c) => spotIn(c))
      .filter((i): i is number => i !== null)
      .sort((a, b) => grid.steps(b, lairCenter) - grid.steps(a, lairCenter));
    while (shrinesIn[k]! < s.rings[k - 1]!.minShrines && options.length > 0) shrineAt(options.shift()!);
    if (shrinesIn[k]! < s.rings[k - 1]!.minShrines) return `shrines: only ${shrinesIn[k]} in ring ${k}`;
  }

  // ---- Passages to the surface: one in the first ring, one in a ring further out; far from the lair within the ring.
  for (const k of [s.passages.firstRing, rng.pick(s.passages.secondRings)]) {
    const options: number[] = [];
    for (let i = 0; i < n; i++) if (zone[i] === k && chamberOf[i]! >= 0 && free(i) && !narrow[i]) options.push(i);
    const picked = pickSpread(rng, grid, options, 1, 1, (i) => grid.steps(i, lairCenter) ** 2);
    if (picked.length === 0) return `passages: no room in ring ${k}`;
    put(picked[0]!, { kind: 'passage' });
  }

  // ---- Encounters: each ring its own strength; denser in some biomes and in narrow passes. Guards of hoards count.
  const encounterHexes = [...guards];
  // Old Workings first: the Order still walks its old shaft, on top of each ring's own encounters.
  if (caves.shaft.length > 0) {
    const options = caves.shaft.filter((i) => free(i) && zone[i]! >= 1 && zone[i]! <= rings);
    const picked = pickSpread(rng, grid, options, s.modifierRules.oldWorkings.extraEncounters, s.encounterSpacing, () => 1, encounterHexes);
    if (s.modifierRules.oldWorkings.extraEncounters > 0 && picked.length === 0) return 'old workings: no room for the Order';
    for (const i of picked) {
      put(i, encounter(zone[i]!));
      encounterHexes.push(i);
    }
  }
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const wanted = ring.encounters - guards.filter((g) => zone[g] === k).length;
    const options: number[] = [];
    for (let i = 0; i < n; i++) {
      if (zone[i] === k && free(i) && deadEndOf[i] === -1 && grid.steps(i, lairCenter) >= s.encounterMinDistanceFromLair) options.push(i);
    }
    const weight = (i: number) => (s.biomes[biomeOf[i]!]?.encounterDensity ?? 1) * (narrow[i] ? NARROW_ENCOUNTER_WEIGHT : 1);
    const picked = pickSpread(rng, grid, options, wanted, s.encounterSpacing, weight, encounterHexes);
    if (picked.length < wanted) return `encounters: only ${picked.length} of ${wanted} fit in ring ${k}`;
    for (const i of picked) {
      put(i, encounter(k));
      encounterHexes.push(i);
    }
  }

  // ---- Resources, ring by ring. Moisture likes water; a Wet Year brings more of it.
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const options = () => {
      const list: number[] = [];
      for (let i = 0; i < n; i++) if (zone[i] === k && free(i) && deadEndOf[i] === -1) list.push(i);
      return list;
    };
    const nearWater = (i: number) => terrainOf[i] === 'water' || grid.neighbors[i]!.some((j) => terrainOf[j] === 'water');
    const moistureCount = Math.round(ring.moistureSources * (wetYear ? wetYear.moistureMultiplier : 1));
    for (const i of pickSpread(rng, grid, options(), moistureCount, RESOURCE_SPACING, (i) => (nearWater(i) ? 4 : 1))) {
      put(i, { kind: 'moisture', amount: s.resources.moisturePerSource, rich: false });
    }
    for (const i of pickSpread(rng, grid, options(), ring.muckDeposits, RESOURCE_SPACING)) {
      put(i, { kind: 'muck', amount: s.resources.muckPerDeposit, rich: false });
    }
  }

  // ---- Echoes: patches and places other than landmarks (landmarks are seen from afar instead).
  const echoSources: Contents['echoSources'] = [];
  const landmarkIds = new Set(landmarkOf.values());
  for (let i = 0; i < n; i++) {
    const object = objects[i];
    if (object?.kind !== 'place' || landmarkIds.has(object.placeId)) continue;
    const c = chamberOf[i]!;
    echoSources.push({ at: i, placeId: object.placeId, biome: c >= 0 ? chamberBiome[c]! : biomeOf[i]! });
  }
  for (const c of chamberIndices) {
    if (!patch[c] || caves.chambers[c]!.hexes.some((i) => objects[i]?.kind === 'place')) continue;
    echoSources.push({ at: caves.chambers[c]!.center, placeId: null, biome: chamberBiome[c]! });
  }
  return { objects, echoSources };
}

/** One kind of resource, picked among those remains can give, in its range. */
function remainsLoot(rng: Rng, s: UndergroundGeneratorSettings): Loot {
  const kinds = (['muck', 'moisture', 'bones'] as const).filter((k) => s.remainsLoot[k][1] > 0);
  if (kinds.length === 0) return {};
  const kind = rng.pick(kinds);
  return { [kind]: Math.max(1, between(rng, s.remainsLoot[kind])) };
}
