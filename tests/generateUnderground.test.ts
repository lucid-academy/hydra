// The world generator's rules (GAME_DESIGN.md §9), checked on a thousand seeds: every ring reachable without keys,
// the numbers of thresholds and objects, no empty dead end, ring widths, how often rare places come up,
// no objects in each other's way, and the same world from the same seed.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { hexDistance, hexKey, hexNeighbors, hexesInRange } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { CINDER_SCAR, DRAUGHT_CRACK, OLD_WORKINGS, generateUnderground, generateUndergroundWithReport, ringConnectionProblems } from '../src/sim/map';
import type { HexMap, MapObject, Tile, UndergroundGeneratorSettings } from '../src/sim/map';

const data = loadGameData();
const rules = runRulesFrom(data);
const settings = rules.generator;
const SEEDS = 1000;
/** Rare places come up this close to their chance over SEEDS worlds (about four standard deviations). */
const RARE_TOLERANCE = 0.045;

type ThresholdObject = Extract<MapObject, { kind: 'threshold' }>;
type PlaceObject = Extract<MapObject, { kind: 'place' }>;

function describeMap(map: HexMap): string {
  const tiles = [...map.tiles.values()].map((t) => `${hexKey(t.hex)}:${t.biome}:${t.region}${t.ring}:${t.terrain}:${JSON.stringify(t.object)}`).join('|');
  return `${tiles}#${JSON.stringify(map.layout)}`;
}

function withModifiers(modifiers: string[]): UndergroundGeneratorSettings {
  return { ...settings, modifiers };
}

/** Flat position of a hex (neighbours 1 apart), as the generator measures the rings. */
function flat(h: Hex): { x: number; y: number } {
  return { x: h.q + h.r / 2, y: (h.r * Math.sqrt(3)) / 2 };
}

function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(d, Math.PI * 2 - d);
}

/** Narrowest width of ring k: from its inner side, the fewest steps to the rock outside it. */
function narrowestWidth(map: HexMap, k: number): number {
  const rings = map.layout.rings;
  const outside = (t: Tile) => t.region === 'outside' || (t.region === 'band' && t.ring === k) || (t.region === 'ring' && t.ring > k);
  const inner = (t: Tile) => (k === 1 ? t.region === 'lair' : t.region === 'band' && t.ring === k - 1);
  const steps = new Map<string, number>();
  const queue: Hex[] = [];
  for (const t of map.tiles.values()) {
    if (!outside(t)) continue;
    steps.set(hexKey(t.hex), 0);
    queue.push(t.hex);
  }
  for (let head = 0; head < queue.length; head++) {
    const from = queue[head]!;
    for (const n of hexNeighbors(from)) {
      const key = hexKey(n);
      if (!map.tiles.has(key) || steps.has(key)) continue;
      steps.set(key, steps.get(hexKey(from))! + 1);
      queue.push(n);
    }
  }
  let narrowest = Infinity;
  for (const t of map.tiles.values()) {
    if (t.region !== 'ring' || t.ring !== k) continue;
    if (!hexNeighbors(t.hex).some((n) => map.tiles.has(hexKey(n)) && inner(map.tiles.get(hexKey(n))!))) continue;
    narrowest = Math.min(narrowest, steps.get(hexKey(t.hex)) ?? Infinity);
  }
  return k <= rings ? narrowest : 0;
}

/** Everything wrong with one world; empty when it keeps every rule. */
function problemsOf(map: HexMap, s: UndergroundGeneratorSettings): string[] {
  const problems: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const tiles = [...map.tiles.values()];
  const rings = s.rings.length;
  const objects = tiles.filter((t) => t.object !== null);
  const of = <K extends MapObject['kind']>(kind: K) => objects.filter((t) => t.object!.kind === kind) as Array<Tile & { object: Extract<MapObject, { kind: K }> }>;
  const passable = (t: Tile) => rules.terrain[t.terrain].moveCost !== null;

  // The shape: every hex, the lair in the middle of its swamp, known biomes, rings wide enough.
  check(map.tiles.size === hexesInRange({ q: 0, r: 0 }, s.radius).length, 'wrong number of hexes');
  check(map.tiles.get('0,0')?.object?.kind === 'lair' && map.tiles.get('0,0')?.region === 'lair', 'the lair is not in the middle');
  check(tiles.every((t) => t.biome in s.biomes), 'a hex of an unknown biome');
  check(tiles.filter((t) => t.region === 'lair').every((t) => t.biome === s.lairBiome.id), 'the lair swamp is not all swamp');
  for (let k = 1; k <= rings; k++) check(narrowestWidth(map, k) >= s.minRingWidth, `ring ${k} narrower than ${s.minRingWidth}`);
  check(tiles.filter((t) => hexDistance(t.hex, map.lair) >= s.radius).every((t) => t.region === 'outside' && t.terrain === 'rock'), 'the map edge is not rock');

  // Reachable: every ring without keys, nothing beyond ring 1 with every threshold shut, every open hex with all open.
  for (const p of ringConnectionProblems(map, rules.terrain)) problems.push(`connections: ${p}`);

  // Biomes: each ring's main biomes are there, and its patches are in their numbers.
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const chambers = map.layout.chambers.filter((c) => c.ring === k);
    for (const biome of ring.mainBiomes) check(chambers.some((c) => c.biome === biome && !c.patch), `ring ${k} has no chamber of ${biome}`);
    const bloom = s.modifiers.includes('myceliumBloom') && !ring.mainBiomes.includes(s.modifierRules.myceliumBloom.fungalBiome);
    const patches = chambers.filter((c) => c.patch).length;
    const [least, most] = ring.patches;
    const extra = bloom ? s.modifierRules.myceliumBloom.extraFungalPatches : ([0, 0] as const);
    check(patches >= least + extra[0] && patches <= most + extra[1], `ring ${k} has ${patches} patches`);
    if (bloom) check(chambers.some((c) => c.patch && c.biome === s.modifierRules.myceliumBloom.fungalBiome), `ring ${k} has no bloom patch`);
  }

  // Thresholds: on band hexes, 2–4 per border well apart, one Draught Crack each; rare ones only where they belong.
  const thresholds = of('threshold');
  check(thresholds.every((t) => t.region === 'band'), 'a threshold off the rock bands');
  const angleOf = (h: Hex) => Math.atan2(flat(h).y - map.layout.ringCenter.y, flat(h).x - map.layout.ringCenter.x);
  for (let border = 1; border < rings; border++) {
    const rule = s.rings[border - 1]!.thresholds!;
    const here = thresholds.filter((t) => t.object.border === border);
    const regular = here.filter((t) => t.object.thresholdId !== CINDER_SCAR && t.object.thresholdId !== OLD_WORKINGS);
    check(regular.length >= rule.count[0] && regular.length <= rule.count[1], `border ${border} has ${regular.length} thresholds`);
    check(regular.filter((t) => t.object.thresholdId === DRAUGHT_CRACK).length === 1, `border ${border} has no single Draught Crack`);
    for (const a of regular) {
      for (const b of regular) {
        if (a !== b) check(angleBetween(angleOf(a.hex), angleOf(b.hex)) >= s.thresholdSpacing * Math.PI * 2 - 0.2, `border ${border} has thresholds too close`);
      }
    }
    for (const t of regular) {
      const kind = rules.thresholds[t.object.thresholdId]!;
      const expected = kind.hidden ? 'hidden' : 'closed';
      check(t.object.state === expected, `${t.object.thresholdId} is ${t.object.state}`);
      check(t.terrain === 'rock' && t.object.floor !== undefined, `${t.object.thresholdId} is not rock until opened`);
      if (kind.dug) {
        const [least, most] = s.digTurns[t.object.thresholdId]!;
        check(t.object.digsNeeded >= least && t.object.digsNeeded <= most, `${t.object.thresholdId} needs ${t.object.digsNeeded} digs`);
      }
    }
  }
  const scars = thresholds.filter((t) => t.object.thresholdId === CINDER_SCAR);
  check(scars.length === (map.layout.rarePlaces.includes(CINDER_SCAR) ? 1 : 0), 'Cinder Scars do not match the rare places');
  // Cinderkin never in ring 1 (GAME_DESIGN.md §9.3): the first way out of ring 1 is always found by the player.
  check(scars.every((t) => t.object.border > 1 && t.object.state === 'open'), 'a Cinder Scar on the first border, or shut');
  const shafts = thresholds.filter((t) => t.object.thresholdId === OLD_WORKINGS);
  check(shafts.length === (s.modifiers.includes('oldWorkings') ? 1 : 0), 'Old Workings do not match the modifier');

  // Dead ends and one-way chambers are never empty.
  for (const d of map.layout.deadEnds) check(map.tiles.get(hexKey(d.content))?.object != null, `an empty dead end at ${hexKey(d.content)}`);
  for (const c of map.layout.chambers) {
    if (c.exits > 1 && !c.patch) continue;
    check(
      c.hexes.some((h) => map.tiles.get(hexKey(h))?.object != null),
      `an empty ${c.patch ? 'patch' : 'one-way chamber'} in ring ${c.ring}`,
    );
  }

  // Objects: on open ground of the rings (thresholds aside), never in the lair's swamp, never on the Undertow's current.
  check(objects.filter((t) => t.object!.kind !== 'threshold' && t.object!.kind !== 'lair').every((t) => t.region === 'ring' && passable(t)), 'an object on rock or outside the rings');
  for (const t of of('place')) {
    for (const h of t.object.carryPath ?? []) check(map.tiles.get(hexKey(h))?.object == null && passable(map.tiles.get(hexKey(h))!), 'something on the Undertow');
  }

  // Shrines: at least the minimum per ring, every blessing known.
  for (let k = 1; k <= rings; k++) {
    const shrines = of('shrine').filter((t) => t.ring === k);
    check(shrines.length >= s.rings[k - 1]!.minShrines, `ring ${k} has ${shrines.length} shrines`);
  }
  check(of('shrine').every((t) => s.shrineBlessingIds.includes(t.object.blessingId)), 'a shrine with an unknown blessing');

  // Passages: one in ring 1, one in ring 2 or 3.
  const passages = of('passage').map((t) => t.ring).sort();
  check(passages.length === 2 && passages[0] === s.passages.firstRing && s.passages.secondRings.includes(passages[1]!), `passages in rings ${passages.join(', ')}`);

  // Encounters: each ring's number and strength (guards of hoards count), spread out, not at the lair's door.
  const hoardEnds = new Set(map.layout.deadEnds.filter((d) => map.tiles.get(hexKey(d.content))?.object?.kind === 'hoard').map((d) => hexKey(d.spur[d.spur.length - 1]!)));
  const encounters = of('encounter');
  const oldWorkings = s.modifiers.includes('oldWorkings');
  let extra = 0;
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const here = encounters.filter((t) => t.ring === k);
    const guards = here.filter((t) => hoardEnds.has(hexKey(t.hex))).length;
    const expected = Math.max(ring.encounters, guards);
    check(here.length >= expected, `ring ${k} has ${here.length} encounters, expected ${expected}`);
    extra += here.length - expected;
    check(here.every((t) => t.object.tier === ring.encounterTier), `ring ${k} has an encounter of the wrong tier`);
    check(here.every((t) => (s.groupsByTier[t.object.tier] ?? []).some((g) => g.id === t.object.groupId)), `ring ${k} has an unknown enemy group`);
  }
  for (const a of encounters) {
    const guard = hoardEnds.has(hexKey(a.hex));
    if (!guard) check(hexDistance(a.hex, map.lair) >= s.encounterMinDistanceFromLair, 'an encounter at the door of the lair');
    for (const b of encounters) {
      if (a === b || (guard && hoardEnds.has(hexKey(b.hex)))) continue;
      check(hexDistance(a.hex, b.hex) >= s.encounterSpacing, `encounters too close at ${hexKey(a.hex)}`);
    }
  }
  // The extra encounters walk the Old Workings shaft.
  check(extra <= (oldWorkings ? s.modifierRules.oldWorkings.extraEncounters : 0), `${extra} encounters too many`);
  if (oldWorkings) check(extra >= 1, 'no Order on the Old Workings');

  // Places: one landmark per main biome, in its own biome; locations of the right biome; rare places as rolled.
  const places = of('place');
  const placeData = (t: Tile & { object: PlaceObject }) => data.world.places[t.object.placeId]!;
  for (let k = 1; k <= rings; k++) {
    for (const biome of s.rings[k - 1]!.mainBiomes) {
      const landmarks = places.filter((t) => placeData(t).type === 'landmark' && placeData(t).biome === biome);
      check(landmarks.length === 1, `${landmarks.length} landmarks of ${biome}`);
      check(landmarks.every((t) => t.biome === biome && t.ring === k), `the landmark of ${biome} is out of place`);
    }
  }
  check(places.filter((t) => placeData(t).type === 'location').every((t) => t.biome === placeData(t).biome), 'a location outside its biome');
  for (const id of map.layout.rarePlaces) {
    if (id === CINDER_SCAR) continue;
    const here = places.filter((t) => t.object.placeId === id);
    check(here.length === 1, `rare place ${id} rolled but not placed`);
    const ring = data.world.places[id]?.ring;
    if (ring !== undefined) check(here.every((t) => t.ring === ring), `${id} out of ring ${ring}`);
  }
  check(places.filter((t) => placeData(t).type === 'rare').every((t) => map.layout.rarePlaces.includes(t.object.placeId)), 'a rare place nobody rolled');
  check(map.layout.rarePlaces.length <= s.maxRarePlaces, 'too many rare places');
  check(new Set(places.map((t) => t.object.placeId)).size === places.length, 'the same place twice');

  // Echoes come from places and patches the hydra can't see yet; the undertow's current exists.
  check(map.layout.echoSources.every((e) => map.tiles.has(hexKey(e.at))), 'an echo from nowhere');
  check(places.filter((t) => t.object.placeId === 'undertow').every((t) => (t.object.carryPath?.length ?? 0) >= 2), 'an Undertow without a current');
  return problems;
}

describe('generateUnderground', () => {
  it('is deterministic: the same seed and modifiers give the same world', () => {
    for (const seed of [1, 42, 123456]) {
      expect(describeMap(generateUnderground(seed, settings, rules.terrain))).toBe(describeMap(generateUnderground(seed, settings, rules.terrain)));
      const wet = withModifiers(['wetYear', 'oldWorkings']);
      expect(describeMap(generateUnderground(seed, wet, rules.terrain))).toBe(describeMap(generateUnderground(seed, wet, rules.terrain)));
    }
  });

  it('different seeds give different worlds', () => {
    expect(describeMap(generateUnderground(1, settings, rules.terrain))).not.toBe(describeMap(generateUnderground(2, settings, rules.terrain)));
  });

  it(`keeps the rules of GAME_DESIGN.md §9 on ${SEEDS} seeds`, { timeout: 180_000 }, () => {
    const rareCounts = new Map<string, number>();
    const failures: string[] = [];
    let attempts = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const { map, rejected } = generateUndergroundWithReport(seed, settings, rules.terrain);
      attempts += rejected.length + 1;
      for (const id of map.layout.rarePlaces) rareCounts.set(id, (rareCounts.get(id) ?? 0) + 1);
      const problems = problemsOf(map, settings);
      if (problems.length > 0) failures.push(`seed ${seed}: ${problems.join('; ')}`);
    }
    expect(failures.slice(0, 10)).toEqual([]);
    // Rare places come up about as often as their chance says (the generator throws few worlds away).
    for (const place of settings.places.filter((p) => p.type === 'rare')) {
      const share = (rareCounts.get(place.id) ?? 0) / SEEDS;
      expect(Math.abs(share - place.chance), `${place.id}: ${share}`).toBeLessThan(RARE_TOLERANCE);
    }
    expect(attempts / SEEDS).toBeLessThan(3);
  });

  it('keeps the rules with every run modifier, alone and together', { timeout: 120_000 }, () => {
    for (const modifiers of [['wetYear'], ['myceliumBloom'], ['oldWorkings'], ['wetYear', 'myceliumBloom', 'oldWorkings']]) {
      const s = withModifiers(modifiers);
      const failures: string[] = [];
      for (let seed = 0; seed < 150; seed++) {
        const map = generateUnderground(seed, s, rules.terrain);
        expect(map.layout.modifiers).toEqual(modifiers);
        const problems = problemsOf(map, s);
        if (problems.length > 0) failures.push(`${modifiers.join('+')} seed ${seed}: ${problems.join('; ')}`);
      }
      expect(failures.slice(0, 10)).toEqual([]);
    }
  });

  it('a Wet Year has more water and more Moisture', () => {
    let dry = { water: 0, moisture: 0 };
    let wet = { water: 0, moisture: 0 };
    const count = (map: HexMap) => {
      const tiles = [...map.tiles.values()];
      return { water: tiles.filter((t) => t.terrain === 'water').length, moisture: tiles.filter((t) => t.object?.kind === 'moisture').length };
    };
    for (let seed = 0; seed < 40; seed++) {
      const a = count(generateUnderground(seed, settings, rules.terrain));
      const b = count(generateUnderground(seed, withModifiers(['wetYear']), rules.terrain));
      dry = { water: dry.water + a.water, moisture: dry.moisture + a.moisture };
      wet = { water: wet.water + b.water, moisture: wet.moisture + b.moisture };
    }
    expect(wet.water).toBeGreaterThan(dry.water * 1.1);
    expect(wet.moisture).toBeGreaterThan(dry.moisture * 1.2);
  });
});
