// Strategic map: the underground seen from a slant (like the battle board), drawn from the run state.
// Ground tiles in each biome's look, rock raised into blocks, decorations in clumps, and things standing on their hexes:
// the lair, encounters, shrines, places, thresholds and finds. Hints float over known hexes: draughts near hidden
// thresholds, and echoes at the edge of the known map. Drag to look around; tap a highlighted hex to move there,
// a closed threshold to go and deal with it, and the place the hydra stands on to open its panel.

import * as Phaser from 'phaser';
import { GLOWING_DECORATIONS, MAP_COLUMN_WIDTH, MAP_FEET_BELOW_HEX_CENTER, MAP_GATE_FEET_BELOW_HEX_CENTER, MAP_ROCK_LIFT, MAP_ROW_HEIGHT, MAP_TILE } from '../assets/mapArt';
import type { DecorationKind } from '../assets/mapArt';
import { tileVariant } from '../assets/terrainTiles';
import { hex, hexDistance, hexEquals, hexKey, hexNeighbors, hexToPixel, pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import type { MapObject, Tile } from '../sim/map';
import { Rng } from '../sim/rng';
import { encountersRevealed, knownDraughts } from '../sim/turn';
import type { RunEvent } from '../sim/turn';
import { SCREEN } from '../scaling';
import { exposeInspectable, exposeReachable, exposeRunSummary, markReady } from '../testHooks';
import { color, getContext } from './context';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { SceneKey } from './sceneKeys';
import { pageScale, pinnedToScreen, viewScale } from './view';

const LAYOUT: HexLayout = { columnWidth: MAP_COLUMN_WIDTH, rowHeight: MAP_ROW_HEIGHT, originX: 0, originY: 0 };
const WORLD_MARGIN = 60;
/** Pointer must move this far (in screen units) before a press counts as a drag, not a tap. */
const DRAG_THRESHOLD = 6;
const STEP_DURATION_MS = 130;
/** A current carries the hydra faster than it walks. */
const CARRIED_STEP_MS = 80;
/** Below this page zoom (small screens, e.g. phones) the map camera zooms in 2×, so hexes are big enough for fingers. */
const SMALL_SCREEN_ZOOM = 2;
/** Hexes seen before but out of sight now are drawn this much darker. */
const REMEMBERED_TINT = 0x808080;
/** A shrine that has given its blessing, remains already searched. */
const SPENT_TINT = 0x5a5a5a;
/** Encounters the mycelium tells about, out of sight: drawn faint, in its colour. */
const WHISPERED_TINT = 0xc89ad8;
const WHISPERED_ALPHA = 0.55;
const BIOME_LABEL_MS = 2600;
/**
 * A landmark at least this tall (pixels) turns see-through while it stands in front of the hydra, a closed threshold,
 * an encounter or a shrine. `inset` is how much of its width, on each side, is left out when checking (empty air).
 */
const SEE_THROUGH = { minHeight: 40, alpha: 0.55, inset: 0.25 } as const;
/** Open thresholds lie flat on their floor, except these, which stand (the timber frame of the Old Workings). */
const STANDING_OPEN_THRESHOLDS: readonly string[] = ['oldWorkings'];

// Ground lies flat at the bottom; everything that stands up is sorted by how low on the screen it stands.
const DEPTH = { ground: 0, decal: 4, mark: 5, standing: 10, glow: 30, fogEdge: 35, hint: 40 } as const;

/** Lights over places: colour, size, brightness, and how high above the feet. */
const PLACE_GLOWS: Readonly<Record<string, { tint: string; scale: number; alpha: number; height: number }>> = {
  drownedChapel: { tint: '#7fd0e0', scale: 0.9, alpha: 0.4, height: 40 },
  ossuaryCathedral: { tint: '#e0b060', scale: 0.9, alpha: 0.45, height: 34 },
  saltSaint: { tint: '#f0d8d0', scale: 0.8, alpha: 0.35, height: 40 },
  motherCap: { tint: '#c65bd6', scale: 1.4, alpha: 0.55, height: 30 },
  undertow: { tint: '#7fd0e0', scale: 0.6, alpha: 0.4, height: 6 },
  brineLake: { tint: '#e0f0f0', scale: 0.7, alpha: 0.3, height: 6 },
  ninefoldCamp: { tint: '#e0782c', scale: 0.6, alpha: 0.55, height: 10 },
  myceliumWhisper: { tint: '#c65bd6', scale: 0.7, alpha: 0.5, height: 6 },
  silentBell: { tint: '#7fe0d6', scale: 0.6, alpha: 0.3, height: 26 },
  hushedStair: { tint: '#7fe0d6', scale: 0.8, alpha: 0.45, height: 20 },
};

/** Decorations come in clumps around an anchor hex (a ring of mushrooms, a heap of bones), not sprinkled evenly. */
const CLUMP = { pieces: [3, 7] as const, perChamberHexes: 9, loneChance: 0.12, favouriteShare: 0.7 };

type Glow = { image: Phaser.GameObjects.Image; alpha: number };

/** Everything drawn for one hex, so it can be shown, dimmed, redrawn or hidden together. */
interface HexView {
  tile: Tile;
  groundKey: string;
  ground: Phaser.GameObjects.Image;
  props: Phaser.GameObjects.Image[];
  propGlows: Glow[];
  objectKey: string | null;
  object: Phaser.GameObjects.Image | null;
  objectGlows: Glow[];
  mark: Phaser.GameObjects.Image | null;
  fogEdge: Phaser.GameObjects.Image;
}

export class MapScene extends Phaser.Scene {
  private run!: RunController;
  private views = new Map<string, HexView>();
  private token!: Phaser.GameObjects.Image;
  private animating = false;
  private press: { x: number; y: number; dragging: boolean } | null = null;
  /** Catches presses on the map: it covers the whole screen, which depends on the camera's zoom. */
  private inputZone!: Phaser.GameObjects.Zone;
  /** Biome names waiting to be shown, one after another (two at once would overlap). */
  private biomeNames: string[] = [];
  private showingBiomeName = false;
  /** Draught wisps and echo marks on the map, by hex key. */
  private draughts = new Map<string, Phaser.GameObjects.Image>();
  private echoes = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super(SceneKey.Map);
  }

  create(): void {
    const firstTime = !getRun(this);
    this.run = getRun(this) ?? startNewRun(this);
    const { near, reveal } = getContext(this).params;
    if (firstTime && near) this.run.placeNear(near);
    if (firstTime && reveal) this.run.revealAll();
    this.views = new Map();
    this.draughts = new Map();
    this.echoes = new Map();
    this.animating = false;
    this.run.animating = false;
    this.press = null;
    this.biomeNames = [];
    this.showingBiomeName = false;
    this.cameras.main.setBackgroundColor(color(getContext(this).data.palette.underground.black));

    this.drawMap();
    this.token = this.add.image(0, 0, 'map_hydra').setOrigin(0.5, 1);
    this.placeToken(this.run.state.hydra.position);
    this.setUpCamera();
    this.setUpInput();
    const onResize = (): void => this.fitCameraZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    const onChanged = (): void => {
      if (!this.animating) this.refresh();
    };
    const onEvents = (events: RunEvent[]): void => this.animate(events);
    this.run.on('changed', onChanged);
    this.run.on('events', onEvents);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.run.off('changed', onChanged);
      this.run.off('events', onEvents);
    });

    this.refresh();
    this.scene.launch(SceneKey.Hud);
    this.exposeTestHooks();
    markReady(SceneKey.Map);
  }

  // ------------------------------------------------------------ building the map

  private drawMap(): void {
    const clumps = this.planClumps();
    for (const tile of this.run.state.map.tiles.values()) {
      const { x, y } = hexToPixel(LAYOUT, tile.hex);
      const fogEdge = this.add.image(x, y, 'map_fog_edge').setDepth(DEPTH.fogEdge).setVisible(false);
      fogEdge.setOrigin(0.5, MAP_TILE.faceHeight / 2 / fogEdge.height);
      const groundKey = this.groundKey(tile);
      const view: HexView = {
        tile,
        groundKey,
        ground: this.makeGround(tile, groundKey),
        props: [],
        propGlows: [],
        objectKey: null,
        object: null,
        objectGlows: [],
        mark: null,
        fogEdge,
      };
      if (tile.terrain !== 'rock' && !tile.object) this.decorate(view, x, y, clumps.get(hexKey(tile.hex)));
      this.views.set(hexKey(tile.hex), view);
      this.syncObject(view);
    }
  }

  /** The same map always looks the same: each hex picks its tile variant and decorations from this. */
  private hexSeed(h: Hex): number {
    return (getContext(this).seed ^ Math.imul(h.q + 64, 73856093) ^ Math.imul(h.r + 64, 19349663)) >>> 0;
  }

  /** Ground of a hex as drawn: a closed threshold is drawn as the floor it will have, with its obstacle on it. */
  private groundKey(tile: Tile): string {
    const object = tile.object;
    const terrain = object?.kind === 'threshold' && object.state === 'closed' ? object.floor : tile.terrain;
    return terrain === 'rock' ? `map_rock_${tile.biome}` : `map_ground_${tile.biome}_${terrain}`;
  }

  private makeGround(tile: Tile, key: string): Phaser.GameObjects.Image {
    const { x, y } = hexToPixel(LAYOUT, tile.hex);
    const rock = key.startsWith('map_rock_');
    const ground = this.add.image(x, y, tileVariant(this.textures, key, this.hexSeed(tile.hex)));
    // The image's anchor is the middle of the hex face (for rock: of the hex it stands on, below the raised top).
    const faceMiddle = MAP_TILE.faceHeight / 2 + (rock ? MAP_ROCK_LIFT : 0);
    ground.setOrigin(0.5, faceMiddle / ground.height);
    ground.setDepth(rock ? this.standingDepth(y + MAP_TILE.faceHeight / 2) : DEPTH.ground + y / 10000);
    return ground;
  }

  /**
   * Anchors of decoration clumps, and what grows at each hex near one: a few per chamber, sometimes one in a corridor.
   * Each clump has a favourite kind from its biome's list, so it reads as one thing (a ring of mushrooms, a bone heap).
   */
  private planClumps(): Map<string, DecorationKind[]> {
    const { biomes } = getContext(this).data;
    const { map } = this.run.state;
    const rng = new Rng(this.hexSeed(map.lair) ^ 0xdec0);
    const anchors: Hex[] = [];
    for (const chamber of map.layout.chambers) {
      const count = Math.max(1, Math.round(chamber.hexes.length / CLUMP.perChamberHexes));
      for (let i = 0; i < count; i++) anchors.push(rng.pick(chamber.hexes));
    }
    const openTiles = [...map.tiles.values()].filter((t) => t.terrain !== 'rock' && t.region === 'ring');
    for (const tile of openTiles) if (rng.chance(CLUMP.loneChance / 6)) anchors.push(tile.hex);

    const pieces = new Map<string, DecorationKind[]>();
    for (const anchor of anchors) {
      const kinds = biomes.biomes[map.tiles.get(hexKey(anchor))?.biome ?? '']?.decorations ?? [];
      if (kinds.length === 0) continue;
      const favourite = rng.pick(kinds);
      const spots = [anchor, ...hexNeighbors(anchor)].filter((h) => {
        const t = map.tiles.get(hexKey(h));
        return t !== undefined && t.terrain !== 'rock' && t.object === null;
      });
      if (spots.length === 0) continue;
      const count = rng.int(CLUMP.pieces[0], CLUMP.pieces[1]);
      for (let i = 0; i < count; i++) {
        // Most pieces land on the anchor itself; the rest spill onto the hexes around it.
        const spot = i < 2 ? spots[0]! : rng.pick(spots);
        const list = pieces.get(hexKey(spot)) ?? [];
        if (list.length >= 3) continue;
        list.push(rng.chance(CLUMP.favouriteShare) ? favourite : rng.pick(kinds));
        pieces.set(hexKey(spot), list);
      }
    }
    return pieces;
  }

  /** Decorations on an open hex: its share of a clump, or now and then a lone one from the biome's list. */
  private decorate(view: HexView, x: number, y: number, clump: DecorationKind[] | undefined): void {
    const biome = getContext(this).data.biomes.biomes[view.tile.biome];
    if (!biome || biome.decorations.length === 0) return;
    const rng = new Rng(this.hexSeed(view.tile.hex));
    const kinds = clump ?? (rng.chance(CLUMP.loneChance) ? [rng.pick(biome.decorations)] : []);
    for (let kind of kinds) {
      // Only reeds grow out of water.
      if (view.tile.terrain === 'water' && kind !== 'reeds') {
        if (!biome.decorations.includes('reeds')) continue;
        kind = 'reeds';
      }
      const px = x + rng.int(-9, 9);
      const py = y + rng.int(-4, 5);
      view.props.push(this.add.image(px, py, `map_deco_${kind}`).setOrigin(0.5, 1).setDepth(this.standingDepth(py)));
      if (GLOWING_DECORATIONS.includes(kind)) view.propGlows.push(this.glow(px, py - 9, biome.colors.glow, 0.55, 0.5));
    }
  }

  /** Image key of an object as it is now, or null when nothing is drawn (a hidden threshold looks like plain rock). */
  private objectKey(object: MapObject | null): string | null {
    if (!object) return null;
    switch (object.kind) {
      case 'encounter':
        return `map_encounter_${Math.min(3, object.tier)}`;
      case 'muck':
      case 'moisture':
        return object.rich ? `map_${object.kind}_rich` : `map_${object.kind}`;
      case 'threshold':
        return object.state === 'hidden' ? null : object.state === 'closed' ? `map_threshold_${object.thresholdId}` : `map_threshold_${object.thresholdId}_open`;
      case 'place':
        return `map_place_${object.placeId}`;
      default:
        return `map_${object.kind}`;
    }
  }

  /** Redraws the object on a hex if it has changed (taken, opened...), with its light if it has one. */
  private syncObject(view: HexView): void {
    const object = view.tile.object;
    const key = this.objectKey(object);
    if (key === view.objectKey) return;
    view.object?.destroy();
    for (const glow of view.objectGlows.splice(0)) glow.image.destroy();
    view.object = null;
    view.objectKey = key;
    if (!object || !key) return;

    const { palette } = getContext(this).data;
    const { x, y } = hexToPixel(LAYOUT, view.tile.hex);
    if (object.kind === 'threshold' && object.state === 'open' && !STANDING_OPEN_THRESHOLDS.includes(object.thresholdId)) {
      // An open threshold lies flat on its floor, under whatever walks over it.
      view.object = this.add.image(x, y + MAP_GATE_FEET_BELOW_HEX_CENTER, key).setOrigin(0.5, 1).setDepth(DEPTH.decal);
      return;
    }
    const feet = object.kind === 'lair' ? y + 9 : object.kind === 'threshold' ? y + MAP_GATE_FEET_BELOW_HEX_CENTER : y + MAP_FEET_BELOW_HEX_CENTER;
    view.object = this.add.image(x, feet, key).setOrigin(0.5, 1).setDepth(this.standingDepth(feet));
    const light = (tint: string, scale: number, alpha: number, height: number) => view.objectGlows.push(this.glow(x, feet - height, tint, scale, alpha));
    if (object.kind === 'lair') light(palette.underground.bioluminescence, 1.3, 0.45, 9);
    if (object.kind === 'shrine' && !object.used) light('#7fe0d6', 0.9, 0.55, 40);
    if (object.kind === 'moisture') light('#7fd0e0', object.rich ? 0.7 : 0.5, 0.45, 6);
    if (object.kind === 'passage') light('#d0e4dc', 0.8, 0.35, 8);
    if (object.kind === 'encounter' && object.tier >= 3) view.objectGlows.push(this.glow(x + 12, feet - 18, palette.order.orange, 0.6, 0.6));
    if (object.kind === 'threshold' && object.thresholdId === 'smoulderingSeam') light(palette.order.orange, 0.6, 0.5, 8);
    if (object.kind === 'place') {
      const glow = PLACE_GLOWS[object.placeId];
      if (glow) light(glow.tint, glow.scale, glow.alpha, glow.height);
    }
  }

  private glow(x: number, y: number, tint: string, scale: number, alpha: number): Glow {
    const image = this.add.image(x, y, 'map_glow').setTint(color(tint)).setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow);
    return { image, alpha };
  }

  private standingDepth(feetY: number): number {
    return DEPTH.standing + feetY / 1000;
  }

  // ------------------------------------------------------------ keeping it up to date

  /** Brings every hex in line with the run state: what is known, what changed, where the hydra can go, and the hints. */
  private refresh(): void {
    const { map, visibility } = this.run.state;
    const whispered = encountersRevealed(this.run.state, this.run.rules);
    for (const [key, view] of this.views) {
      const state = visibility.get(key);
      const known = state !== undefined;
      const tint = state === 'remembered' ? REMEMBERED_TINT : 0xffffff;
      const groundKey = this.groundKey(view.tile);
      if (groundKey !== view.groundKey) {
        // A hidden threshold found, a closed one opened: the hex is ground now.
        view.ground.destroy();
        view.ground = this.makeGround(view.tile, groundKey);
        view.groundKey = groundKey;
      }
      this.syncObject(view);
      for (const image of [view.ground, ...view.props]) image.setVisible(known).setTint(tint);
      for (const glow of view.propGlows) glow.image.setVisible(known).setAlpha(state === 'remembered' ? glow.alpha * 0.4 : glow.alpha);

      const object = view.tile.object;
      const spent = (object?.kind === 'shrine' && object.used) || (object?.kind === 'remains' && object.looted);
      if (view.object) {
        // The mycelium tells where the Order's people are, even out of sight.
        const ghost = whispered && object?.kind === 'encounter' && state !== 'visible';
        view.object
          .setVisible(known || ghost)
          .setTint(ghost ? WHISPERED_TINT : spent ? SPENT_TINT : tint)
          .setAlpha(ghost ? WHISPERED_ALPHA : 1);
      }
      for (const glow of view.objectGlows) glow.image.setVisible(known && !spent).setAlpha(state === 'remembered' ? glow.alpha * 0.4 : glow.alpha);
      // Known hexes at the edge of the unknown fade into the dark.
      const edge = known && hexNeighbors(view.tile.hex).some((n) => map.tiles.has(hexKey(n)) && !visibility.has(hexKey(n)));
      view.fogEdge.setVisible(edge).setAlpha(0.55);
      view.mark?.setVisible(false);
    }
    if (!this.run.state.pendingBattle) {
      for (const key of this.run.reachable().keys()) {
        const view = this.views.get(key);
        if (view) this.markOf(view).setVisible(true).setAlpha(0.75);
      }
    }
    this.seeThroughTallPlaces();
    this.refreshHints();
    this.announceNewBiomes();
  }

  /** Tall landmarks turn see-through where they would hide the hydra or something it needs to see. */
  private seeThroughTallPlaces(): void {
    const behind: Phaser.GameObjects.Image[] = [this.token];
    const tall: Phaser.GameObjects.Image[] = [];
    for (const view of this.views.values()) {
      const object = view.tile.object;
      if (!object || !view.object?.visible) continue;
      if (object.kind === 'place' && view.object.height >= SEE_THROUGH.minHeight) tall.push(view.object);
      else if (object.kind === 'encounter' || object.kind === 'shrine' || (object.kind === 'threshold' && object.state === 'closed')) behind.push(view.object);
    }
    for (const image of tall) {
      const bounds = image.getBounds();
      Phaser.Geom.Rectangle.Inflate(bounds, -bounds.width * SEE_THROUGH.inset, 0);
      const hides = behind.some((other) => other.depth < image.depth && Phaser.Geom.Intersects.RectangleToRectangle(bounds, other.getBounds()));
      image.setAlpha(hides ? SEE_THROUGH.alpha : 1);
    }
  }

  /** The outline showing the hydra can go to a hex; made when first needed (a threshold can open into a new way). */
  private markOf(view: HexView): Phaser.GameObjects.Image {
    if (!view.mark) {
      const { x, y } = hexToPixel(LAYOUT, view.tile.hex);
      view.mark = this.add.image(x, y, 'map_mark').setDepth(DEPTH.mark).setTint(color(getContext(this).data.palette.underground.bioluminescence));
    }
    return view.mark;
  }

  /** Draughts drift over hexes next to hidden thresholds; echoes pulse where they were heard, until their source is seen. */
  private refreshHints(): void {
    const { state } = this.run;
    const draughtKeys = new Set<string>();
    for (const h of knownDraughts(state)) {
      const key = hexKey(h);
      draughtKeys.add(key);
      if (this.draughts.has(key)) continue;
      const { x, y } = hexToPixel(LAYOUT, h);
      const wisp = this.add.image(x, y - 4, 'map_draught').setDepth(DEPTH.hint).setAlpha(0);
      this.tweens.add({ targets: wisp, alpha: { from: 0.45, to: 1 }, x: x + 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (Math.abs(h.q * 7 + h.r * 3) % 5) * 200 });
      this.draughts.set(key, wisp);
    }
    for (const [key, wisp] of this.draughts) {
      if (draughtKeys.has(key)) continue;
      this.tweens.killTweensOf(wisp);
      wisp.destroy();
      this.draughts.delete(key);
    }

    const echoKeys = new Set<string>();
    for (const echo of state.echoes) {
      if (state.visibility.has(hexKey(echo.source))) continue;
      const key = hexKey(echo.mark);
      echoKeys.add(key);
      if (this.echoes.has(key)) continue;
      const { x, y } = hexToPixel(LAYOUT, echo.mark);
      const mark = this.add.image(x, y - 16, 'map_echo').setDepth(DEPTH.hint);
      this.tweens.add({ targets: mark, alpha: { from: 0.35, to: 1 }, y: y - 19, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.echoes.set(key, mark);
    }
    for (const [key, mark] of this.echoes) {
      if (echoKeys.has(key)) continue;
      this.tweens.killTweensOf(mark);
      mark.destroy();
      this.echoes.delete(key);
    }
  }

  /** The first time the hydra sees a biome other than its own swamp, the biome's name comes up. */
  private announceNewBiomes(): void {
    const { biomes } = getContext(this).data;
    const { map, visibility } = this.run.state;
    for (const [key, state] of visibility) {
      if (state !== 'visible') continue;
      const biomeId = map.tiles.get(key)!.biome;
      if (this.run.knownBiomes.has(biomeId)) continue;
      this.run.knownBiomes.add(biomeId);
      const name = biomes.biomes[biomeId]?.displayName;
      if (name && biomeId !== biomes.lairBiome) this.biomeNames.push(name);
    }
    this.showNextBiomeName();
  }

  private showNextBiomeName(): void {
    const name = this.biomeNames.shift();
    if (name === undefined || this.showingBiomeName) {
      if (name !== undefined) this.biomeNames.unshift(name);
      return;
    }
    this.showingBiomeName = true;
    // The camera zooms even what doesn't scroll (2× on phones), so the label is placed and sized to undo that.
    // Low on the screen, clear of the HUD's messages at the top.
    const at = pinnedToScreen(this, SCREEN.width / 2, SCREEN.height - 64);
    const label = this.add
      .text(at.x, at.y, name, { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8e0d0', backgroundColor: '#05090acc', padding: { x: 8, y: 3 } })
      .setOrigin(0.5, 0)
      .setScale(at.scale)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);
    this.tweens.chain({
      targets: label,
      tweens: [
        { alpha: 1, duration: 400 },
        { alpha: 1, duration: BIOME_LABEL_MS - 900 },
        { alpha: 0, duration: 500 },
      ],
      onComplete: () => {
        label.destroy();
        this.showingBiomeName = false;
        this.showNextBiomeName();
      },
    });
  }

  /** Walks (or floats, carried by a current) the hydra along the path it took, then shows the new state. */
  private animate(events: RunEvent[]): void {
    const steps: Array<{ x: number; y: number; duration: number }> = [];
    for (const event of events) {
      if (event.type === 'moved') steps.push(...event.path.map((h) => ({ ...this.tokenPosition(h), duration: STEP_DURATION_MS })));
      if (event.type === 'carried') steps.push(...event.path.map((h) => ({ ...this.tokenPosition(h), duration: CARRIED_STEP_MS })));
    }
    const revealed = events.find((e) => e.type === 'thresholdRevealed');
    if (steps.length === 0) {
      if (revealed) this.panTo(revealed.at);
      return;
    }
    this.animating = true;
    this.run.animating = true;
    for (const view of this.views.values()) view.mark?.setVisible(false);
    this.tweens.chain({
      targets: this.token,
      tweens: steps,
      onUpdate: () => this.token.setDepth(this.standingDepth(this.token.y) + 0.0005),
      onComplete: () => {
        this.animating = false;
        if (this.run.state.pendingBattle) {
          this.run.animating = false;
          this.startBattle();
          return;
        }
        this.refresh();
        this.panTo(revealed?.at ?? this.run.state.hydra.position);
        this.run.settle();
      },
    });
  }

  private startBattle(): void {
    this.cameras.main.flash(250, 158, 35, 35);
    this.time.delayedCall(250, () => {
      this.scene.stop(SceneKey.Hud);
      this.scene.start(SceneKey.Battle);
    });
  }

  private tokenPosition(h: Hex): { x: number; y: number } {
    const { x, y } = hexToPixel(LAYOUT, h);
    return { x, y: y + MAP_FEET_BELOW_HEX_CENTER };
  }

  private placeToken(h: Hex): void {
    const { x, y } = this.tokenPosition(h);
    this.token.setPosition(x, y).setDepth(this.standingDepth(y) + 0.0005);
  }

  // ------------------------------------------------------------ camera

  private setUpCamera(): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const tile of this.run.state.map.tiles.values()) {
      const { x, y } = hexToPixel(LAYOUT, tile.hex);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const cam = this.cameras.main;
    cam.setBounds(minX - WORLD_MARGIN, minY - WORLD_MARGIN, maxX - minX + WORLD_MARGIN * 2, maxY - minY + WORLD_MARGIN * 2);
    cam.setRoundPixels(true);
    this.fitCameraZoom();
  }

  private fitCameraZoom(): void {
    const cam = this.cameras.main;
    const zoom = getContext(this).params.zoom ?? (pageScale(this) < SMALL_SCREEN_ZOOM ? 2 : 1);
    // In HD the camera also zooms the 640×360 screen up to the canvas's resolution.
    cam.setZoom(zoom * viewScale(this));
    const { x, y } = hexToPixel(LAYOUT, this.run.state.hydra.position);
    cam.centerOn(x, y);
    this.coverScreen();
  }

  /** Stretches the input zone over the whole screen, whatever the camera's zoom. */
  private coverScreen(): void {
    if (!this.inputZone) return;
    const corner = pinnedToScreen(this, 0, 0);
    this.inputZone.setPosition(corner.x, corner.y).setSize(SCREEN.width * corner.scale, SCREEN.height * corner.scale);
  }

  private panTo(h: Hex): void {
    const { x, y } = hexToPixel(LAYOUT, h);
    this.cameras.main.pan(x, y, 300, 'Sine.easeOut');
  }

  /** Moves the view to a hex (used by the minimap). */
  lookAt(h: Hex): void {
    this.panTo(h);
  }

  // ------------------------------------------------------------ input

  /** Can a tap on this hex open something: a closed threshold the hydra knows, or the place it stands on? */
  private inspectable(h: Hex): boolean {
    const { map, visibility, hydra } = this.run.state;
    const key = hexKey(h);
    const object = map.tiles.get(key)?.object;
    if (!visibility.has(key)) return false;
    return (object?.kind === 'threshold' && object.state === 'closed') || (object?.kind === 'place' && hexEquals(h, hydra.position));
  }

  private setUpInput(): void {
    // A full-screen zone catches presses on the map. HUD buttons sit in a scene above,
    // so pressing a button never reaches this zone.
    const zone = this.add.zone(0, 0, SCREEN.width, SCREEN.height).setOrigin(0, 0).setScrollFactor(0).setInteractive();
    this.inputZone = zone;
    this.coverScreen();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.press = { x: pointer.x, y: pointer.y, dragging: false };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.press || !pointer.isDown) return;
      if (!this.press.dragging && Phaser.Math.Distance.Between(this.press.x, this.press.y, pointer.x, pointer.y) > DRAG_THRESHOLD * viewScale(this)) {
        this.press.dragging = true;
      }
      if (this.press.dragging) {
        const cam = this.cameras.main;
        cam.stopFollow();
        cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
        cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const press = this.press;
      this.press = null;
      if (!press || press.dragging || this.animating) return;
      // Converted with this scene's camera: pointer.worldX may come from another scene's camera.
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tapped = pixelToHex(LAYOUT, world.x, world.y);
      // Things stand up from their hex, so a tap on their upper part lands on the hex behind: try the hexes in front too.
      const reachable = this.run.reachable();
      const target = [tapped, hex(tapped.q, tapped.r + 1), hex(tapped.q - 1, tapped.r + 1)].find((h) => reachable.has(hexKey(h)) || this.inspectable(h));
      if (!target) return;
      if (reachable.has(hexKey(target))) this.run.moveTo(target);
      else this.run.inspect(target);
    });
  }

  // ------------------------------------------------------------ test hooks

  /** Where a hex is on the 640×360 screen (for tests, which tap in screen units). */
  private onScreen(h: Hex): { x: number; y: number } {
    const cam = this.cameras.main;
    const { x, y } = hexToPixel(LAYOUT, h);
    const k = viewScale(this);
    return { x: ((x - cam.worldView.x) * cam.zoom) / k, y: ((y - cam.worldView.y) * cam.zoom) / k };
  }

  private exposeTestHooks(): void {
    exposeReachable(() => {
      const { map, visibility } = this.run.state;
      return [...this.run.reachable().entries()].map(([key, { cost }]) => {
        const tile = map.tiles.get(key)!;
        const around = [tile.hex, ...hexNeighbors(tile.hex)].flatMap((h) => [h, ...hexNeighbors(h)]);
        const unexploredNear = new Set(around.map(hexKey).filter((k) => map.tiles.has(k) && !visibility.has(k))).size;
        const object = tile.object;
        return {
          ...this.onScreen(tile.hex),
          cost,
          encounter: object?.kind === 'encounter',
          object: object?.kind ?? null,
          id: object?.kind === 'place' ? object.placeId : object?.kind === 'threshold' ? object.thresholdId : null,
          unexploredNear,
        };
      });
    });
    exposeInspectable(() => {
      const { map, hydra } = this.run.state;
      return [...map.tiles.values()]
        .filter((t) => this.inspectable(t.hex))
        .map((t) => ({
          ...this.onScreen(t.hex),
          object: t.object!.kind,
          id: t.object?.kind === 'place' ? t.object.placeId : t.object?.kind === 'threshold' ? t.object.thresholdId : '',
          distance: hexDistance(t.hex, hydra.position),
        }));
    });
    exposeRunSummary(() => {
      const { turn, resources, alert, pendingBattle, pendingShrine, pendingPlace, visibility, hydra, echoes, draughtsFelt } = this.run.state;
      return {
        turn,
        muck: resources.muck,
        moisture: resources.moisture,
        bones: resources.bones,
        alert,
        inBattle: pendingBattle !== null,
        atShrine: pendingShrine !== null,
        atPlace: pendingPlace !== null,
        blessings: hydra.blessings.length,
        explored: visibility.size,
        conditions: hydra.conditions.map((c) => c.id),
        echoes: echoes.length,
        draughts: draughtsFelt.length,
      };
    });
  }
}
