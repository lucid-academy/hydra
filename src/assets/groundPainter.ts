// The map's ground in HD, painted as one surface (GAME_DESIGN.md §13, "Mapa w stylu Songs of Conquest"):
// no grid and no seams between hexes, borders between kinds of ground wander a little, rock rises as one mass with
// cliffs where it meets lower ground, and casts a soft shadow to the lower right (light comes from the upper left).
// Ground textures are calmed (less contrast, no glaring brights) so that things standing on them stand out.
// Plain pixel work on RGBA arrays (no Phaser), so it can be tested; MapScene shows the result.
//
// Every painted pixel belongs to one hex: the ground of the hex it lies in, or the top or the cliff of a rock hex in
// front of it. A pixel is painted only when the hydra knows that hex; elsewhere it stays transparent (dark).
// Only known hexes shape what is painted around them (rock hiding what is behind it, shadows, shores), so the painting
// gives nothing away about the unknown, and a known hex shows whole even before the rock in front of it is known.

import { HEX_DIRECTIONS, pixelToHex } from '../sim/hex';
import type { HexLayout } from '../sim/hex';
import type { Pixels } from './terrain';

/** What a hex shows from above: which texture its face has, and whether it rises as rock. */
export interface HexLook {
  texture: number;
  rock: boolean;
}

/** The hexes as the painter sees them: looks and what the hydra knows, in arrays indexed by axial (q, r). */
export class HexGrid {
  /** Hexes per side of the arrays. */
  readonly size: number;
  /** Texture of each hex's face, or -1 where there is no map. */
  readonly texture: Int16Array;
  readonly rock: Uint8Array;
  readonly known: Uint8Array;
  private readonly offset: number;

  /** A grid for every hex up to `radius` steps from (0, 0). */
  constructor(radius: number) {
    this.offset = radius + 1;
    this.size = 2 * this.offset + 1;
    this.texture = new Int16Array(this.size * this.size).fill(-1);
    this.rock = new Uint8Array(this.size * this.size);
    this.known = new Uint8Array(this.size * this.size);
  }

  /** Index of hex (q, r) in the arrays, or -1 when it is off the grid. */
  index(q: number, r: number): number {
    const i = q + this.offset;
    const j = r + this.offset;
    return i < 0 || j < 0 || i >= this.size || j >= this.size ? -1 : j * this.size + i;
  }

  /** The hex at an index: the opposite of index(). */
  hexAt(index: number): { q: number; r: number } {
    return { q: (index % this.size) - this.offset, r: Math.floor(index / this.size) - this.offset };
  }

  /** Sets a hex's look; returns whether it changed. */
  setLook(q: number, r: number, look: HexLook): boolean {
    const i = this.index(q, r);
    if (i < 0) return false;
    const rock = look.rock ? 1 : 0;
    if (this.texture[i] === look.texture && this.rock[i] === rock) return false;
    this.texture[i] = look.texture;
    this.rock[i] = rock;
    return true;
  }

  /** Marks a hex known or not; returns whether it changed. */
  setKnown(q: number, r: number, known: boolean): boolean {
    const i = this.index(q, r);
    const value = known ? 1 : 0;
    if (i < 0 || this.known[i] === value) return false;
    this.known[i] = value;
    return true;
  }
}

/** How a texture is used, which decides how it is calmed and shaded. */
export type SurfaceKind = 'ground' | 'water' | 'rock';

export interface GroundTexture {
  pixels: Pixels;
  kind: SurfaceKind;
}

export interface GroundSpec {
  layout: HexLayout;
  /** Pixels per screen unit (2 in HD). */
  density: number;
  /** How high rock rises above the ground, in screen units. */
  lift: number;
  /** World position (screen units) of the painted ground's top-left pixel, and its size in pixels. */
  originX: number;
  originY: number;
  width: number;
  height: number;
  /** The same seed always paints the same borders. */
  seed: number;
}

/** A rectangle of pixels: x0 and y0 included, x1 and y1 not. */
export interface PixelRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// ------------------------------------------------------------------ how it looks (tuned on screenshots)

/** How far borders between hexes wander, in screen units: a broad sway and a ragged edge. Up and down a bit less (the map is seen from a slant). */
const WARP = { broad: 4.5, broadSize: 24, ragged: 1.5, raggedSize: 5, vertical: 0.7 };
/** How soft hex corners are: how far a hex's pull reaches, as a share of the distance between hex centres. */
const SOFT_BORDERS = 0.42;
/** How far past its own hex a hex's ground can reach (soft corners, then wandering), in screen units. */
const WARP_REACH_X = 8 + WARP.broad + WARP.ragged;
const WARP_REACH_Y = (8 + WARP.broad + WARP.ragged) * WARP.vertical;
/** Contrast kept from each texture (1 = as drawn) and the brightest its average may be (0–1), by kind. */
const CALM: Record<SurfaceKind, { contrast: number; maxBrightness: number; brightness: number }> = {
  ground: { contrast: 0.78, maxBrightness: 0.45, brightness: 1 },
  water: { contrast: 0.8, maxBrightness: 0.38, brightness: 1 },
  rock: { contrast: 0.7, maxBrightness: 0.36, brightness: 1 },
};
/** Rock: its top darker than the ground (it is not walkable), darker still away from its edges, with a lit front edge. */
const ROCK_TOP = { shade: 0.6, inner: 0.72, frontEdge: 1.45, backEdge: 0.7, innerReach: 9 };
/** Cliffs: lit from the left, dark on the right, darker at the foot, a bright line along the top. */
const CLIFF = { left: 0.66, middle: 0.52, right: 0.4, foot: 0.75, topLine: 1.25 };
/** Ground in the shadow of rock (to its lower right), how dark at most and how far it reaches (screen units). */
const SHADOW = { darkest: 0.5, steps: 5, stepX: 1.4, stepY: 1, footDark: 0.78 };
/** Water's edge: wet ground darker, a light line on the water. */
const SHORE = { reach: 1.5, wetGround: 0.82, waterLine: 1.18 };
/** Slow patches of lighter and darker ground, so a big area of one texture doesn't look repeated. */
const PATCHES = { size: 40, strength: 0.09 };
/** Painting looks this far (screen units) around a pixel, for shadows, shores and the inside of rock. */
const LOOK_AROUND = 10;

// ------------------------------------------------------------------ the painter

export class GroundPainter {
  private readonly liftPx: number;
  private readonly textures: Array<{ data: Uint8ClampedArray; width: number; height: number; kind: SurfaceKind; offsetX: number; offsetY: number }>;
  /** Which hex each pixel lies in (borders already wandering), worked out in tiles of 64×64 pixels when first needed. */
  private readonly idTiles = new Map<number, Int32Array>();
  private readonly tilesAcross: number;
  /** 1 for each texture that is water. */
  private readonly water: Uint8Array;

  constructor(
    private readonly spec: GroundSpec,
    private readonly grid: HexGrid,
    textures: GroundTexture[],
  ) {
    this.liftPx = Math.round(spec.lift * spec.density);
    this.tilesAcross = Math.ceil(spec.width / 64);
    this.textures = textures.map((t, i) => ({
      ...calm(t.pixels, t.kind),
      kind: t.kind,
      // Each texture starts at its own place, so two areas of different textures don't share a pattern.
      offsetX: Math.floor(hash(i, 1, spec.seed) * t.pixels.width),
      offsetY: Math.floor(hash(i, 2, spec.seed) * t.pixels.height),
    }));
    this.water = Uint8Array.from(textures, (t) => (t.kind === 'water' ? 1 : 0));
  }

  get width(): number {
    return this.spec.width;
  }

  get height(): number {
    return this.spec.height;
  }

  /** World position (screen units) of the top-left pixel. */
  get origin(): { x: number; y: number } {
    return { x: this.spec.originX, y: this.spec.originY };
  }

  /** The pixels a hex can colour: its face with wandering borders, the cliff and top of its rock, and the shadow it casts. */
  hexRect(q: number, r: number): PixelRect {
    const { layout, density, lift } = this.spec;
    const cx = layout.originX + layout.columnWidth * (q + r / 2);
    const cy = layout.originY + layout.rowHeight * r;
    const halfWidth = layout.columnWidth / 2 + WARP_REACH_X;
    // A pointy-top hex face is 4/3 of the row step tall.
    const halfHeight = (layout.rowHeight * 2) / 3 + WARP_REACH_Y;
    return this.toPixels(cx - halfWidth, cy - halfHeight - lift, cx + halfWidth, cy + halfHeight, density);
  }

  /** hexRect grown by how far a hex's look reaches into its neighbours' pixels (shadows, shores, edges). */
  changedRect(q: number, r: number): PixelRect {
    const rect = this.hexRect(q, r);
    const grow = Math.ceil(LOOK_AROUND * this.spec.density);
    return { x0: rect.x0 - grow, y0: rect.y0 - grow, x1: rect.x1 + grow, y1: rect.y1 + grow };
  }

  /**
   * Paints the pixels of `rect` into `out`, whose top-left pixel is pixel (outX, outY) of the whole ground.
   * With `only` (a hex index of the grid), paints just the pixels that hex colours and leaves the rest transparent.
   */
  paint(rect: PixelRect, out: Pixels, outX: number, outY: number, only = -1): void {
    const x0 = Math.max(rect.x0, outX, 0);
    const y0 = Math.max(rect.y0, outY, 0);
    const x1 = Math.min(rect.x1, outX + out.width, this.spec.width);
    const y1 = Math.min(rect.y1, outY + out.height, this.spec.height);
    if (x1 <= x0 || y1 <= y0) return;
    const { texture: lookTexture, rock, known } = this.grid;
    const lift = this.liftPx;
    const d = this.spec.density;

    // The hexes of every pixel this paint can look at, copied once: painting looks at each many times.
    const margin = Math.ceil(LOOK_AROUND * d);
    const bx0 = x0 - margin;
    const by0 = y0 - margin;
    const bw = x1 - x0 + 2 * margin;
    const bh = y1 - y0 + lift + 2 * margin;
    const ids = new Int32Array(bw * bh);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) ids[by * bw + bx] = this.idAt(bx0 + bx, by0 + by);
    const idAt = (x: number, y: number): number => ids[(y - by0) * bw + (x - bx0)]!;
    const rockAt = (x: number, y: number): boolean => {
      const id = idAt(x, y);
      return id >= 0 && rock[id] === 1 && known[id] === 1;
    };
    const waterAt = (x: number, y: number): boolean => {
      const id = idAt(x, y);
      return id >= 0 && rock[id] === 0 && known[id] === 1 && this.water[lookTexture[id]!] === 1;
    };
    const dryGroundAt = (x: number, y: number): boolean => {
      const id = idAt(x, y);
      return id >= 0 && rock[id] === 0 && known[id] === 1 && this.water[lookTexture[id]!] === 0;
    };
    const shore = Math.max(1, Math.round(SHORE.reach * d));
    const nearAny = (test: (x: number, y: number) => boolean, x: number, y: number): boolean =>
      test(x - shore, y) || test(x + shore, y) || test(x, y - shore) || test(x, y + shore);
    const inner = Math.round(ROCK_TOP.innerReach * d);
    const facingStep = 2 * d;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const o = ((y - outY) * out.width + (x - outX)) * 4;
        let id = idAt(x, y + lift);

        if (id >= 0 && rock[id] === 1 && known[id] === 1) {
          // The top of a rock hex, raised: its face is `lift` higher than its place on the ground.
          if (only >= 0 && id !== only) {
            clear(out.data, o);
            continue;
          }
          let shade = ROCK_TOP.shade;
          if (!rockAt(x, y + lift + d)) shade *= ROCK_TOP.frontEdge;
          else if (!rockAt(x, y + lift - d)) shade *= ROCK_TOP.backEdge;
          if (rockAt(x - inner, y + lift) && rockAt(x + inner, y + lift) && rockAt(x, y + lift - inner) && rockAt(x, y + lift + inner)) shade *= ROCK_TOP.inner;
          put(out.data, o, this.sample(lookTexture[id]!, x, y + lift), shade * this.patch(x, y + lift));
          continue;
        }

        // A cliff: the lowest rock pixel within `lift` below this one is the foot of the cliff in front.
        let foot = lift - 1;
        for (; foot >= 0; foot--) {
          id = idAt(x, y + foot);
          if (id >= 0 && rock[id] === 1 && known[id] === 1) break;
        }
        if (foot >= 0) {
          if (only >= 0 && id !== only) {
            clear(out.data, o);
            continue;
          }
          // Which way the cliff faces: rock to the left of its foot means its edge rises to the right (it faces right).
          const facing = (rockAt(x - facingStep, y + foot) ? 1 : 0) - (rockAt(x + facingStep, y + foot) ? 1 : 0);
          let shade = facing < 0 ? CLIFF.left : facing > 0 ? CLIFF.right : CLIFF.middle;
          shade *= CLIFF.foot + (1 - CLIFF.foot) * ((foot + 0.5) / lift);
          if (foot === lift - 1) shade *= CLIFF.topLine;
          put(out.data, o, this.sample(lookTexture[id]!, x, y), shade);
          continue;
        }

        // Ground.
        id = idAt(x, y);
        if (id < 0 || (only >= 0 && id !== only) || known[id] === 0 || rock[id] === 1) {
          clear(out.data, o);
          continue;
        }
        const texture = lookTexture[id]!;
        let shade = 1;
        // The shadow of rock standing to the upper left, and darker right at the foot of a cliff.
        let shadow = 0;
        for (let k = 1; k <= SHADOW.steps; k++) {
          if (rockAt(x - Math.round(k * SHADOW.stepX * d), y - Math.round(k * SHADOW.stepY * d))) shadow++;
        }
        shade *= 1 - (1 - SHADOW.darkest) * (shadow / SHADOW.steps);
        if (rockAt(x, y - d)) shade *= SHADOW.footDark;
        // Shores: a light line on the water, wet ground beside it.
        if (this.water[texture] === 1) {
          if (nearAny(dryGroundAt, x, y)) shade *= SHORE.waterLine;
        } else if (nearAny(waterAt, x, y)) {
          shade *= SHORE.wetGround;
        }
        put(out.data, o, this.sample(texture, x, y), shade * this.patch(x, y));
      }
    }
  }

  /**
   * The hex whose colour pixel (x, y) shows, as paint() decides it: the top or cliff of known rock in front, or else
   * the hex the pixel lies in (known or not). -1 off the map.
   */
  ownerAt(x: number, y: number): number {
    const { rock, known } = this.grid;
    for (let foot = this.liftPx; foot >= 0; foot--) {
      const id = this.idAt(x, y + foot);
      if (id >= 0 && rock[id] === 1 && known[id] === 1) return id;
    }
    return this.idAt(x, y);
  }

  /**
   * How dark the ground shows, in squares of `cell` screen units (`across` × `down` of them, row by row): the darkness
   * (`levels`, by hex index) of the hex whose colour shows in the middle of each square, 1 where none does.
   * Far from any change of darkness that is simply the darkness of the hexes around; only near one is each pixel's
   * hex worked out (doing it everywhere would work out the borders of the whole map at once).
   * With `squares`, works out only that rectangle of squares, into `into`, and leaves the rest of it as it was.
   */
  shownLevels(levels: Float32Array, cell: number, into?: Float32Array, squares?: PixelRect): { values: Float32Array; across: number; down: number } {
    const { layout, density, lift, originX, originY } = this.spec;
    const across = Math.ceil(this.spec.width / density / cell);
    const down = Math.ceil(this.spec.height / density / cell);
    const settled = this.settledHexes(levels);
    const hexIndexAt = (x: number, y: number): number => {
      const { q, r } = pixelToHex(layout, x, y);
      return this.grid.index(q, r);
    };
    const values = into ?? new Float32Array(across * down);
    const step = cell * density;
    const [x0, y0] = [Math.max(0, squares?.x0 ?? 0), Math.max(0, squares?.y0 ?? 0)];
    const [x1, y1] = [Math.min(across, squares?.x1 ?? across), Math.min(down, squares?.y1 ?? down)];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const px = Math.floor((x + 0.5) * step);
        const py = Math.floor((y + 0.5) * step);
        // The hex the middle of the square lies in, and the one whose rock could stand in front of it.
        const here = hexIndexAt(originX + px / density, originY + py / density);
        const front = hexIndexAt(originX + px / density, originY + py / density + lift);
        if (here >= 0 && settled[here] === 1 && (front === here || (front >= 0 && settled[front] === 1 && levels[front] === levels[here]))) {
          values[y * across + x] = levels[here]!;
          continue;
        }
        const owner = this.ownerAt(px, py);
        values[y * across + x] = owner >= 0 ? levels[owner]! : 1;
      }
    }
    return { values, across, down };
  }

  /**
   * The squares (of `cell` screen units, as in shownLevels) whose darkness can change when hex (q, r) changes: those
   * whose colour can come from it, up to two hexes away or with it as rock in front.
   */
  squaresAround(q: number, r: number, cell: number): PixelRect {
    const { layout, lift, originX, originY } = this.spec;
    const cx = layout.originX + layout.columnWidth * (q + r / 2);
    const cy = layout.originY + layout.rowHeight * r;
    // Two hexes each way, and the face of the farthest.
    const reachX = layout.columnWidth * 2.5;
    const reachY = layout.rowHeight * 2 + (layout.rowHeight * 2) / 3;
    return {
      x0: Math.floor((cx - reachX - originX) / cell) - 1,
      y0: Math.floor((cy - reachY - lift - originY) / cell) - 1,
      x1: Math.ceil((cx + reachX - originX) / cell) + 1,
      y1: Math.ceil((cy + reachY - originY) / cell) + 1,
    };
  }

  /**
   * 1 for each hex as dark as every hex up to two steps away. A pixel's colour never comes from further away than
   * that: borders wander less than half a hex, and rock in front is at most one more step.
   */
  private settledHexes(levels: Float32Array): Uint8Array {
    const grid = this.grid;
    const levelAt = (q: number, r: number): number => {
      const index = grid.index(q, r);
      return index >= 0 ? levels[index]! : 1;
    };
    const count = grid.size * grid.size;
    const evenAround = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const { q, r } = grid.hexAt(i);
      evenAround[i] = HEX_DIRECTIONS.every((d) => levelAt(q + d.q, r + d.r) === levels[i]) ? 1 : 0;
    }
    const settled = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      if (evenAround[i] === 0) continue;
      const { q, r } = grid.hexAt(i);
      settled[i] = HEX_DIRECTIONS.every((d) => evenAround[grid.index(q + d.q, r + d.r)] === 1) ? 1 : 0;
    }
    return settled;
  }

  /** Index of the hex pixel (x, y) lies in, or -1 off the painted ground or off the map. */
  idAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.spec.width || y >= this.spec.height) return -1;
    const key = (y >> 6) * this.tilesAcross + (x >> 6);
    let tile = this.idTiles.get(key);
    if (!tile) {
      tile = this.makeIdTile(x >> 6, y >> 6);
      this.idTiles.set(key, tile);
    }
    return tile[((y & 63) << 6) | (x & 63)]!;
  }

  private makeIdTile(tileX: number, tileY: number): Int32Array {
    const tile = new Int32Array(64 * 64);
    const { layout, density, originX, originY, seed } = this.spec;
    const { texture, rock } = this.grid;
    // Neighbours of a hex, as (q, r) steps; the hex itself first.
    const steps = [0, 0, 1, 0, -1, 0, 0, 1, 0, -1, 1, -1, -1, 1];
    // Up to 7 looks met around a pixel: their key, summed weight, and their nearest hex.
    const lookKeys = new Int32Array(7);
    const totals = new Float64Array(7);
    const nearest = new Int32Array(7);
    const nearestWeight = new Float64Array(7);
    const unsquash = (layout.columnWidth * Math.sqrt(3)) / 2 / layout.rowHeight;
    const spread = 2 * (SOFT_BORDERS * layout.columnWidth) ** 2;
    for (let py = 0; py < 64; py++) {
      for (let px = 0; px < 64; px++) {
        // The middle of the pixel, in world units, moved by the noise so borders wander.
        const wx = originX + (tileX * 64 + px + 0.5) / density;
        const wy = originY + (tileY * 64 + py + 0.5) / density;
        const sx = wx + WARP.broad * noise(wx / WARP.broadSize, wy / WARP.broadSize, seed) + WARP.ragged * noise(wx / WARP.raggedSize, wy / WARP.raggedSize, seed + 1);
        const sy =
          wy +
          WARP.vertical * (WARP.broad * noise(wx / WARP.broadSize, wy / WARP.broadSize, seed + 2) + WARP.ragged * noise(wx / WARP.raggedSize, wy / WARP.raggedSize, seed + 3));
        // The hex the point lies in (pixelToHex, inlined: this runs for every pixel of the map).
        const r = (sy - layout.originY) / layout.rowHeight;
        const q = (sx - layout.originX) / layout.columnWidth - r / 2;
        const s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        const rs = Math.round(s);
        const dq = Math.abs(rq - q);
        const dr = Math.abs(rr - r);
        const ds = Math.abs(rs - s);
        if (dq > dr && dq > ds) rq = -rr - rs;
        else if (dr > ds) rr = -rq - rs;
        // Each look nearby pulls the point by the closeness of its hexes; the strongest look takes it, and its
        // nearest hex owns it. Corners round off, and narrow bits of a look give way to the look around them.
        let looks = 0;
        for (let n = 0; n < 14; n += 2) {
          const hq = rq + steps[n]!;
          const hr = rr + steps[n + 1]!;
          const index = this.grid.index(hq, hr);
          if (index < 0 || texture[index]! < 0) continue;
          const dx = sx - (layout.originX + layout.columnWidth * (hq + hr / 2));
          const dy = (sy - (layout.originY + layout.rowHeight * hr)) * unsquash;
          const weight = Math.exp(-(dx * dx + dy * dy) / spread);
          const key = texture[index]! * 2 + rock[index]!;
          let l = 0;
          while (l < looks && lookKeys[l] !== key) l++;
          if (l === looks) {
            lookKeys[l] = key;
            totals[l] = 0;
            nearestWeight[l] = -1;
            looks++;
          }
          totals[l]! += weight;
          if (weight > nearestWeight[l]!) {
            nearestWeight[l] = weight;
            nearest[l] = index;
          }
        }
        let best = -1;
        for (let l = 0; l < looks; l++) if (best < 0 || totals[l]! > totals[best]!) best = l;
        tile[(py << 6) | px] = best >= 0 ? nearest[best]! : -1;
      }
    }
    return tile;
  }

  /** A texture's (calmed) colour at a pixel of the ground, as 0xRRGGBB. Textures repeat over the whole map. */
  private sample(texture: number, x: number, y: number): number {
    const t = this.textures[texture];
    if (!t) return 0;
    const tx = (((x + t.offsetX) % t.width) + t.width) % t.width;
    const ty = (((y + t.offsetY) % t.height) + t.height) % t.height;
    const i = (ty * t.width + tx) * 4;
    return (t.data[i]! << 16) | (t.data[i + 1]! << 8) | t.data[i + 2]!;
  }

  /** Slow lighter and darker patches over the ground. */
  private patch(x: number, y: number): number {
    const d = this.spec.density;
    return 1 + PATCHES.strength * noise(x / d / PATCHES.size, y / d / PATCHES.size, this.spec.seed + 7);
  }

  private toPixels(left: number, top: number, right: number, bottom: number, density: number): PixelRect {
    const { originX, originY } = this.spec;
    return {
      x0: Math.floor((left - originX) * density),
      y0: Math.floor((top - originY) * density),
      x1: Math.ceil((right - originX) * density),
      y1: Math.ceil((bottom - originY) * density),
    };
  }
}

// ------------------------------------------------------------------ helpers

/** A texture with less contrast, and darkened if on average it is brighter than its kind allows. */
function calm(pixels: Pixels, kind: SurfaceKind): { data: Uint8ClampedArray; width: number; height: number } {
  const { contrast, maxBrightness, brightness } = CALM[kind];
  const count = pixels.width * pixels.height;
  let [r, g, b] = [0, 0, 0];
  for (let i = 0; i < count * 4; i += 4) {
    r += pixels.data[i]!;
    g += pixels.data[i + 1]!;
    b += pixels.data[i + 2]!;
  }
  [r, g, b] = [r / count, g / count, b / count];
  const average = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const scale = brightness * Math.min(1, maxBrightness / Math.max(average, 0.01));
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count * 4; i += 4) {
    data[i] = (r + (pixels.data[i]! - r) * contrast) * scale;
    data[i + 1] = (g + (pixels.data[i + 1]! - g) * contrast) * scale;
    data[i + 2] = (b + (pixels.data[i + 2]! - b) * contrast) * scale;
    data[i + 3] = 255;
  }
  return { data, width: pixels.width, height: pixels.height };
}

function put(data: Uint8ClampedArray, o: number, colour: number, shade: number): void {
  data[o] = ((colour >> 16) & 255) * shade;
  data[o + 1] = ((colour >> 8) & 255) * shade;
  data[o + 2] = (colour & 255) * shade;
  data[o + 3] = 255;
}

function clear(data: Uint8ClampedArray, o: number): void {
  data[o] = 0;
  data[o + 1] = 0;
  data[o + 2] = 0;
  data[o + 3] = 0;
}

/** A stable random number in [0, 1) for a grid point. */
function hash(x: number, y: number, seed: number): number {
  let h = (seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth noise in [-1, 1]: random values at whole-number points, blended in between. */
export function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const e = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy) * 2 - 1;
}
