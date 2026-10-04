// Steps 3–5 and 7 of the world: thresholds through the rock bands, cave chambers, winding corridors
// and dead ends. Everything not carved here stays rock.
//
// Order matters: thresholds come first (their landings become places the caves must reach), then chambers,
// then corridors joining them into one network per ring, then the Old Workings shaft (if that modifier is on),
// then dead ends, which only grow into rock that no corridor touches, so they really end.

import type { Rng } from '../../rng';
import { CINDER_SCAR, DRAUGHT_CRACK, OLD_WORKINGS } from '../rules';
import { between, cheapestPath, pickSpread, shuffled, smoothNoise } from './grid';
import type { HexGrid } from './grid';
import type { UndergroundGeneratorSettings } from './settings';
import { ZONE_BAND, ZONE_LAIR } from './shape';
import type { WorldShape } from './shape';

export interface CaveThreshold {
  /** k: the border between ring k and ring k + 1. */
  border: number;
  kind: string;
  angle: number;
  /** The hex in the band that opens or stays shut. */
  gate: number;
  /** The open hex on the inner side, next to the gate. */
  innerLanding: number;
  /** Band hexes past the gate (carved open) and the first hex of the next ring. */
  tunnel: number[];
  outerLanding: number;
  /** Open from the start (Cinder Scar, Old Workings). */
  alwaysOpen: boolean;
}

export interface CaveChamber {
  ring: number;
  center: number;
  hexes: number[];
  /** Corridors planned out of it. */
  links: number;
  /** Ways out as carved (separate openings in its wall). A chamber with one way out is a dead end too. */
  exits: number;
}

export interface CaveDeadEnd {
  ring: number;
  /** From the corridor or chamber it leaves, to the pocket. */
  spur: number[];
  pocket: number[];
  /** Where its one thing lies. */
  content: number;
  /** For a Draught Crack's dead end: the threshold (index in Caves.thresholds). */
  crack: number | null;
}

export interface Caves {
  open: Uint8Array;
  /** Per hex: index of the chamber it belongs to, or -1. */
  chamberOf: Int32Array;
  /** Per hex: 1 for a corridor one hex wide (a natural place for a guard). */
  narrow: Uint8Array;
  /** Per hex: index of the dead end it belongs to, or -1. */
  deadEndOf: Int32Array;
  /** Per hex: 1 where nothing may be placed (threshold tunnels and landings). */
  kept: Uint8Array;
  chambers: CaveChamber[];
  thresholds: CaveThreshold[];
  deadEnds: CaveDeadEnd[];
  /** Hexes of the Old Workings shaft, if that modifier is on. */
  shaft: number[];
}

export interface CavePlan {
  /** Add a Cinder Scar on the last border. */
  cinderScar: boolean;
  /** Cut the Old Workings shaft through the last two rings. */
  oldWorkings: boolean;
}

/** Candidate angles for thresholds around a border. */
const THRESHOLD_ANGLES = 72;
/** A Draught Crack's landing keeps corridors this many steps away, so it can only be reached through its own dead end. */
const CRACK_KEEP_OUT = 2;

/** The caves, or why they couldn't be made (then the world is tried again). */
export function carveCaves(rng: Rng, grid: HexGrid, shape: WorldShape, s: UndergroundGeneratorSettings, plan: CavePlan): Caves | string {
  const n = grid.size;
  const rings = s.rings.length;
  const { zone } = shape;
  const caves: Caves = {
    open: new Uint8Array(n),
    chamberOf: new Int32Array(n).fill(-1),
    narrow: new Uint8Array(n),
    deadEndOf: new Int32Array(n).fill(-1),
    kept: new Uint8Array(n),
    chambers: [],
    thresholds: [],
    deadEnds: [],
    shaft: [],
  };
  const { open } = caves;
  /** Hexes corridors and chambers may not use (around tunnels; next to the lair except its exits). */
  const blocked = new Uint8Array(n);
  /** Hexes only one Draught Crack's dead end may use: the threshold's index, or -1. */
  const crackArea = new Int32Array(n).fill(-1);
  const lairWall = new Uint8Array(n);
  const lairCenter = grid.indexOf({ q: 0, r: 0 })!;

  for (let i = 0; i < n; i++) if (zone[i] === ZONE_LAIR) open[i] = 1;
  for (let i = 0; i < n; i++) if (zone[i] === 1 && grid.neighbors[i]!.some((j) => zone[j] === ZONE_LAIR)) lairWall[i] = 1;

  // ---- Thresholds: 2–4 per border, where the band is thinnest, well apart; the first is always a Draught Crack.
  const spacing = s.thresholdSpacing * Math.PI * 2;
  for (let k = 1; k < rings; k++) {
    const rule = s.rings[k - 1]!.thresholds;
    if (!rule) continue;
    const wanted = between(rng, rule.count);
    const candidates = Array.from({ length: THRESHOLD_ANGLES }, (_, j) => (j / THRESHOLD_ANGLES) * Math.PI * 2 + rng.next() * 0.05)
      .map((angle) => ({ angle, score: shape.thickness(k, angle) + rng.next() * 0.6 }))
      .sort((a, b) => a.score - b.score);
    const picked: CaveThreshold[] = [];
    const tryAdd = (angle: number, kind: string, minApart: number, alwaysOpen: boolean): boolean => {
      if (caves.thresholds.some((t) => t.border === k && angleBetween(t.angle, angle) < minApart)) return false;
      const t = buildTunnel(grid, shape, k, angle, kind, alwaysOpen);
      if (!t || !tunnelFits(t)) return false;
      caves.thresholds.push(t);
      picked.push(t);
      claimTunnel(t, caves.thresholds.length - 1);
      return true;
    };
    for (const c of candidates) {
      if (picked.length >= wanted) break;
      const kind = picked.length === 0 ? DRAUGHT_CRACK : rng.weightedPick(rule.kinds).id;
      tryAdd(c.angle, kind, spacing, false);
    }
    if (picked.length < rule.count[0] || !picked.some((t) => t.kind === DRAUGHT_CRACK)) return `thresholds: only ${picked.length} fit on border ${k}`;
    // A Cinder Scar: an old tunnel melted by the Cinderkin, only on the last border, and open from the start.
    if (plan.cinderScar && k === rings - 1) {
      for (const c of shuffled(rng, candidates)) if (tryAdd(c.angle, CINDER_SCAR, spacing / 2, true)) break;
    }
  }

  function tunnelFits(t: CaveThreshold): boolean {
    // Tunnels must not touch each other, and the inner side may touch the far side only through the gate.
    const used = [t.gate, t.innerLanding, ...t.tunnel];
    if (t.tunnel.some((i) => grid.neighbors[i]!.includes(t.innerLanding))) return false;
    return used.every((i) => !open[i] && !blocked[i] && crackArea[i] === -1 && grid.neighbors[i]!.every((j) => !caves.kept[j] && crackArea[j] === -1));
  }

  function claimTunnel(t: CaveThreshold, index: number): void {
    for (const i of t.tunnel) open[i] = 1;
    if (t.alwaysOpen) open[t.gate] = 1;
    for (const i of [t.gate, t.innerLanding, ...t.tunnel]) caves.kept[i] = 1;
    // Nothing on the inner side may touch the tunnel past the gate, or the rings would meet around the gate.
    for (const i of t.tunnel) for (const j of grid.neighbors[i]!) if (zone[j] === t.border) blocked[j] = 1;
    if (t.kind === DRAUGHT_CRACK) {
      // The crack is found only from its own dead end: keep corridors away from its landing and its sides.
      for (const j of grid.neighbors[t.gate]!) if (zone[j] === t.border) crackArea[j] = index;
      for (let i = 0; i < n; i++) if (zone[i] === t.border && grid.steps(i, t.innerLanding) <= CRACK_KEEP_OUT) crackArea[i] = index;
    } else {
      open[t.innerLanding] = 1;
    }
  }

  // ---- Chambers.
  const noise = smoothNoise(rng, grid, 2);
  const free = (i: number, ring: number) => zone[i] === ring && !open[i] && !blocked[i] && !lairWall[i] && crackArea[i] === -1;
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const candidates: number[] = [];
    for (let i = 0; i < n; i++) if (free(i, k) && grid.neighbors[i]!.every((j) => zone[j] === k)) candidates.push(i);
    const centers = pickSpread(rng, grid, candidates, between(rng, ring.chambers), s.chamberSpacing);
    if (centers.length < ring.chambers[0]) return `chambers: only ${centers.length} fit in ring ${k}`;
    for (const center of centers) {
      const hexes = growBlob(grid, center, between(rng, ring.chamberSize), (i) => free(i, k), noise);
      const index = caves.chambers.length;
      for (const i of hexes) {
        open[i] = 1;
        caves.chamberOf[i] = index;
      }
      caves.chambers.push({ ring: k, center, hexes, links: 0, exits: 0 });
    }
  }

  // ---- Corridors: in each ring, a tree of winding corridors joins the chambers, the lair and the thresholds' landings,
  // plus a few extra links that make loops.
  for (let k = 1; k <= rings; k++) {
    const nodes: Array<{ anchor: number; chamber: number | null; lair: boolean }> = [];
    if (k === 1) nodes.push({ anchor: lairCenter, chamber: null, lair: true });
    caves.chambers.forEach((c, index) => {
      if (c.ring === k) nodes.push({ anchor: c.center, chamber: index, lair: false });
    });
    for (const t of caves.thresholds) {
      if (t.border === k - 1) nodes.push({ anchor: t.outerLanding, chamber: null, lair: false });
      if (t.border === k && t.kind !== DRAUGHT_CRACK) nodes.push({ anchor: t.innerLanding, chamber: null, lair: false });
    }
    const distance = (a: number, b: number) => {
      const p = nodes[a]!.anchor;
      const q = nodes[b]!.anchor;
      if (nodes[a]!.lair || nodes[b]!.lair) return grid.between(p, q);
      const meanRho = (shape.rho[p]! + shape.rho[q]!) / 2;
      return Math.hypot(meanRho * angleBetween(shape.angle[p]!, shape.angle[q]!), shape.rho[p]! - shape.rho[q]!);
    };
    const edges: Array<{ a: number; b: number; length: number }> = [];
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) edges.push({ a, b, length: distance(a, b) });
    edges.sort((x, y) => x.length - y.length);

    const links: Array<{ a: number; b: number; wide: boolean }> = [];
    const group = nodes.map((_, i) => i);
    const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i]!)));
    const join = (a: number, b: number) => (group[root(a)] = root(b));
    if (k === 1) {
      // The lair opens into ring 1 through a few wide exits, pointing different ways.
      const exits = between(rng, s.lairExits);
      const chosen: number[] = [];
      const lairAngle = (i: number) => Math.atan2(grid.y[nodes[i]!.anchor]!, grid.x[nodes[i]!.anchor]!);
      const byDistance = nodes.map((_, i) => i).filter((i) => nodes[i]!.chamber !== null).sort((a, b) => distance(0, a) - distance(0, b));
      for (const i of byDistance) {
        if (chosen.length >= exits) break;
        if (chosen.every((c) => angleBetween(lairAngle(c), lairAngle(i)) > Math.PI / 2)) chosen.push(i);
      }
      for (const i of chosen) {
        links.push({ a: 0, b: i, wide: true });
        join(0, i);
      }
    }
    const extra: typeof edges = [];
    for (const e of edges) {
      if (nodes[e.a]!.lair || nodes[e.b]!.lair) continue;
      if (root(e.a) === root(e.b)) extra.push(e);
      else {
        links.push({ a: e.a, b: e.b, wide: false });
        join(e.a, e.b);
      }
    }
    if (nodes.some((_, i) => root(i) !== root(0))) return `corridors: ring ${k} not joined up`;
    const extraCount = Math.round(s.corridors.extraLinkShare * (nodes.length - 1));
    const longest = Math.max(...links.map((l) => distance(l.a, l.b)));
    const loops = extra
      .filter((e) => e.length <= longest * 1.2)
      .map((e) => ({ e, key: e.length * (1 + rng.next()) }))
      .sort((x, y) => x.key - y.key)
      .slice(0, extraCount);
    for (const { e } of loops) links.push({ a: e.a, b: e.b, wide: false });

    for (const link of links) {
      const from = nodes[link.a]!;
      const to = nodes[link.b]!;
      const lairLink = from.lair || to.lair;
      const passable = (i: number) => {
        if (lairLink && zone[i] === ZONE_LAIR) return true;
        if (zone[i] !== k) return open[i] === 1 && (i === to.anchor || i === from.anchor);
        if (blocked[i] || crackArea[i] !== -1) return false;
        return !lairWall[i] || lairLink;
      };
      const path = cheapestPath(grid, from.anchor, to.anchor, (i) => (passable(i) ? (open[i] ? 0.5 : 1 + s.corridors.winding * noise[i]!) : null));
      if (!path) return `corridors: no way through ring ${k}`;
      const width = lairLink ? 2 : rng.chance(s.corridors.narrowShare) ? 1 : 2;
      carveCorridor(path, width, lairLink, passable);
      if (from.chamber !== null) caves.chambers[from.chamber]!.links++;
      if (to.chamber !== null) caves.chambers[to.chamber]!.links++;
    }
  }

  function carveCorridor(path: number[], width: number, mouth: boolean, passable: (i: number) => boolean): void {
    path.forEach((i, step) => {
      open[i] = 1;
      if (width < 2) return;
      const next = path[step + 1] ?? path[step - 1];
      if (next === undefined) return;
      const d = directionTo(grid, i, next);
      const sides = [grid.neighborIn(i, d + 1)];
      // The lair's exits open wide, three hexes across, where they leave the swamp.
      if (mouth && zone[i] === 1 && lairWall[i]) sides.push(grid.neighborIn(i, d - 1));
      for (const side of sides) if (side >= 0 && zone[side] !== ZONE_LAIR && passable(side)) open[side] = 1;
    });
  }

  // ---- Old Workings: a straight shaft of the Order through the last two rings, crossing the band between them.
  if (plan.oldWorkings && rings >= 3) {
    const k = rings - 1;
    for (const angle of shuffled(rng, Array.from({ length: 36 }, (_, j) => (j / 36) * Math.PI * 2))) {
      if (caves.thresholds.some((t) => angleBetween(t.angle, angle) < Math.PI / 5)) continue;
      const shaft = straightLine(grid, shape, angle, shape.edge(k - 1, angle) + shape.thickness(k - 1, angle) / 2 + 1.5, shape.edge(rings, angle) - 1.2);
      const allowed = shaft.every((i) => zone[i] === k || zone[i] === rings || zone[i] === ZONE_BAND + k);
      const at = shaft.findIndex((i) => zone[i] === ZONE_BAND + k);
      const outerLanding = shaft.slice(at + 1).find((i) => zone[i] === rings);
      if (!allowed || at < 1 || outerLanding === undefined || shaft.some((i) => blocked[i] || crackArea[i] !== -1 || caves.kept[i])) continue;
      for (const i of shaft) open[i] = 1;
      caves.shaft = shaft;
      const gate = shaft[at]!;
      const tunnel = shaft.slice(at + 1, shaft.indexOf(outerLanding) + 1);
      caves.thresholds.push({ border: k, kind: OLD_WORKINGS, angle, gate, innerLanding: shaft[at - 1]!, tunnel, outerLanding, alwaysOpen: true });
      caves.kept[gate] = 1;
      break;
    }
    if (caves.shaft.length === 0) return 'old workings: no room for the shaft';
  }

  // ---- Dead ends: each Draught Crack lies at the end of one; a chamber with one way out is one too (GAME_DESIGN.md §9.1);
  // the rest are side passages ending in a pocket.
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const wanted = between(rng, ring.deadEnds);
    caves.thresholds.forEach((t, index) => {
      if (t.border !== k || t.kind !== DRAUGHT_CRACK) return;
      const spur = spurToNetwork(t.innerLanding, k, index);
      if (!spur) return;
      for (const i of [...spur, t.innerLanding]) open[i] = 1;
      addDeadEnd({ ring: k, spur, pocket: [t.innerLanding], content: t.gate, crack: index });
      for (let i = 0; i < n; i++) if (crackArea[i] === index) crackArea[i] = -1;
    });
    if (caves.thresholds.some((t) => t.border === k && t.kind === DRAUGHT_CRACK && !caves.deadEnds.some((d) => d.content === t.gate))) return `dead ends: no way to the Draught Crack in ring ${k}`;
    const leaf = caves.chambers.map((c, index) => c.ring === k && chamberExits(index) === 1);
    // Side passages start away from such chambers, so those keep their one way out.
    const nearLeaf = (i: number) => [i, ...grid.neighbors[i]!].some((j) => caves.chamberOf[j]! >= 0 && leaf[caves.chamberOf[j]!]);
    let made = caves.deadEnds.filter((d) => d.ring === k).length + leaf.filter(Boolean).length;
    const starts = shuffled(
      rng,
      Array.from({ length: n }, (_, i) => i).filter((i) => zone[i] === k && open[i] && !caves.kept[i] && caves.deadEndOf[i] === -1 && !lairWall[i] && !nearLeaf(i)),
    );
    for (const start of starts) {
      if (made >= wanted) break;
      const grown = growSpur(start, k, between(rng, s.deadEndSpur), between(rng, s.deadEndPocket));
      if (!grown) continue;
      for (const i of [...grown.spur, ...grown.pocket]) open[i] = 1;
      const content = grown.pocket.reduce((best, i) => (grid.steps(i, start) > grid.steps(best, start) ? i : best));
      addDeadEnd({ ring: k, spur: grown.spur, pocket: grown.pocket, content, crack: null });
      made++;
    }
    if (made < ring.deadEnds[0]) return `dead ends: only ${made} fit in ring ${k}`;
  }
  caves.chambers.forEach((c, index) => (c.exits = chamberExits(index)));

  /** Separate openings in a chamber's wall: open hexes next to it, in groups that touch each other. */
  function chamberExits(index: number): number {
    const mouths = new Set<number>();
    for (const i of caves.chambers[index]!.hexes) for (const j of grid.neighbors[i]!) if (open[j] && caves.chamberOf[j] !== index) mouths.add(j);
    const seen = new Set<number>();
    let groups = 0;
    for (const m of mouths) {
      if (seen.has(m)) continue;
      groups++;
      const queue = [m];
      seen.add(m);
      for (let head = 0; head < queue.length; head++) {
        for (const j of grid.neighbors[queue[head]!]!) {
          if (mouths.has(j) && !seen.has(j)) {
            seen.add(j);
            queue.push(j);
          }
        }
      }
    }
    return groups;
  }

  // One hex wide: a corridor hex with at most two open neighbours.
  for (let i = 0; i < n; i++) {
    if (open[i] && caves.chamberOf[i] === -1 && zone[i] !== ZONE_LAIR) caves.narrow[i] = grid.neighbors[i]!.filter((j) => open[j]).length <= 2 ? 1 : 0;
  }

  function addDeadEnd(d: CaveDeadEnd): void {
    const index = caves.deadEnds.length;
    caves.deadEnds.push(d);
    for (const i of [...d.spur, ...d.pocket]) caves.deadEndOf[i] = index;
  }

  /** Can a dead end be dug through this hex of ring k? */
  function diggable(i: number, k: number, crack: number | null): boolean {
    return zone[i] === k && !open[i] && !blocked[i] && !lairWall[i] && (crackArea[i] === -1 || crackArea[i] === crack) && !caves.kept[i];
  }

  /** The shortest passage from a crack's landing back to the ring's caves, touching nothing else on the way. */
  function spurToNetwork(landing: number, k: number, crack: number): number[] | null {
    const cameFrom = new Map<number, number>([[landing, -1]]);
    const queue = [landing];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]!;
      if (current !== landing && grid.neighbors[current]!.some((j) => open[j] && zone[j] === k && caves.deadEndOf[j] === -1)) {
        const path: number[] = [];
        for (let i = current; i !== landing; i = cameFrom.get(i)!) path.push(i);
        return path;
      }
      for (const next of grid.neighbors[current]!) {
        if (cameFrom.has(next) || !diggable(next, k, crack)) continue;
        cameFrom.set(next, current);
        queue.push(next);
      }
    }
    return null;
  }

  /** A side passage out of `start`, `length` hexes long, then a pocket; it touches nothing open but its own hexes. */
  function growSpur(start: number, k: number, length: number, pocketSize: number, minLength = s.deadEndSpur[0]): { spur: number[]; pocket: number[] } | null {
    const near = new Set([start, ...grid.neighbors[start]!.filter((j) => open[j] && caves.deadEndOf[j] === -1)]);
    const spur: number[] = [];
    const taken = new Set<number>();
    let previous = start;
    let direction = rng.int(0, 5);
    for (let step = 0; step < length; step++) {
      const options: Array<{ i: number; d: number; weight: number }> = [];
      for (let d = 0; d < 6; d++) {
        const i = grid.neighborIn(previous, d);
        if (i < 0 || taken.has(i) || !diggable(i, k, null)) continue;
        const alone = grid.neighbors[i]!.every((j) => (!open[j] && !taken.has(j)) || j === previous || (step === 0 && near.has(j)));
        if (!alone) continue;
        const turn = Math.min((d - direction + 6) % 6, (direction - d + 6) % 6);
        options.push({ i, d, weight: turn === 0 ? 4 : turn === 1 ? 1.5 : 0.2 });
      }
      if (options.length === 0) {
        // Stuck: a shorter passage will do, if it is long enough.
        if (spur.length >= minLength) break;
        return null;
      }
      const choice = rng.weightedPick(options);
      spur.push(choice.i);
      taken.add(choice.i);
      previous = choice.i;
      direction = choice.d;
    }
    const end = spur[spur.length - 1]!;
    const pocket: number[] = [];
    for (let p = 0; p < pocketSize; p++) {
      const options = [end, ...pocket]
        .flatMap((i) => grid.neighbors[i]!)
        .filter((i) => !taken.has(i) && diggable(i, k, null))
        .filter((i) => grid.neighbors[i]!.every((j) => (!open[j] && !taken.has(j)) || j === end || pocket.includes(j)));
      if (options.length === 0) break;
      const choice = rng.pick(options);
      pocket.push(choice);
      taken.add(choice);
    }
    return pocket.length > 0 ? { spur, pocket } : null;
  }

  return caves;
}

/** Grows a blob of `size` hexes around `center`, nearest (with a little noise) first, through hexes `ok` allows. */
function growBlob(grid: HexGrid, center: number, size: number, ok: (i: number) => boolean, noise: Float64Array): number[] {
  const blob = [center];
  const inBlob = new Set(blob);
  const frontier = new Set<number>();
  const score = (i: number) => grid.between(i, center) + noise[i]! * 1.4;
  for (;;) {
    for (const j of grid.neighbors[blob[blob.length - 1]!]!) if (!inBlob.has(j) && ok(j)) frontier.add(j);
    if (blob.length >= size || frontier.size === 0) return blob;
    let best = -1;
    for (const f of frontier) if (best === -1 || score(f) < score(best)) best = f;
    frontier.delete(best);
    blob.push(best);
    inBlob.add(best);
  }
}

/**
 * The tunnel of a threshold on border k at an angle: from the last hex of ring k, across the band, to the first hex
 * of ring k + 1. Null where the band doesn't lie cleanly between the two rings.
 */
function buildTunnel(grid: HexGrid, shape: WorldShape, k: number, angle: number, kind: string, alwaysOpen: boolean): CaveThreshold | null {
  const middle = shape.edge(k, angle);
  const half = shape.thickness(k, angle) / 2;
  const line = straightLine(grid, shape, angle, middle - half - 3, middle + half + 3);
  const firstBand = line.findIndex((i) => shape.zone[i] === ZONE_BAND + k);
  if (firstBand < 1 || shape.zone[line[firstBand - 1]!] !== k) return null;
  let last = firstBand;
  while (last + 1 < line.length && shape.zone[line[last + 1]!] === ZONE_BAND + k) last++;
  const outerLanding = line[last + 1];
  if (outerLanding === undefined || shape.zone[outerLanding] !== k + 1) return null;
  return {
    border: k,
    kind,
    angle,
    gate: line[firstBand]!,
    innerLanding: line[firstBand - 1]!,
    tunnel: [...line.slice(firstBand + 1, last + 1), outerLanding],
    outerLanding,
    alwaysOpen,
  };
}

/** Hexes along a straight line out from the rings' middle, from distance `from` to `to`, each next to the one before. */
function straightLine(grid: HexGrid, shape: WorldShape, angle: number, from: number, to: number): number[] {
  const line: number[] = [];
  for (let rho = from; rho <= to; rho += 0.2) {
    const i = grid.at(shape.cx + Math.cos(angle) * rho, shape.cy + Math.sin(angle) * rho);
    if (i !== undefined && line[line.length - 1] !== i) line.push(i);
  }
  return line;
}

/** Direction (0–5) from hex a to its neighbour b. */
function directionTo(grid: HexGrid, a: number, b: number): number {
  for (let d = 0; d < 6; d++) if (grid.neighborIn(a, d) === b) return d;
  return 0;
}

/** Difference between two angles, 0 to π. */
export function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
