// Strategic map: the underground seen from a slant (like the battle board), drawn from the run state.
// The ground painted as one surface in each biome's look (mapGround.ts, GAME_DESIGN.md §13), rock raised into blocks,
// under soft darkness and light (mapLight.ts), decorations in clumps, and things standing on their hexes:
// the lair, encounters, shrines, places, thresholds and finds. Hints float over known hexes: draughts near hidden
// thresholds, and echoes at the edge of the known map. Drag to look around; tap a highlighted hex to move there,
// a closed threshold to go and deal with it, and the place the hydra stands on to open its panel.
// Things cast soft shadows, and one line goes around where the hydra can go.

import * as Phaser from 'phaser';
import { GLOWING_DECORATIONS, MAP_COLUMN_WIDTH, MAP_FEET_BELOW_HEX_CENTER, MAP_GATE_FEET_BELOW_HEX_CENTER, MAP_ROW_HEIGHT } from '../assets/mapArt';
import type { DecorationKind } from '../assets/mapArt';
import { hex, hexDistance, hexEquals, hexKey, hexNeighbors, hexToPixel, pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import type { MapObject, Tile } from '../sim/map';
import { Rng } from '../sim/rng';
import { encountersRevealed, knownDraughts } from '../sim/turn';
import type { RunEvent } from '../sim/turn';
import { SCREEN } from '../scaling';
import { exposeInspectable, exposeMapBusy, exposeReachable, exposeRunSummary, markReady } from '../testHooks';
import { color, getContext } from './context';
import { hexOutlines, roundCorners } from './hexOutline';
import { MapGround } from './mapGround';
import { LIGHT_TEXTURE, LIGHT_TEXTURE_SIZE, MapLight, SHADOW_TEXTURE, SHADOW_TEXTURE_WIDTH, makeSoftTextures } from './mapLight';
import type { Light } from './mapLight';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { SceneKey } from './sceneKeys';
import { pageScale, pinnedToScreen, viewScale } from './view';
import { FONT } from '../ui/fonts';

const LAYOUT: HexLayout = { columnWidth: MAP_COLUMN_WIDTH, rowHeight: MAP_ROW_HEIGHT, originX: 0, originY: 0 };
const WORLD_MARGIN = 60;
/** Pointer must move this far (in screen units) before a press counts as a drag, not a tap. */
const DRAG_THRESHOLD = 6;
const STEP_DURATION_MS = 130;
/** A current carries the hydra faster than it walks. */
const CARRIED_STEP_MS = 80;
/**
 * The hydra slithers from hex to hex: each step it sways to one side and back (degrees, the other side next step) and
 * stretches up a little (share of its height). Carried by a current, it only rocks a little.
 */
const SLITHER = { sway: 5, stretch: 0.07, carriedSway: 2 } as const;
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
// A faint copy of the reach line lies over all of it, and the light over that, under the glows.
const DEPTH = { ground: 0, shadow: 1, darkness: 2, decal: 4, mark: 5, standing: 10, reachOver: 20, light: 29, glow: 30, hint: 40 } as const;
/**
 * The hydra is sorted as if its feet were this much further forward, so it stands over everything on its own hex
 * (the rim of its lair's pool is 6 px in front of its feet) but still behind the next row (MAP_ROW_HEIGHT further).
 */
const TOKEN_IN_FRONT = 7;

/**
 * The line around everywhere the hydra can go. Corners rounded this many times; a soft glow under a thin line
 * (widths in screen units). The line lies on the ground, so rock in front of it hides it; a faint copy over everything
 * standing keeps its shape visible there.
 */
const REACH_LINE = { rounding: 3, glowWidth: 4, glowAlpha: 0.2, width: 1.25, alpha: 0.9, overWidth: 1, overAlpha: 0.3 } as const;
/**
 * With a mouse: the way to the hex under the pointer, as dots this far apart (starting this far from the hydra),
 * and a ring this big around the hex at its end (screen units).
 */
const PATH_DOTS = { spacing: 6, radius: 1.1, start: 8, ringWidth: 20, ringHeight: 12, alpha: 0.9 } as const;
/** Shadows under things standing on the ground, this share of their width (screen units, within min and max). */
const CONTACT_SHADOW = { share: 0.6, min: 8, max: 40 } as const;
/**
 * A travel plan (as in Heroes): dots to the hex picked, bright as far as the hydra gets this turn and faint after,
 * a bigger dot where each turn ends, and how many turns the journey takes by the ring at its end.
 */
const JOURNEY = { laterAlpha: 0.4, turnEndRadius: 2.2 } as const;
/**
 * Places stand on a wider, fainter patch of shadow too (this share of their width, this dark), so they sit in the
 * ground rather than on it.
 */
const PLACE_FOOTING = { share: 1.15, alpha: 0.55, max: 60 } as const;
/**
 * Things standing in sight are lit a little less than full white, a touch cool, so bright art (salt, bone, stone)
 * sits in the dark of the underground like the ground does. The hydra keeps its own colours.
 */
const AMBIENT_TINT = 0xd4d6de;
/** Decorations that lie flat, with no shadow. */
const FLAT_DECORATIONS: readonly DecorationKind[] = ['puddle'];
/**
 * Light: the hydra's own (reach and colour), how far the light of a glow reaches (times the glow's size) and how
 * strong it is (times the glow's brightness), and the faint light the mycelium gives encounters it tells about.
 */
const LIGHTS = {
  hydra: { radius: 120, color: 0xf4f6e4, strength: 0.24 },
  glowReach: 2.2,
  glowStrength: 0.5,
  whispered: { radius: 24, strength: 0.3 },
} as const;

/** Lights over places: colour, size, brightness, and how high above the feet. */
const PLACE_GLOWS: Readonly<Record<string, { tint: string; scale: number; alpha: number; height: number }>> = {
  drownedChapel: { tint: '#7fd0e0', scale: 0.7, alpha: 0.4, height: 29 },
  ossuaryCathedral: { tint: '#e0b060', scale: 0.7, alpha: 0.45, height: 24 },
  saltSaint: { tint: '#f0d8d0', scale: 0.6, alpha: 0.35, height: 29 },
  motherCap: { tint: '#c65bd6', scale: 1, alpha: 0.55, height: 22 },
  undertow: { tint: '#7fd0e0', scale: 0.6, alpha: 0.4, height: 6 },
  brineLake: { tint: '#e0f0f0', scale: 0.7, alpha: 0.3, height: 6 },
  ninefoldCamp: { tint: '#e0782c', scale: 0.6, alpha: 0.55, height: 10 },
  myceliumWhisper: { tint: '#c65bd6', scale: 0.7, alpha: 0.5, height: 6 },
  silentBell: { tint: '#7fe0d6', scale: 0.5, alpha: 0.3, height: 21 },
  hushedStair: { tint: '#7fe0d6', scale: 0.65, alpha: 0.45, height: 16 },
};

/** Decorations come in clumps around an anchor hex (a ring of mushrooms, a heap of bones), not sprinkled evenly. */
const CLUMP = { pieces: [3, 7] as const, perChamberHexes: 9, loneChance: 0.12, favouriteShare: 0.7 };

/** A light over something: its picture, how bright it is when seen, and the light it casts on the ground around it. */
type Glow = { image: Phaser.GameObjects.Image; alpha: number; groundY: number; radius: number; color: number };

/** Everything drawn for one hex, so it can be shown, dimmed, redrawn or hidden together. */
interface HexView {
  tile: Tile;
  groundKey: string;
  props: Phaser.GameObjects.Image[];
  propGlows: Glow[];
  objectKey: string | null;
  object: Phaser.GameObjects.Image | null;
  objectGlows: Glow[];
  /** Soft shadows under the props and the object. */
  shadows: Phaser.GameObjects.Image[];
  /** The object's shadow, and for a place the wider patch it stands on. */
  objectShadows: Phaser.GameObjects.Image[];
  /** An encounter out of sight that the mycelium tells about. */
  whispered: boolean;
}

export class MapScene extends Phaser.Scene {
  private run!: RunController;
  /** The ground, painted as one surface with soft darkness (GAME_DESIGN.md §13), and the light over it. */
  private ground!: MapGround;
  private light!: MapLight;
  /** The line around everywhere the hydra can go, a soft glow and a thin line over it. */
  private reach!: { glow: Phaser.GameObjects.Graphics; line: Phaser.GameObjects.Graphics; over: Phaser.GameObjects.Graphics };
  /** The way to the hex under the mouse. */
  private path!: Phaser.GameObjects.Graphics;
  /** The travel plan: the hex picked with a first click (the second one sets off), its dots and the turns it takes. */
  private journey: Hex | null = null;
  private journeyDots!: Phaser.GameObjects.Graphics;
  private journeyTurns!: Phaser.GameObjects.Text;
  private tokenShadow!: Phaser.GameObjects.Image;
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

    makeSoftTextures(this);
    this.drawMap();
    this.token = this.add.image(0, 0, 'map_hydra').setOrigin(0.5, 1);
    this.tokenShadow = this.contactShadow(0, 0, this.token.width);
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
      this.ground.destroy();
      this.light.destroy();
    });

    this.refresh();
    this.scene.launch(SceneKey.Hud);
    this.exposeTestHooks();
    markReady(SceneKey.Map);
  }

  // ------------------------------------------------------------ building the map

  private drawMap(): void {
    const clumps = this.planClumps();
    const { data, seed } = getContext(this);
    this.ground = new MapGround(this, this.run.state.map, data, LAYOUT, seed, {
      ground: DEPTH.ground,
      darkness: DEPTH.darkness,
      standing: (y) => this.standingDepth(y),
    });
    this.light = new MapLight(this, this.ground.area, DEPTH.light);
    this.reach = {
      glow: this.add.graphics().setDepth(DEPTH.mark).setBlendMode(Phaser.BlendModes.ADD),
      line: this.add.graphics().setDepth(DEPTH.mark),
      over: this.add.graphics().setDepth(DEPTH.reachOver),
    };
    this.path = this.add.graphics().setDepth(DEPTH.mark);
    this.journey = null;
    this.journeyDots = this.add.graphics().setDepth(DEPTH.mark);
    this.journeyTurns = this.add
      .text(0, 0, '', { fontFamily: FONT.title, fontSize: '10px', color: getContext(this).data.palette.underground.bioluminescence })
      .setOrigin(0, 1)
      .setDepth(DEPTH.hint)
      .setVisible(false);
    for (const tile of this.run.state.map.tiles.values()) {
      const { x, y } = hexToPixel(LAYOUT, tile.hex);
      const view: HexView = {
        tile,
        groundKey: this.groundKey(tile),
        props: [],
        propGlows: [],
        objectKey: null,
        object: null,
        objectGlows: [],
        shadows: [],
        objectShadows: [],
        whispered: false,
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
      const prop = this.add.image(px, py, `map_deco_${kind}`).setOrigin(0.5, 1).setDepth(this.standingDepth(py));
      view.props.push(prop);
      if (!FLAT_DECORATIONS.includes(kind)) view.shadows.push(this.contactShadow(px, py, prop.width));
      if (GLOWING_DECORATIONS.includes(kind)) view.propGlows.push(this.glow(px, py - 9, biome.colors.glow, 0.55, 0.5, py));
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
    for (const shadow of view.objectShadows.splice(0)) shadow.destroy();
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
    // A closed threshold fills its hex, so it has no shadow of its own.
    if (object.kind !== 'threshold') view.objectShadows.push(this.contactShadow(x, feet, view.object.width));
    if (object.kind === 'place') {
      const width = Math.min(view.object.width * PLACE_FOOTING.share, PLACE_FOOTING.max);
      view.objectShadows.push(this.add.image(x, feet - 1, SHADOW_TEXTURE).setScale(width / SHADOW_TEXTURE_WIDTH).setAlpha(PLACE_FOOTING.alpha).setDepth(DEPTH.shadow));
    }
    const light = (tint: string, scale: number, alpha: number, height: number) => view.objectGlows.push(this.glow(x, feet - height, tint, scale, alpha, feet));
    if (object.kind === 'lair') {
      // The pool glows on the ground round it, under the hydra sitting in it, so the hydra keeps its own colours.
      light(palette.underground.bioluminescence, 1.3, 0.45, 9);
      view.objectGlows.at(-1)?.image.setDepth(this.standingDepth(feet) + 0.0002);
    }
    if (object.kind === 'shrine' && !object.used) light('#7fe0d6', 0.9, 0.55, 40);
    if (object.kind === 'moisture') light('#7fd0e0', object.rich ? 0.7 : 0.5, 0.45, 6);
    if (object.kind === 'passage') light('#d0e4dc', 0.8, 0.35, 8);
    if (object.kind === 'encounter' && object.tier >= 3) view.objectGlows.push(this.glow(x + 12, feet - 18, palette.order.orange, 0.6, 0.6, feet));
    if (object.kind === 'threshold' && object.thresholdId === 'smoulderingSeam') light(palette.order.orange, 0.6, 0.5, 8);
    if (object.kind === 'place') {
      const glow = PLACE_GLOWS[object.placeId];
      if (glow) light(glow.tint, glow.scale, glow.alpha, glow.height);
    }
  }

  /** A light at (x, y), over something whose feet are at `groundY`. */
  private glow(x: number, y: number, tint: string, scale: number, alpha: number, groundY: number): Glow {
    // A smooth light, as big as the pixel-art glow (map_glow) the sizes were set for.
    const glowSize = this.textures.getFrame('map_glow').width;
    const image = this.add
      .image(x, y, LIGHT_TEXTURE)
      .setTint(color(tint))
      .setScale((scale * glowSize) / LIGHT_TEXTURE_SIZE)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow);
    return { image, alpha, groundY, radius: (scale * glowSize) / 2, color: color(tint) };
  }

  /** A soft shadow on the ground under something standing at (x, feetY), as wide as it is (within limits). */
  private contactShadow(x: number, feetY: number, width: number): Phaser.GameObjects.Image {
    const shadowWidth = Phaser.Math.Clamp(width * CONTACT_SHADOW.share, CONTACT_SHADOW.min, CONTACT_SHADOW.max);
    return this.add
      .image(x, feetY - 1, SHADOW_TEXTURE)
      .setScale(shadowWidth / SHADOW_TEXTURE_WIDTH)
      .setDepth(DEPTH.shadow);
  }

  private standingDepth(feetY: number): number {
    return DEPTH.standing + feetY / 1000;
  }

  private tokenDepth(feetY: number): number {
    return this.standingDepth(feetY + TOKEN_IN_FRONT) + 0.0005;
  }

  // ------------------------------------------------------------ keeping it up to date

  /** Brings every hex in line with the run state: what is known, what changed, where the hydra can go, and the hints. */
  private refresh(): void {
    const { visibility } = this.run.state;
    const whispered = encountersRevealed(this.run.state, this.run.rules);
    this.ground.update(visibility);
    for (const [key, view] of this.views) {
      const state = visibility.get(key);
      const known = state !== undefined;
      const tint = state === 'remembered' ? REMEMBERED_TINT : AMBIENT_TINT;
      view.groundKey = this.groundKey(view.tile);
      this.syncObject(view);
      for (const image of view.props) image.setVisible(known).setTint(tint);
      for (const shadow of view.shadows) shadow.setVisible(known);
      for (const glow of view.propGlows) glow.image.setVisible(known).setAlpha(state === 'remembered' ? glow.alpha * 0.4 : glow.alpha);

      const object = view.tile.object;
      const spent = (object?.kind === 'shrine' && object.used) || (object?.kind === 'remains' && object.looted);
      view.whispered = false;
      if (view.object) {
        // The mycelium tells where the Order's people are, even out of sight.
        const ghost = whispered && object?.kind === 'encounter' && state !== 'visible';
        view.whispered = ghost;
        view.object
          .setVisible(known || ghost)
          .setTint(ghost ? WHISPERED_TINT : spent ? SPENT_TINT : tint)
          .setAlpha(ghost ? WHISPERED_ALPHA : 1);
      }
      for (const shadow of view.objectShadows) shadow.setVisible(known);
      for (const glow of view.objectGlows) glow.image.setVisible(known && !spent).setAlpha(state === 'remembered' ? glow.alpha * 0.4 : glow.alpha);
    }
    const reachable = this.run.state.pendingBattle ? [] : [...this.run.reachable().keys()];
    this.path.clear();
    this.drawReach(reachable);
    this.drawJourney();
    this.drawLights();
    this.seeThroughTallPlaces();
    this.refreshHints();
    this.announceNewBiomes();
  }

  /** Tall landmarks and rock turn see-through where they would hide the hydra or something it needs to see. */
  private seeThroughTallPlaces(): void {
    const behind: Phaser.GameObjects.Image[] = [this.token];
    const tall: Phaser.GameObjects.Image[] = [];
    for (const view of this.views.values()) {
      const object = view.tile.object;
      if (!object || !view.object?.visible) continue;
      if (object.kind === 'place' && view.object.height >= SEE_THROUGH.minHeight) tall.push(view.object);
      else if (object.kind === 'encounter' || object.kind === 'shrine' || (object.kind === 'threshold' && object.state === 'closed')) behind.push(view.object);
    }
    this.ground.seeThrough(
      behind.map((image) => ({ bounds: image.getBounds(), depth: image.depth })),
      SEE_THROUGH.alpha,
    );
    for (const image of tall) {
      const bounds = image.getBounds();
      Phaser.Geom.Rectangle.Inflate(bounds, -bounds.width * SEE_THROUGH.inset, 0);
      const hides = behind.some((other) => other.depth < image.depth && Phaser.Geom.Intersects.RectangleToRectangle(bounds, other.getBounds()));
      image.setAlpha(hides ? SEE_THROUGH.alpha : 1);
    }
  }

  /** One line around everywhere the hydra can go (and the hex it stands on), with rounded corners; none when it can't move. */
  private drawReach(keys: readonly string[]): void {
    const { glow, line, over } = this.reach;
    glow.clear().setVisible(true);
    line.clear().setVisible(true);
    over.clear().setVisible(true);
    if (keys.length === 0) return;
    const { map, hydra } = this.run.state;
    const hexes = [hydra.position, ...keys.map((key) => map.tiles.get(key)!.hex)];
    const colour = color(getContext(this).data.palette.underground.bioluminescence);
    glow.lineStyle(REACH_LINE.glowWidth, colour, REACH_LINE.glowAlpha);
    line.lineStyle(REACH_LINE.width, colour, REACH_LINE.alpha);
    over.lineStyle(REACH_LINE.overWidth, colour, REACH_LINE.overAlpha);
    for (const outline of hexOutlines(hexes, LAYOUT)) {
      const points = roundCorners(outline, REACH_LINE.rounding).map((p) => new Phaser.Math.Vector2(p.x, p.y));
      glow.strokePoints(points, true, true);
      line.strokePoints(points, true, true);
      over.strokePoints(points, true, true);
    }
  }

  /** With a mouse: dots along the way the hydra would walk to the hex under the pointer, and a ring around it. */
  private showPath(pointer: Phaser.Input.Pointer): void {
    const path = this.path;
    path.clear();
    if (this.animating || this.run.state.pendingBattle) return;
    const reachable = this.run.reachable();
    const target = this.pointedHex(pointer, reachable);
    const way = target && reachable.get(hexKey(target));
    // The planned journey shows its own way.
    if (!way || (this.journey && hexEquals(target, this.journey))) return;
    this.dotsAlong(path, way.path, () => PATH_DOTS.alpha);
  }

  /** The travel plan, drawn again for where the hydra is now; dropped when there is no way there any more. */
  private drawJourney(): void {
    const dots = this.journeyDots;
    dots.clear();
    this.journeyTurns.setVisible(false);
    if (!this.journey || this.animating) return;
    const journey = this.run.plan(this.journey);
    if (!journey) {
      this.journey = null;
      return;
    }
    const { turns, path } = journey;
    this.dotsAlong(dots, path, (step) => (turns[step] === 0 ? PATH_DOTS.alpha : JOURNEY.laterAlpha));
    const colour = color(getContext(this).data.palette.underground.bioluminescence);
    for (let i = 0; i < path.length - 1; i++) {
      if (turns[i] === turns[i + 1]) continue;
      const end = hexToPixel(LAYOUT, path[i]!);
      dots.fillStyle(colour, turns[i] === 0 ? PATH_DOTS.alpha : JOURNEY.laterAlpha).fillCircle(end.x, end.y, JOURNEY.turnEndRadius);
    }
    const days = turns[turns.length - 1]! + 1;
    if (days > 1) {
      const last = hexToPixel(LAYOUT, path[path.length - 1]!);
      this.journeyTurns.setText(String(days)).setPosition(last.x + PATH_DOTS.ringWidth / 2, last.y).setVisible(true);
    }
  }

  /**
   * Dots at even steps along a way from the hydra (the first a little away from it, none inside the ring at the end),
   * each as bright as `alphaOf` says for the step of the way it lies on, and a ring around the last hex.
   */
  private dotsAlong(g: Phaser.GameObjects.Graphics, way: readonly Hex[], alphaOf: (step: number) => number): void {
    const points = [this.run.state.hydra.position, ...way].map((h) => hexToPixel(LAYOUT, h));
    const colour = color(getContext(this).data.palette.underground.bioluminescence);
    let along = PATH_DOTS.start;
    let walked = 0;
    const end = points.slice(1).reduce((sum, p, i) => sum + Phaser.Math.Distance.BetweenPoints(points[i]!, p), 0) - PATH_DOTS.ringWidth / 2;
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]!;
      const to = points[i]!;
      const length = Phaser.Math.Distance.BetweenPoints(from, to);
      g.fillStyle(colour, alphaOf(i - 1));
      for (; along <= walked + length && along < end; along += PATH_DOTS.spacing) {
        const t = (along - walked) / length;
        g.fillCircle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, PATH_DOTS.radius);
      }
      walked += length;
    }
    const last = points[points.length - 1]!;
    g.lineStyle(REACH_LINE.width, colour, alphaOf(way.length - 1));
    g.strokeEllipse(last.x, last.y, PATH_DOTS.ringWidth, PATH_DOTS.ringHeight);
  }

  /** Draws the light again: the hydra's, every glow in sight or remembered, and the encounters the mycelium tells about. */
  private drawLights(): void {
    const lights: Light[] = [{ x: this.token.x, y: this.token.y, ...LIGHTS.hydra }];
    for (const view of this.views.values()) {
      for (const glow of [...view.propGlows, ...view.objectGlows]) {
        if (!glow.image.visible) continue;
        lights.push({ x: glow.image.x, y: glow.groundY, radius: glow.radius * LIGHTS.glowReach, color: glow.color, strength: glow.image.alpha * LIGHTS.glowStrength });
      }
      if (view.whispered && view.object) lights.push({ x: view.object.x, y: view.object.y, color: WHISPERED_TINT, ...LIGHTS.whispered });
    }
    this.light.draw(lights);
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
      .text(at.x, at.y, name, { fontFamily: FONT.title, fontSize: '15px', color: '#e8e0d0', backgroundColor: '#05090acc', padding: { x: 8, y: 3 } })
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
    const steps: Array<{ x: number; y: number; duration: number; onUpdate: (tween: Phaser.Tweens.Tween) => void }> = [];
    const step = (h: Hex, duration: number, sway: number, stretch: number): void => {
      const side = steps.length % 2 === 0 ? 1 : -1;
      steps.push({
        ...this.tokenPosition(h),
        duration,
        onUpdate: (tween) => {
          const swing = Math.sin(tween.progress * Math.PI);
          this.token.setAngle(side * sway * swing).setScale(1 - (stretch / 2) * swing, 1 + stretch * swing);
        },
      });
    };
    for (const event of events) {
      if (event.type === 'moved') for (const h of event.path) step(h, STEP_DURATION_MS, SLITHER.sway, SLITHER.stretch);
      if (event.type === 'carried') for (const h of event.path) step(h, CARRIED_STEP_MS, SLITHER.carriedSway, 0);
    }
    const revealed = events.find((e) => e.type === 'thresholdRevealed');
    if (steps.length === 0) {
      if (revealed) this.panTo(revealed.at);
      return;
    }
    this.animating = true;
    this.run.animating = true;
    this.reach.glow.setVisible(false);
    this.reach.line.setVisible(false);
    this.reach.over.setVisible(false);
    this.path.clear();
    this.journeyDots.clear();
    this.journeyTurns.setVisible(false);
    this.tweens.chain({
      targets: this.token,
      tweens: steps,
      onUpdate: () => {
        this.token.setDepth(this.tokenDepth(this.token.y));
        this.tokenShadow.setPosition(this.token.x, this.token.y - 1);
        this.drawLights();
      },
      onComplete: () => {
        this.animating = false;
        this.token.setAngle(0).setScale(1);
        if (this.journey && hexEquals(this.journey, this.run.state.hydra.position)) this.journey = null;
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
    this.token.setPosition(x, y).setDepth(this.tokenDepth(y));
    this.tokenShadow.setPosition(x, y - 1);
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
    // The camera also zooms the 640×360 screen up to the canvas's resolution.
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
      // A mouse moving over the map (no button held) shows the way to the hex under it.
      if (!pointer.isDown && !pointer.wasTouch) this.showPath(pointer);
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
      const reachable = this.run.reachable();
      const target = this.pointedHex(pointer, reachable);
      if (target && !reachable.has(hexKey(target))) {
        this.run.inspect(target);
        return;
      }
      // A tap on a hex in reach goes there at once. A mouse plans first, as in Heroes: the first click shows the way,
      // a second click on the same hex sets off. A tap or a click further away plans a journey of several turns.
      if (target && pointer.wasTouch) {
        this.journey = null;
        this.run.moveTo(target);
        return;
      }
      const aimed = target ?? this.knownGround(pointer);
      if (!aimed) return;
      if (this.journey && hexEquals(aimed, this.journey)) this.travel(this.journey);
      else this.planJourney(aimed);
    });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.path.clear());
  }

  /** Plans a journey to a hex and shows it, or says there is no way there. */
  private planJourney(target: Hex): void {
    if (!this.run.plan(target)) {
      this.run.notice('noWayThere');
      return;
    }
    this.journey = target;
    this.path.clear();
    this.drawJourney();
  }

  /** Goes as far along the planned journey as this turn allows; the rest waits for the next turns. */
  private travel(target: Hex): void {
    const journey = this.run.plan(target);
    const today = journey ? journey.turns.filter((t) => t === 0).length : 0;
    if (!journey || today === 0) {
      if (!journey) this.journey = null;
      this.run.notice(journey ? 'journeyWaits' : 'noWayThere');
      this.drawJourney();
      return;
    }
    this.run.moveTo(journey.path[today - 1]!);
  }

  /** A known hex the hydra could walk on, under the pointer or just in front (as in pointedHex), for a journey. */
  private knownGround(pointer: Phaser.Input.Pointer): Hex | undefined {
    const { map, visibility, hydra } = this.run.state;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tapped = pixelToHex(LAYOUT, world.x, world.y);
    return [tapped, hex(tapped.q, tapped.r + 1), hex(tapped.q - 1, tapped.r + 1)].find((h) => {
      const tile = map.tiles.get(hexKey(h));
      return tile && visibility.has(hexKey(h)) && this.run.rules.terrain[tile.terrain].moveCost !== null && !hexEquals(h, hydra.position);
    });
  }

  /** The hex a press at the pointer is meant for: one the hydra can go to or open, under the pointer or just in front. */
  private pointedHex(pointer: Phaser.Input.Pointer, reachable: ReadonlyMap<string, unknown>): Hex | undefined {
    // Converted with this scene's camera: pointer.worldX may come from another scene's camera.
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tapped = pixelToHex(LAYOUT, world.x, world.y);
    // Things stand up from their hex, so a tap on their upper part lands on the hex behind: try the hexes in front too.
    return [tapped, hex(tapped.q, tapped.r + 1), hex(tapped.q - 1, tapped.r + 1)].find((h) => reachable.has(hexKey(h)) || this.inspectable(h));
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
    exposeMapBusy(() => this.animating || this.run.animating || this.cameras.main.panEffect.isRunning);
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
