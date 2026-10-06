// The map's ground in HD (GAME_DESIGN.md §13): painted by GroundPainter into square textures (chunks) that lie flat
// under everything, plus the rock at the edges of open ground as separate pictures, sorted with the things standing
// on the map so that a cliff hides what stands behind it. Only hexes the hydra knows are painted, a few at a time as
// it explores. The textures outlive the map scene (it restarts after every battle) and go when another run begins.
// Over the ground lies the darkness of `visibility` (not the hydra's mist): ground out of sight dimmed, and the edge
// of the known map fading softly into the dark. Things standing on the map are dimmed by their own hex instead.

import * as Phaser from 'phaser';
import { GroundPainter, HexGrid } from '../assets/groundPainter';
import type { GroundTexture, HexLook, PixelRect } from '../assets/groundPainter';
import { MAP_ROCK_LIFT, MAP_TILE } from '../assets/mapArt';
import { groundTextureKey, rockTextureKey } from '../assets/terrain';
import { readPixels } from '../assets/terrainTiles';
import type { GameData } from '../data';
import { hexNeighbors, hexToPixel, pixelToHex } from '../sim/hex';
import type { HexLayout } from '../sim/hex';
import type { HexMap, Tile, Visibility } from '../sim/map';
import { HD_DENSITY, useDensity } from './view';

/**
 * Chunks of painted ground are this many pixels square. Not a power of two on purpose: Phaser makes such textures
 * repeat, and a chunk's edge would then show a faint line of its opposite edge.
 */
const CHUNK = 250;
/** Rock pictures are kept on sheets of this many pixels square (not a power of two, like the chunks). */
const SHEET = 1000;
/** Room around the outermost hex centres, in screen units (wandering borders, cliffs, shadows). */
const MARGIN = 40;
/** The darkness is a picture with one pixel per this many screen units, blurred this many pixels and stretched smooth. */
const DARKNESS = { cell: 4, blur: 2, remembered: 0.45 };
/** Rock pictures of hexes out of sight are tinted like everything else there (MapScene's REMEMBERED_TINT). */
const REMEMBERED_TINT = 0x808080;
/** Points checked across a thing (this many each way) to find the rock in front of it. */
const SEE_THROUGH_SAMPLES = 4;

/** One rock picture: where it is on its sheet, and the frame that shows it. */
interface Block {
  sheet: number;
  slot: number;
  frame: string;
  rect: PixelRect;
}

/** What is painted for one run's map. Kept between map scenes; only one run at a time. */
interface Painted {
  map: HexMap;
  grid: HexGrid;
  painter: GroundPainter;
  chunksAcross: number;
  chunks: Map<number, Phaser.Textures.CanvasTexture>;
  sheets: Phaser.Textures.CanvasTexture[];
  freeSlots: Array<{ sheet: number; slot: number }>;
  slotSize: { width: number; height: number; across: number; perSheet: number };
  blocks: Map<number, Block>;
  textureIndex: Map<string, number>;
  /** Looks are set, and what is known painted, at least once. */
  started: boolean;
}

let painted: Painted | null = null;

export class MapGround {
  private readonly painted: Painted;
  private readonly chunkImages = new Map<number, Phaser.GameObjects.Image>();
  private readonly blockImages = new Map<number, Phaser.GameObjects.Image>();
  private readonly darkness: Phaser.Textures.CanvasTexture;
  private readonly darknessImage: Phaser.GameObjects.Image;
  /** Darkness of each hex (0 seen now, 1 unknown), by grid index. */
  private readonly levels: Float32Array;
  /** Sheets of rock pictures painted on since they were last sent to the graphics card. */
  private readonly changedSheets = new Set<number>();
  /** The darkness as last worked out, before blurring, and the darkness of each hex it was worked out for. */
  private shown: { values: Float32Array; levels: Float32Array } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    map: HexMap,
    data: GameData,
    private readonly layout: HexLayout,
    seed: number,
    private readonly depths: { ground: number; darkness: number; standing: (feetY: number) => number },
  ) {
    if (painted?.map !== map) {
      if (painted) forget(scene, painted);
      painted = prepare(scene, map, data, layout, seed);
    }
    this.painted = painted;
    for (const [index, texture] of this.painted.chunks) this.showChunk(index, texture);
    for (const [hexIndex, block] of this.painted.blocks) this.showBlock(hexIndex, block);

    const p = this.painted;
    this.levels = new Float32Array(p.grid.size * p.grid.size);
    const across = Math.ceil(p.painter.width / HD_DENSITY / DARKNESS.cell);
    const down = Math.ceil(p.painter.height / HD_DENSITY / DARKNESS.cell);
    if (scene.textures.exists('map_darkness')) scene.textures.remove('map_darkness');
    this.darkness = scene.textures.createCanvas('map_darkness', across, down)!;
    // Smooth, not pixel art: the darkness is soft.
    this.darkness.setSmoothPixelArt(false);
    this.darknessImage = scene.add
      .image(p.painter.origin.x, p.painter.origin.y, this.darkness)
      .setOrigin(0, 0)
      .setScale(DARKNESS.cell)
      .setDepth(depths.darkness);
  }

  /** The part of the world the painted ground covers, in screen units. */
  get area(): { x: number; y: number; width: number; height: number } {
    const { painter } = this.painted;
    return { x: painter.origin.x, y: painter.origin.y, width: painter.width / HD_DENSITY, height: painter.height / HD_DENSITY };
  }

  /** Brings the ground in line with the map (thresholds found and opened) and what the hydra knows and sees. */
  update(visibility: Visibility): void {
    const p = this.painted;
    const dirty: PixelRect[] = [];
    const rockToCheck = new Set<number>();
    const reshaped: number[] = [];
    for (const tile of p.map.tiles.values()) {
      const { q, r } = tile.hex;
      // The first time, the looks are only noted: nothing has been painted yet.
      if (p.grid.setLook(q, r, lookOf(tile, p.textureIndex)) && p.started) {
        dirty.push(p.painter.changedRect(q, r));
        reshaped.push(p.grid.index(q, r));
        for (const h of [tile.hex, ...hexNeighbors(tile.hex)]) rockToCheck.add(p.grid.index(h.q, h.r));
      }
      if (p.grid.setKnown(q, r, visibility.has(`${q},${r}`))) {
        // A newly known hex can also shade its neighbours (shadows, shores) and hide what is behind it.
        dirty.push(p.painter.changedRect(q, r));
        for (const h of [tile.hex, ...hexNeighbors(tile.hex)]) rockToCheck.add(p.grid.index(h.q, h.r));
      }
    }
    p.started = true;
    this.repaint(dirty);
    for (const index of rockToCheck) if (index >= 0) this.syncBlock(index);
    // Each sheet goes to the graphics card once, however many of its pictures changed.
    for (const sheet of this.changedSheets) p.sheets[sheet]!.refresh();
    this.changedSheets.clear();
    this.updateDarkness(visibility, reshaped);
  }

  /**
   * Makes rock see-through where it stands in front of one of these things (its bounds in the world, and its depth),
   * so that a cliff never hides the hydra, an encounter, a shrine or a closed threshold. Other rock is solid again.
   */
  seeThrough(things: ReadonlyArray<{ bounds: Phaser.Geom.Rectangle; depth: number }>, alpha: number): void {
    const p = this.painted;
    const covering = new Set<Phaser.GameObjects.Image>();
    const blocks = [...this.blockImages.values()].map((image) => ({ image, bounds: image.getBounds() }));
    for (const { bounds, depth } of things) {
      if (!blocks.some((block) => block.image.depth > depth && Phaser.Geom.Intersects.RectangleToRectangle(bounds, block.bounds))) continue;
      // A few points over the middle of the thing (its picture's edges are mostly empty air).
      for (let i = 0; i < SEE_THROUGH_SAMPLES; i++) {
        for (let j = 0; j < SEE_THROUGH_SAMPLES; j++) {
          const x = bounds.x + (bounds.width * (0.2 + (0.6 * (i + 0.5)) / SEE_THROUGH_SAMPLES));
          const y = bounds.y + (bounds.height * (0.2 + (0.6 * (j + 0.5)) / SEE_THROUGH_SAMPLES));
          const owner = p.painter.ownerAt(Math.floor((x - p.painter.origin.x) * HD_DENSITY), Math.floor((y - p.painter.origin.y) * HD_DENSITY));
          const image = owner >= 0 ? this.blockImages.get(owner) : undefined;
          if (image && image.depth > depth) covering.add(image);
        }
      }
    }
    for (const image of this.blockImages.values()) image.setAlpha(covering.has(image) ? alpha : 1);
  }

  /** Removes this scene's pictures of the ground; the painting itself stays for the next map scene. */
  destroy(): void {
    for (const image of this.chunkImages.values()) image.destroy();
    for (const image of this.blockImages.values()) image.destroy();
    this.chunkImages.clear();
    this.blockImages.clear();
    this.darknessImage.destroy();
    this.scene.textures.remove(this.darkness);
  }

  // ------------------------------------------------------------ darkness

  /** `reshaped`: grid indices of hexes whose look changed (rock that opened shows what is behind it). */
  private updateDarkness(visibility: Visibility, reshaped: readonly number[]): void {
    const p = this.painted;
    this.levels.fill(1);
    for (const [key, state] of visibility) {
      const [q, r] = key.split(',').map(Number) as [number, number];
      const index = p.grid.index(q, r);
      if (index >= 0) this.levels[index] = state === 'visible' ? 0 : DARKNESS.remembered;
    }
    for (const [hexIndex, image] of this.blockImages) image.setTint(this.levels[hexIndex]! > 0 ? REMEMBERED_TINT : 0xffffff);

    // Each pixel of the darkness: how dark the hex is whose colour shows there. Worked out again only around the
    // hexes that changed since last time (a move changes the darkness near the hydra, not across the map).
    const { width, height } = this.darkness;
    if (!this.shown) {
      this.shown = { values: p.painter.shownLevels(this.levels, DARKNESS.cell).values, levels: this.levels.slice() };
    } else {
      const changed = [...reshaped];
      for (let i = 0; i < this.levels.length; i++) if (this.levels[i] !== this.shown.levels[i]) changed.push(i);
      if (changed.length === 0) return;
      let area: PixelRect | null = null;
      for (const index of changed) {
        const { q, r } = p.grid.hexAt(index);
        const around = p.painter.squaresAround(q, r, DARKNESS.cell);
        area = area ? { x0: Math.min(area.x0, around.x0), y0: Math.min(area.y0, around.y0), x1: Math.max(area.x1, around.x1), y1: Math.max(area.y1, around.y1) } : around;
      }
      p.painter.shownLevels(this.levels, DARKNESS.cell, this.shown.values, area!);
      this.shown.levels.set(this.levels);
    }
    let values: Float32Array = this.shown.values;
    // Blurred twice, across then down: soft edges about a third of a hex wide.
    for (let pass = 0; pass < 2; pass++) values = blur(blur(values, width, height, DARKNESS.blur, true), width, height, DARKNESS.blur, false);

    const data = this.darkness.imageData.data;
    for (let i = 0; i < values.length; i++) {
      data[i * 4] = 5;
      data[i * 4 + 1] = 9;
      data[i * 4 + 2] = 10;
      data[i * 4 + 3] = Math.round(values[i]! * 255);
    }
    this.darkness.context.putImageData(this.darkness.imageData, 0, 0);
    this.darkness.refresh();
  }

  // ------------------------------------------------------------ chunks

  private repaint(rects: PixelRect[]): void {
    const p = this.painted;
    // Each chunk is painted once, over the box around everything that changed in it.
    const boxes = new Map<number, PixelRect>();
    for (const rect of rects) {
      const x0 = Math.max(0, rect.x0);
      const y0 = Math.max(0, rect.y0);
      const x1 = Math.min(p.painter.width, rect.x1);
      const y1 = Math.min(p.painter.height, rect.y1);
      for (let cy = Math.floor(y0 / CHUNK); cy * CHUNK < y1; cy++) {
        for (let cx = Math.floor(x0 / CHUNK); cx * CHUNK < x1; cx++) {
          const index = cy * p.chunksAcross + cx;
          const part = { x0: Math.max(x0, cx * CHUNK), y0: Math.max(y0, cy * CHUNK), x1: Math.min(x1, (cx + 1) * CHUNK), y1: Math.min(y1, (cy + 1) * CHUNK) };
          const box = boxes.get(index);
          boxes.set(index, box ? { x0: Math.min(box.x0, part.x0), y0: Math.min(box.y0, part.y0), x1: Math.max(box.x1, part.x1), y1: Math.max(box.y1, part.y1) } : part);
        }
      }
    }
    for (const [index, box] of boxes) {
      let texture = p.chunks.get(index);
      if (!texture) {
        texture = this.scene.textures.createCanvas(`map_ground_chunk_${index}`, CHUNK, CHUNK)!;
        useDensity(texture, HD_DENSITY);
        p.chunks.set(index, texture);
        this.showChunk(index, texture);
      }
      const left = (index % p.chunksAcross) * CHUNK;
      const top = Math.floor(index / p.chunksAcross) * CHUNK;
      p.painter.paint(box, { width: CHUNK, height: CHUNK, data: texture.imageData.data }, left, top);
      texture.context.putImageData(texture.imageData, 0, 0, box.x0 - left, box.y0 - top, box.x1 - box.x0, box.y1 - box.y0);
      texture.refresh();
    }
  }

  private showChunk(index: number, texture: Phaser.Textures.CanvasTexture): void {
    const p = this.painted;
    const { x, y } = this.toWorld((index % p.chunksAcross) * CHUNK, Math.floor(index / p.chunksAcross) * CHUNK);
    this.chunkImages.set(index, this.scene.add.image(x, y, texture).setOrigin(0, 0).setDepth(this.depths.ground));
  }

  // ------------------------------------------------------------ rock at the edges of open ground

  /**
   * Gives a rock hex its own sorted picture when the hydra knows it and it borders open ground (where something can
   * stand behind it), repaints it when it changed, and takes it away when it is no longer such rock.
   */
  private syncBlock(hexIndex: number): void {
    const p = this.painted;
    const { q, r } = p.grid.hexAt(hexIndex);
    const wanted =
      p.grid.rock[hexIndex] === 1 &&
      p.grid.known[hexIndex] === 1 &&
      hexNeighbors({ q, r }).some((n) => {
        const i = p.grid.index(n.q, n.r);
        return i >= 0 && p.grid.texture[i]! >= 0 && p.grid.rock[i] === 0;
      });
    const block = p.blocks.get(hexIndex);
    if (!wanted) {
      if (block) {
        this.blockImages.get(hexIndex)?.destroy();
        this.blockImages.delete(hexIndex);
        p.sheets[block.sheet]!.remove(block.frame);
        p.freeSlots.push({ sheet: block.sheet, slot: block.slot });
        p.blocks.delete(hexIndex);
      }
      return;
    }
    if (block) {
      this.paintBlock(hexIndex, block);
      return;
    }
    const place = p.freeSlots.pop() ?? newSheet(this.scene, p);
    const { width, height, across } = p.slotSize;
    const frame = `rock_${hexIndex}`;
    const added = p.sheets[place.sheet]!.add(frame, 0, (place.slot % across) * width, Math.floor(place.slot / across) * height, width, height)!;
    added.setTrim(width / HD_DENSITY, height / HD_DENSITY, 0, 0, width / HD_DENSITY, height / HD_DENSITY);
    const rect = p.painter.hexRect(q, r);
    const made: Block = { sheet: place.sheet, slot: place.slot, frame, rect: { ...rect, x1: rect.x0 + width, y1: rect.y0 + height } };
    p.blocks.set(hexIndex, made);
    this.paintBlock(hexIndex, made);
    this.showBlock(hexIndex, made);
  }

  private paintBlock(hexIndex: number, block: Block): void {
    const p = this.painted;
    const sheet = p.sheets[block.sheet]!;
    const { width, height, across } = p.slotSize;
    const slotX = (block.slot % across) * width;
    const slotY = Math.floor(block.slot / across) * height;
    const data = sheet.imageData.data;
    for (let y = slotY; y < slotY + height; y++) data.fill(0, (y * SHEET + slotX) * 4, (y * SHEET + slotX + width) * 4);
    p.painter.paint(block.rect, { width: SHEET, height: SHEET, data }, block.rect.x0 - slotX, block.rect.y0 - slotY, hexIndex);
    sheet.context.putImageData(sheet.imageData, 0, 0, slotX, slotY, width, height);
    this.changedSheets.add(block.sheet);
  }

  private showBlock(hexIndex: number, block: Block): void {
    const p = this.painted;
    const { q, r } = p.grid.hexAt(hexIndex);
    const { x, y } = this.toWorld(block.rect.x0, block.rect.y0);
    // Sorted like the old rock tiles: by the front edge of its hex.
    const front = hexToPixel(this.layout, { q, r }).y + MAP_TILE.faceHeight / 2;
    const image = this.scene.add.image(x, y, p.sheets[block.sheet]!, block.frame).setOrigin(0, 0).setDepth(this.depths.standing(front));
    this.blockImages.set(hexIndex, image);
  }

  /** World position (screen units) of a pixel of the painted ground. */
  private toWorld(x: number, y: number): { x: number; y: number } {
    const origin = this.painted.painter.origin;
    return { x: origin.x + x / HD_DENSITY, y: origin.y + y / HD_DENSITY };
  }
}

// ------------------------------------------------------------ setting up and clearing away

function prepare(scene: Phaser.Scene, map: HexMap, data: GameData, layout: HexLayout, seed: number): Painted {
  // Textures: each biome's grounds and its rock, read at the density they were loaded with.
  const textures: GroundTexture[] = [];
  const textureIndex = new Map<string, number>();
  for (const [biome, def] of Object.entries(data.biomes.biomes)) {
    const keys: Array<[string, GroundTexture['kind']]> = [
      ...Object.keys(def.ground).map((terrain): [string, GroundTexture['kind']] => [groundTextureKey(biome, terrain), terrain === 'water' ? 'water' : 'ground']),
      [rockTextureKey(biome), 'rock'],
    ];
    for (const [key, kind] of keys) {
      textureIndex.set(key, textures.length);
      const colour = kind === 'rock' ? def.colors.rock : kind === 'water' ? def.colors.water : def.colors.ground;
      textures.push({ kind, pixels: scene.textures.exists(key) && (data.manifest.images[key]?.file ?? null) !== null ? readPixels(scene, key) : flat(colour) });
    }
  }

  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const tile of map.tiles.values()) {
    const { x, y } = hexToPixel(layout, tile.hex);
    [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
  }
  const originX = Math.floor(minX - MARGIN);
  const originY = Math.floor(minY - MARGIN - MAP_ROCK_LIFT);
  const width = Math.ceil((maxX - originX + MARGIN) * HD_DENSITY);
  const height = Math.ceil((maxY - originY + MARGIN) * HD_DENSITY);
  // The grid reaches past every corner of the painted ground, with room to look a few hexes around any of its pixels.
  let radius = 0;
  for (const [x, y] of [[originX, originY], [originX + width / HD_DENSITY, originY], [originX, originY + height / HD_DENSITY], [originX + width / HD_DENSITY, originY + height / HD_DENSITY]] as const) {
    const { q, r } = pixelToHex(layout, x, y);
    radius = Math.max(radius, Math.abs(q) + 3, Math.abs(r) + 3);
  }
  const grid = new HexGrid(radius);
  const painter = new GroundPainter({ layout, density: HD_DENSITY, lift: MAP_ROCK_LIFT, originX, originY, width, height, seed }, grid, textures);
  const sample = painter.hexRect(0, 0);
  // Room for the biggest rect any hex gets (rounding can make one a pixel wider).
  const slot = { width: sample.x1 - sample.x0 + 1, height: sample.y1 - sample.y0 + 1 };
  const across = Math.floor(SHEET / slot.width);
  return {
    map,
    grid,
    painter,
    chunksAcross: Math.ceil(width / CHUNK),
    chunks: new Map(),
    sheets: [],
    freeSlots: [],
    slotSize: { ...slot, across, perSheet: across * Math.floor(SHEET / slot.height) },
    blocks: new Map(),
    textureIndex,
    started: false,
  };
}

/** A new sheet for rock pictures; returns its first free slot (the others become free slots). */
function newSheet(scene: Phaser.Scene, p: Painted): { sheet: number; slot: number } {
  const sheet = p.sheets.length;
  const texture = scene.textures.createCanvas(`map_ground_rock_${sheet}`, SHEET, SHEET)!;
  useDensity(texture, HD_DENSITY);
  p.sheets.push(texture);
  for (let slot = p.slotSize.perSheet - 1; slot >= 1; slot--) p.freeSlots.push({ sheet, slot });
  return { sheet, slot: 0 };
}

function forget(scene: Phaser.Scene, p: Painted): void {
  for (const texture of [...p.chunks.values(), ...p.sheets]) scene.textures.remove(texture);
}

/** How a hex looks: a closed threshold shows the floor it will have (its obstacle stands on it); a hidden one is rock. */
function lookOf(tile: Tile, textureIndex: Map<string, number>): HexLook {
  const object = tile.object;
  const terrain = object?.kind === 'threshold' && object.state !== 'hidden' ? object.floor : tile.terrain;
  const key = terrain === 'rock' ? rockTextureKey(tile.biome) : groundTextureKey(tile.biome, terrain);
  return { texture: textureIndex.get(key) ?? 0, rock: terrain === 'rock' };
}

/** A box blur along rows (`across`) or columns. Values beyond the edge count as the edge's own. */
function blur(values: Float32Array, width: number, height: number, radius: number, across: boolean): Float32Array<ArrayBuffer> {
  const out = new Float32Array(values.length);
  const [length, lines, step, lineStep] = across ? [width, height, 1, width] : [height, width, width, 1];
  for (let line = 0; line < lines; line++) {
    const start = line * lineStep;
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += values[start + Math.min(length - 1, Math.max(0, i + k)) * step]!;
      out[start + i * step] = sum / (2 * radius + 1);
    }
  }
  return out;
}

/** A one-colour texture, for a biome whose texture has no picture yet. */
function flat(hex: string): GroundTexture['pixels'] {
  const value = Number.parseInt(hex.slice(1), 16);
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (value >> 16) & 255;
    data[i + 1] = (value >> 8) & 255;
    data[i + 2] = value & 255;
    data[i + 3] = 255;
  }
  return { width: 4, height: 4, data };
}
