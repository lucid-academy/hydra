// Battle screen: a board of hexes seen from a slant (a thick slab, as in Into the Breach) with the hydra in the middle.
// Runs the battle simulation in fixed ticks and draws it; taps and keys become commands to the simulation.
// The battle starts paused. Space / the Pause button stops and starts the ticks; orders can be given while paused.
// Controls: tap a head (or its card, or 1–9) to select it, then tap an enemy to make it attack.
// Several heads at once: Ctrl or Shift + tap on heads or cards (Shift + 1–9), or "All heads" (key A).
// With no head selected, tap a free hex to move the body there (right-click always moves it).
// In HD (GAME_DESIGN.md §13) the board is one painted surface with a faint grid, reach is one line round the area,
// things stand on soft shadows, and torches light the board around them.

import * as Phaser from 'phaser';
import { SCREEN } from '../scaling';
import { BODY_FOOT, FEET_BELOW_HEX_CENTER, HEX_COLUMN_WIDTH, HEX_ROW_HEIGHT, JAW_OVERLAP, TILE, TORCH_FLAME } from '../assets/battleArt';
import { battleTileKey, readPixels, tileVariant } from '../assets/terrainTiles';
import { GROUND_SHADING, groundTextureKey, paintBoard, rockTextureKey, variantKey } from '../assets/terrain';
import { applyCommand, battleResult, bodyDistance, boardHexes, canCauterize, createBattle, isAcid, isOnBoard, stepBattle } from '../sim/battle';
import type { BattleEvent, BattleHead, BattleState, Enemy, Walker } from '../sim/battle';
import { hexDistance, hexKey, hexToPixel, pixelToHex } from '../sim/hex';
import type { Hex, HexLayout } from '../sim/hex';
import { exposeBattleSummary, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import { HeadCards } from '../ui/HeadCards';
import { FONT } from '../ui/fonts';
import { onKeyDown, wantsToAdd } from '../ui/keys';
import { color, getContext } from './context';
import { getRun, startNewRun } from './RunController';
import type { RunController } from './RunController';
import { hexEdges, hexOutlines, roundCorners } from './hexOutline';
import { LIGHT_TEXTURE, LIGHT_TEXTURE_SIZE, makeSoftTextures, MapLight, SHADOW_TEXTURE, SHADOW_TEXTURE_WIDTH } from './mapLight';
import type { Light } from './mapLight';
import { SceneKey } from './sceneKeys';
import { fitScreenCamera, useDensity } from './view';

/** Top bar above the board, panel with head cards below it. */
const ARENA_TOP = 16;
const PANEL_TOP = 316;
/** Screen position of the board's middle hex, where the body starts. */
const LAYOUT: HexLayout = { columnWidth: HEX_COLUMN_WIDTH, rowHeight: HEX_ROW_HEIGHT, originX: 320, originY: 170 };
const SPEEDS = [1, 0.5] as const;
const DEFAULT_TEST_GROUP = 'burningDetail';
/** After a combo the battle runs this many times slower for a moment, so the player can see it land. */
const COMBO_SLOWDOWN = 0.3;
const COMBO_SLOWDOWN_MS = 350;
/** A tap this close to the middle of a head (with its jaw) selects it (screen pixels). */
const HEAD_TAP_RADIUS = 18;
/** Soldier images: how far around their feet a tap still counts as tapping them. */
const SOLDIER_TAP = { halfWidth: 13, up: 38, down: 4 };
/** Necks are drawn as overlapping discs, one every few pixels, so long necks stay one smooth tube. */
const NECK_DISC_SPACING = 2.5;
/** How fast drawn heads follow where they should be (ms to cover most of the way). */
const HEAD_FOLLOW_MS = 90;
/** An attacking head lunges at its target for this long; its jaw opens and snaps shut in the same time. */
const HEAD_LUNGE_MS = 120;
/** How far the jaw opens in a bite: degrees it turns around its back end. */
const JAW_OPEN_DEGREES = 25;
/** A head that is hit jumps this many pixels away from the blow and comes back. */
const HEAD_RECOIL_PX = 3;
const HEAD_RECOIL_MS = 120;
/** Neck colours, taken from the body art: its outline and a lit green of its scales. */
const NECK_OUTLINE = 0x030b0b;
const NECK_FILL = 0x486a33;

// Depths: board, then things on it sorted by how low on the screen they stand, then necks and heads, then UI.
// In HD the light lies over everything on the board and under the bars and the UI, and the glow of torches over it.
const DEPTH = { tile: 0, grid: 0.5, mark: 1, shadow: 2, standing: 10, mist: 40, necks: 50, jaws: 50.5, heads: 51, light: 55, glow: 56, overlay: 60, text: 70, ui: 100 } as const;

/** HD: the board's picture, and the faint line along the sides of its hexes (width in screen units). */
const BOARD_TEXTURE = 'battle_board';
const GRID = { width: 0.5, alpha: 0.16 } as const;
/** HD: the lines round where the selected heads reach and round single hexes (as on the map, MapScene). */
const MARK_LINE = { rounding: 3, glowWidth: 4, glowAlpha: 0.2, width: 1.25 } as const;
/**
 * HD: soft shadows under soldiers and under the body (screen units). The body's is an oval round the foot of the mound,
 * its middle this far below the middle of the footprint, so it shows at the sides and in front.
 */
const SHADOW = { soldier: 24, body: { width: 176, height: 100, below: 12 } } as const;
/** HD: a cloud of Mist is soft patches this wide, one on each hex it covers, and soft puffs this big over them (screen units). */
const MIST_PATCH = 70;
const MIST_PUFF = { width: 34, height: 16 } as const;
/**
 * HD light: a soft light over the middle of the board (darker towards the edges); a burning torch lights this far
 * around its flame, flickering, and glows warm round the flame (glow this wide, this bright); an acid cloud glows a little.
 * Torchlight is the Order's orange: the pale yellow of fire turns green on the teal ground.
 */
const BATTLE_LIGHTS = {
  middle: { x: 320, y: 172, radius: 260, color: 0xf4f6e4, strength: 0.14 },
  torch: { radius: 80, strength: 0.42, flicker: 0.15, glowSize: 44, glowAlpha: 0.5 },
  acid: 0.18,
} as const;

interface Point {
  x: number;
  y: number;
}

/** How a head is drawn right now; it glides towards where the simulation says it should be. */
interface HeadView {
  sprite: Phaser.GameObjects.Image;
  /** The lower jaw, its own image so the mouth can open (empty while the head is a placeholder). */
  jaw: Phaser.GameObjects.Image;
  x: number;
  y: number;
  lungeUntil: number;
  lungeTo: Point;
  /** Until when the head is jolted by a blow, and where the blow came from. */
  recoilUntil: number;
  recoilFrom: Point;
  phase: number;
}

interface EnemyView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  /** HD: the warm glow round a burning torch (hidden while the soldier has none, or it is out). */
  glow: Phaser.GameObjects.Image | null;
  lungeUntil: number;
  lungeTo: Point;
  phase: number;
  /** Last feet position, for a fading body when it falls. */
  feet: Point;
}

export class BattleScene extends Phaser.Scene {
  private run!: RunController;
  private battle!: BattleState;
  private paused = true;
  /** False until the player starts the battle for the first time; the how-to-play hint shows until then. */
  private started = false;
  private speedIndex = 0;
  private accumulator = 0;
  /** Heads picked by the player; an order goes to all of them. */
  private selected = new Set<string>();
  private finished = false;
  /** Real milliseconds of combo slow-down left. */
  private slowdownLeft = 0;
  /** Ids of combos that fired in this battle, in order (for the smoke test). */
  private combosSeen: string[] = [];

  private hd = false;
  private marks = new Map<string, Phaser.GameObjects.Image>();
  /** HD: the line round where the selected heads reach (and rings on single hexes), its glow, and what they show. */
  private reach: { glow: Phaser.GameObjects.Graphics; line: Phaser.GameObjects.Graphics; shown: string } | null = null;
  private light: MapLight | null = null;
  private bodyShadow: Phaser.GameObjects.Image | null = null;
  private mistTiles = new Map<string, Phaser.GameObjects.Image>();
  private mistPuffs = new Map<number, Phaser.GameObjects.Image[]>();
  private bodySprite!: Phaser.GameObjects.Image;
  private heads = new Map<string, HeadView>();
  private enemies = new Map<number, EnemyView>();
  private stumpSprites = new Map<number, Phaser.GameObjects.Image>();
  /** The point of the jaw image it turns around when the mouth opens. */
  private jawHinge: Point = { x: 0, y: 0 };
  private necks!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private cards!: HeadCards;
  private bodyHpText!: Phaser.GameObjects.Text;
  private pausedText!: Phaser.GameObjects.Text;
  private pausedFrame!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
  private pauseButton!: Button;
  private speedButton!: Button;

  constructor() {
    super(SceneKey.Battle);
  }

  /** Current simulation tick, for the debug overlay. */
  get tick(): number | null {
    return this.battle && !this.finished ? this.battle.tick : null;
  }

  create(): void {
    const { data, params } = getContext(this);
    let run = getRun(this);
    if (!run || (!run.state.pendingBattle && params.scene === SceneKey.Battle)) {
      // ?scene=battle: a test battle without walking to an encounter.
      run = run ?? startNewRun(this);
      run.startTestBattle(params.group ?? DEFAULT_TEST_GROUP, params.hp);
    }
    this.run = run;
    const setup = run.battleSetup();
    if (!setup) {
      this.scene.start(SceneKey.Map);
      return;
    }

    this.battle = createBattle(setup, run.battleRules);
    this.combosSeen = [];
    // Every battle starts paused: time to look around and give the first orders.
    this.paused = true;
    this.started = false;
    this.speedIndex = 0;
    this.accumulator = 0;
    this.selected = new Set();
    this.finished = false;
    this.slowdownLeft = 0;
    this.marks = new Map();
    this.mistTiles = new Map();
    this.mistPuffs = new Map();
    this.heads = new Map();
    this.enemies = new Map();
    this.stumpSprites = new Map();
    this.hd = params.hd;
    this.reach = null;
    this.light = null;
    this.bodyShadow = null;
    if (this.hd) makeSoftTextures(this);

    fitScreenCamera(this);
    this.cameras.main.setBackgroundColor(color(data.palette.underground.black));
    // The board looks like the place of the encounter: its biome, and water if it was fought in water.
    const pending = run.state.pendingBattle!;
    const tile = run.state.map.tiles.get(hexKey(pending.at));
    const biome = tile?.biome ?? data.biomes.lairBiome;
    this.createBoard(biome, tile?.terrain ?? 'mud');

    this.bodySprite = this.add.image(0, 0, 'battle_body');
    this.bodySprite.setOrigin(BODY_FOOT.x / this.bodySprite.width, BODY_FOOT.y / this.bodySprite.height);
    if (this.hd) {
      this.bodyShadow = this.softShadow(SHADOW.body.width, SHADOW.body.height);
      this.light = new MapLight(this, { x: 0, y: 0, width: SCREEN.width, height: SCREEN.height }, DEPTH.light, 'battle_light');
      this.reach = {
        glow: this.add.graphics().setDepth(DEPTH.mark).setBlendMode(Phaser.BlendModes.ADD),
        line: this.add.graphics().setDepth(DEPTH.mark),
        shown: '',
      };
    }
    this.jawHinge = jawHinge(this.textures);
    this.necks = this.add.graphics().setDepth(DEPTH.necks);
    this.overlay = this.add.graphics().setDepth(DEPTH.overlay);

    this.createUi();
    this.setUpInput();
    this.syncSprites();
    this.draw(0);
    exposeBattleSummary(() => ({
      tick: this.battle.tick,
      outcome: this.battle.outcome,
      paused: this.paused,
      enemies: this.battle.enemies.map((e) => {
        const feet = this.enemies.get(e.id)?.feet ?? this.hexFeet(e.hex);
        return { id: e.id, typeId: e.typeId, x: feet.x, y: feet.y - 16 };
      }),
      heads: this.battle.heads.map((h) => ({ id: h.id, classId: h.classId, x: this.heads.get(h.id)?.x ?? 0, y: this.heads.get(h.id)?.y ?? 0 })),
      selected: [...this.selected],
      cards: this.cards.centers(),
      orders: Object.fromEntries(this.battle.heads.map((h) => [h.id, h.orderTargetId])),
      clouds: this.battle.clouds.length,
      combos: [...this.combosSeen],
    }));
    markReady(SceneKey.Battle);
  }

  // ------------------------------------------------------------ board

  /**
   * Tiles row by row from the top: each row hides the walls of the row behind it, so only the front edge shows its walls.
   * Tiles cut from a terrain texture come in variants, so each hex gets its own; otherwise all hexes share one image.
   */
  private createBoard(biome: string, terrain: string): void {
    const rules = this.run.battleRules;
    const painted = this.hd && this.paintBoardPicture(biome, terrain);
    const cut = battleTileKey(biome, terrain, true);
    const tileKey = this.textures.exists(variantKey(cut, 0)) ? cut : battleTileKey(biome, terrain, false);
    const originY = TILE.faceHeight / 2 / (TILE.faceHeight + TILE.wallHeight);
    for (const h of boardHexes(rules)) {
      const p = this.hexCenter(h);
      if (!painted) {
        const variant = tileVariant(this.textures, tileKey, Math.imul(h.q + 64, 73856093) ^ Math.imul(h.r + 64, 19349663));
        this.add.image(p.x, p.y, variant).setOrigin(0.5, originY).setDepth(DEPTH.tile + p.y / 10000);
      }
      if (this.hd) {
        // Mist as soft patches that run into each other; marks are lines (drawMarks).
        const patch = this.add.image(p.x, p.y, LIGHT_TEXTURE).setScale(MIST_PATCH / LIGHT_TEXTURE_SIZE).setDepth(DEPTH.mark).setVisible(false);
        this.mistTiles.set(hexKey(h), patch);
      } else {
        this.marks.set(hexKey(h), this.add.image(p.x, p.y, 'battle_hex_mark').setDepth(DEPTH.mark).setVisible(false));
        this.mistTiles.set(hexKey(h), this.add.image(p.x, p.y, 'battle_hex_fill').setDepth(DEPTH.mark).setVisible(false));
      }
    }
    if (painted) this.drawGrid();
    // A few glowing spores in the dark around the board.
    const { palette } = getContext(this).data;
    const g = this.add.graphics().setDepth(DEPTH.tile - 1);
    g.fillStyle(color(palette.underground.bioluminescence), 0.6);
    for (let i = 0; i < 40; i++) g.fillRect(Math.floor(((i * 173) % 640) + ((i * 7) % 5)), ARENA_TOP + ((i * 97) % 300), 1, 1);
  }

  /**
   * HD: the whole board as one picture painted from the terrain's texture, without seams between hexes (false when
   * the terrain has no texture file yet: then the board is made of tiles).
   */
  private paintBoardPicture(biome: string, terrain: string): boolean {
    const faceKey = groundTextureKey(biome, terrain);
    if (!this.hasArt(faceKey)) return false;
    const face = readPixels(this, faceKey);
    const walls = this.hasArt(rockTextureKey(biome)) ? readPixels(this, rockTextureKey(biome)) : face;
    const density = face.density;
    const centres = boardHexes(this.run.battleRules).map((h) => this.hexCenter(h));
    const left = Math.min(...centres.map((c) => c.x)) - TILE.width / 2;
    const top = Math.min(...centres.map((c) => c.y)) - TILE.faceHeight / 2;
    const right = Math.max(...centres.map((c) => c.x)) + TILE.width / 2;
    const bottom = Math.max(...centres.map((c) => c.y)) + TILE.faceHeight / 2 + TILE.wallHeight;
    // Not a power of two: Phaser would make such a picture repeat, and its edges would show the opposite edge.
    const notPowerOfTwo = (n: number): number => ((n & (n - 1)) === 0 ? n + 2 : n);
    const size = { width: notPowerOfTwo(Math.ceil((right - left) * density)), height: notPowerOfTwo(Math.ceil((bottom - top) * density)) };
    const shape = { width: TILE.width * density, faceHeight: TILE.faceHeight * density, wallDepth: TILE.wallHeight * density };
    const at = centres.map((c) => ({ x: (c.x - left) * density, y: (c.y - top) * density }));
    const pixels = paintBoard(face, walls, at, size, shape, GROUND_SHADING);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d')!.putImageData(new ImageData(pixels.data, size.width, size.height), 0, 0);
    if (this.textures.exists(BOARD_TEXTURE)) this.textures.remove(BOARD_TEXTURE);
    const texture = this.textures.addCanvas(BOARD_TEXTURE, canvas);
    if (!texture) return false;
    useDensity(texture, density);
    this.add.image(left, top, BOARD_TEXTURE).setOrigin(0, 0).setDepth(DEPTH.tile);
    return true;
  }

  /** Is there a drawn image for this key (rather than a placeholder made in code)? */
  private hasArt(key: string): boolean {
    return (getContext(this).data.manifest.images[key]?.file ?? null) !== null;
  }

  /** HD: a faint line along every side of the board's hexes, so the fields still read on the seamless board. */
  private drawGrid(): void {
    const { palette } = getContext(this).data;
    const grid = this.add.graphics().setDepth(DEPTH.grid);
    grid.lineStyle(GRID.width, color(palette.mist), GRID.alpha);
    for (const [a, b] of hexEdges(boardHexes(this.run.battleRules), LAYOUT)) grid.lineBetween(a.x, a.y, b.x, b.y);
  }

  /** HD: a soft dark oval to stand on, this wide and (unless it is the usual half as tall) this tall (screen units). */
  private softShadow(width: number, height = width / 2): Phaser.GameObjects.Image {
    return this.add
      .image(0, 0, SHADOW_TEXTURE)
      .setScale(width / SHADOW_TEXTURE_WIDTH, height / (SHADOW_TEXTURE_WIDTH / 2))
      .setDepth(DEPTH.shadow);
  }

  private hexCenter(h: Hex): Point {
    return hexToPixel(LAYOUT, h);
  }

  private hexFeet(h: Hex): Point {
    const c = this.hexCenter(h);
    return { x: c.x, y: c.y + FEET_BELOW_HEX_CENTER };
  }

  /** How far into the current tick we are (0..1), so walking looks smooth between ticks. */
  private tickFraction(): number {
    if (this.paused || this.finished) return 0;
    return Math.min(1, this.accumulator / (1000 / this.run.battleRules.ticksPerSecond));
  }

  /** Where something walking between hexes is drawn right now, and how high it hops (0 when standing). */
  private walkerPosition(w: Walker, at: Hex): { point: Point; hop: number } {
    const to = this.hexCenter(at);
    const now = this.battle.tick + this.tickFraction();
    if (now >= w.stepEndTick || w.stepEndTick <= w.stepStartTick) return { point: to, hop: 0 };
    const from = this.hexCenter(w.stepFrom);
    const t = Math.max(0, (now - w.stepStartTick) / (w.stepEndTick - w.stepStartTick));
    return { point: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, hop: Math.sin(t * Math.PI) };
  }

  private bodyCenter(): Point {
    return this.walkerPosition(this.battle.body, this.battle.body.center).point;
  }

  /** Where a neck leaves the body: on the upper rim of the mound, in the neck's direction. */
  private neckBase(body: Point, angle: number): Point {
    return { x: body.x + Math.cos(angle) * 44, y: body.y - 16 + Math.sin(angle) * 24 };
  }

  // ------------------------------------------------------------ UI

  private createUi(): void {
    const { palette, text, heads } = getContext(this).data;
    const { width, height } = SCREEN;

    // The bars above and below the board are not interactive: the board's own tap area ends where they begin,
    // and an interactive bar could be counted as lying on top of the buttons and cards drawn on it.
    this.add.rectangle(0, 0, width, ARENA_TOP, color(palette.underground.black), 0.9).setOrigin(0, 0).setDepth(DEPTH.ui);
    this.bodyHpText = this.add.text(6, 3, '', { fontFamily: FONT.text, fontSize: '10px', color: '#d8e4d0' }).setDepth(DEPTH.ui + 1);
    // Paused = the word in the top bar plus a gold frame around the board area, so nothing on the board is covered.
    this.pausedText = this.add
      .text(width / 2, 3, text.battle.paused, { fontFamily: FONT.text, fontSize: '10px', color: palette.order.gold })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.ui + 1);
    this.pausedFrame = this.add.graphics().setDepth(DEPTH.ui - 1);
    this.pausedFrame.lineStyle(2, color(palette.order.gold), 0.9);
    this.pausedFrame.strokeRect(1, ARENA_TOP + 1, width - 2, PANEL_TOP - ARENA_TOP - 2);

    // How to play, shown until the battle is started. It lies over the front wall of the board, where it covers nobody.
    this.hintText = this.add
      .text(width / 2, PANEL_TOP - 1, text.battle.hintSelectHead, {
        fontFamily: FONT.text,
        fontSize: '10px',
        color: '#e8f0e0',
        backgroundColor: '#000000bb',
        padding: { x: 5, y: 2 },
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.ui + 1);

    this.add.rectangle(0, PANEL_TOP, width, height - PANEL_TOP, color(palette.underground.black)).setOrigin(0, 0).setDepth(DEPTH.ui);

    const buttonWidth = 70;
    this.cards = new HeadCards(
      this,
      {
        x: 2,
        y: PANEL_TOP + 2,
        width: width - buttonWidth - 8,
        maxCards: this.run.battleRules.maxHeads,
        classColors: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.color])),
        classNames: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.displayName])),
      },
      (headId, add) => this.selectHead(headId, add),
    );

    const buttonStyle = {
      width: buttonWidth,
      height: 20,
      fill: color(palette.underground.deepTeal),
      border: color(palette.underground.bioluminescence),
      textColor: '#e8f0e0',
      fontSize: '10px',
    };
    this.pauseButton = new Button(this, width - buttonWidth / 2 - 3, PANEL_TOP + 12, text.battle.pauseButton, buttonStyle, () => this.togglePause());
    this.speedButton = new Button(this, width - buttonWidth / 2 - 3, PANEL_TOP + 33, '', buttonStyle, () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
      this.updateButtons();
    });
    const allHeads = new Button(
      this,
      width - 40,
      ARENA_TOP / 2,
      text.battle.selectAllButton,
      { ...buttonStyle, width: 74, height: 13, fontSize: '10px' },
      () => this.selectAllHeads(),
    );
    for (const b of [this.pauseButton, this.speedButton, allHeads]) b.setDepth(DEPTH.ui + 2);
    this.updateButtons();
  }

  private updateButtons(): void {
    const { text } = getContext(this).data;
    this.pauseButton.setLabel(this.paused ? text.battle.resumeButton : text.battle.pauseButton);
    this.speedButton.setLabel(`${text.battle.speed} ${SPEEDS[this.speedIndex]}×`);
    this.pausedText.setVisible(this.paused && !this.finished);
    this.pausedFrame.setVisible(this.paused && !this.finished);
    this.hintText.setVisible(!this.started && !this.finished);
  }

  private togglePause(): void {
    if (this.finished) return;
    this.paused = !this.paused;
    if (!this.paused) this.started = true;
    this.updateButtons();
  }

  /** A plain tap picks one head (or lets go of it); with `add` (Ctrl, Shift) the head joins the picked ones or leaves them. */
  private selectHead(headId: string, add: boolean): void {
    if (add) {
      if (this.selected.has(headId)) this.selected.delete(headId);
      else this.selected.add(headId);
      return;
    }
    const onlyThisOne = this.selected.size === 1 && this.selected.has(headId);
    this.selected = onlyThisOne ? new Set() : new Set([headId]);
  }

  private selectAllHeads(): void {
    if (!this.finished) this.selected = new Set(this.battle.heads.map((h) => h.id));
  }

  // ------------------------------------------------------------ input

  private setUpInput(): void {
    this.input.mouse?.disableContextMenu();
    onKeyDown(this, (event) => {
      // Key codes, not characters: Shift + 1 still counts as 1 on every keyboard layout.
      const digit = /^Digit([1-9])$/.exec(event.code);
      if (event.code === 'Space') this.togglePause();
      else if (event.key === 'Escape') this.selected = new Set();
      else if (event.code === 'KeyA') this.selectAllHeads();
      else if (digit) {
        const head = this.battle.heads[Number(digit[1]) - 1];
        if (head) this.selectHead(head.id, event.shiftKey);
      }
    });

    // The board area: buttons, cards and the top bar lie above it and catch their own taps first.
    const zone = this.add.zone(0, ARENA_TOP, SCREEN.width, PANEL_TOP - ARENA_TOP).setOrigin(0, 0).setDepth(DEPTH.tile).setInteractive();
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.finished) this.handleTap({ x: pointer.worldX, y: pointer.worldY }, pointer.rightButtonReleased(), wantsToAdd(pointer));
    });
  }

  private handleTap(at: Point, rightButton: boolean, add: boolean): void {
    const rules = this.run.battleRules;
    const tappedHex = pixelToHex(LAYOUT, at.x, at.y);
    if (!rightButton) {
      // With heads picked, a tap on an enemy is an order, even if a head hangs right next to it;
      // with none picked, a tap picks a head.
      const enemy = this.enemyAt(at, tappedHex);
      if (enemy && this.selected.size > 0 && !add) {
        for (const headId of this.selected) applyCommand(this.battle, { type: 'attack', headId, enemyId: enemy.id }, rules);
        return;
      }
      const head = this.headAt(at);
      if (head) {
        this.selectHead(head.id, add);
        return;
      }
      if (enemy) return;
      // A tap that missed everything while heads are selected only lets go of them:
      // on a phone it is usually a missed enemy, and the body must not wander off because of it.
      if (this.selected.size > 0) {
        this.selected = new Set();
        return;
      }
    }
    if (isOnBoard(tappedHex, rules)) applyCommand(this.battle, { type: 'moveBody', to: tappedHex }, rules);
    this.selected = new Set();
  }

  private headAt(at: Point): BattleHead | null {
    let best: BattleHead | null = null;
    let bestDistance = HEAD_TAP_RADIUS;
    for (const head of this.battle.heads) {
      const view = this.heads.get(head.id);
      if (!view) continue;
      const shape = this.headShape(view);
      const d = Math.hypot(shape.x - at.x, shape.y - at.y);
      if (d <= bestDistance) {
        best = head;
        bestDistance = d;
      }
    }
    return best;
  }

  /** The soldier drawn under the pointer (the one in front, if they overlap), or the one standing on the tapped hex. */
  private enemyAt(at: Point, tappedHex: Hex): Enemy | null {
    let best: Enemy | null = null;
    let bestFeetY = -Infinity;
    for (const enemy of this.battle.enemies) {
      const feet = this.enemies.get(enemy.id)?.feet ?? this.hexFeet(enemy.hex);
      const inside = Math.abs(at.x - feet.x) <= SOLDIER_TAP.halfWidth && at.y >= feet.y - SOLDIER_TAP.up && at.y <= feet.y + SOLDIER_TAP.down;
      if (inside && feet.y > bestFeetY) {
        best = enemy;
        bestFeetY = feet.y;
      }
    }
    return best ?? this.battle.enemies.find((e) => e.hex.q === tappedHex.q && e.hex.r === tappedHex.r) ?? null;
  }

  // ------------------------------------------------------------ simulation loop

  override update(time: number, delta: number): void {
    if (!this.battle) return;
    const rules = this.run.battleRules;
    if (!this.paused && !this.finished) {
      const stepMs = 1000 / rules.ticksPerSecond;
      const slow = this.slowdownLeft > 0 ? COMBO_SLOWDOWN : 1;
      this.slowdownLeft = Math.max(0, this.slowdownLeft - delta);
      // ?speed=4 fast-forwards battles (for tests).
      const fastForward = getContext(this).params.speed ?? 1;
      // Never try to catch up more than a quarter second (e.g. after the tab was hidden).
      this.accumulator = Math.min(this.accumulator + delta * SPEEDS[this.speedIndex]! * slow * fastForward, 250 * fastForward);
      while (this.accumulator >= stepMs && !this.battle.outcome) {
        stepBattle(this.battle, rules);
        this.showEvents(this.battle.events, time);
        this.accumulator -= stepMs;
      }
    }
    for (const id of this.selected) if (!this.battle.heads.some((h) => h.id === id)) this.selected.delete(id);
    this.syncSprites();
    this.draw(delta);
    if (this.battle.outcome && !this.finished) this.finish();
  }

  // ------------------------------------------------------------ drawing

  /** Creates and removes images so there is exactly one set per head, enemy, stump and cloud. */
  private syncSprites(): void {
    const { heads } = getContext(this).data;
    const body = this.bodyCenter();

    const headIds = new Set(this.battle.heads.map((h) => h.id));
    for (const [id, view] of this.heads) {
      if (headIds.has(id)) continue;
      view.sprite.destroy();
      view.jaw.destroy();
      this.heads.delete(id);
    }
    for (const head of this.battle.heads) {
      if (this.heads.has(head.id)) continue;
      const base = this.neckBase(body, head.anchorAngle);
      const tint = color(heads.classes[head.classId]?.color ?? '#cccccc');
      const sprite = this.add.image(base.x, base.y, 'battle_head').setDepth(DEPTH.heads).setTint(tint);
      const jaw = this.add.image(base.x, base.y, 'battle_head_jaw').setDepth(DEPTH.jaws).setTint(tint);
      jaw.setOrigin(this.jawHinge.x / jaw.width, this.jawHinge.y / jaw.height);
      // New heads start at the stump and grow out from there.
      this.heads.set(head.id, {
        sprite,
        jaw,
        x: base.x,
        y: base.y,
        lungeUntil: 0,
        lungeTo: base,
        recoilUntil: 0,
        recoilFrom: base,
        phase: this.heads.size * 1.7 + head.anchorAngle,
      });
    }

    const enemyIds = new Set(this.battle.enemies.map((e) => e.id));
    for (const [id, view] of this.enemies) {
      if (enemyIds.has(id)) continue;
      this.fallDown(view);
      this.enemies.delete(id);
    }
    for (const enemy of this.battle.enemies) {
      if (this.enemies.has(enemy.id)) continue;
      const key = `battle_enemy_${enemy.typeId}`;
      const feet = this.hexFeet(enemy.hex);
      const sprite = this.add.image(feet.x, feet.y, this.textures.exists(key) ? key : 'battle_enemy_manAtArms').setOrigin(0.5, 1);
      const shadow = this.hd
        ? this.softShadow(SHADOW.soldier).setPosition(feet.x, feet.y)
        : this.add.image(feet.x, feet.y, 'battle_shadow').setTint(0x000000).setAlpha(0.45).setDepth(DEPTH.shadow);
      const glow = this.hd
        ? this.add
            .image(feet.x, feet.y, LIGHT_TEXTURE)
            .setScale(BATTLE_LIGHTS.torch.glowSize / LIGHT_TEXTURE_SIZE)
            .setTint(color(getContext(this).data.palette.order.orange))
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.glow)
            .setVisible(false)
        : null;
      this.enemies.set(enemy.id, { sprite, shadow, glow, lungeUntil: 0, lungeTo: feet, phase: enemy.id * 2.3, feet });
    }

    const stumpIds = new Set(this.battle.stumps.map((s) => s.id));
    for (const [id, sprite] of this.stumpSprites) {
      if (stumpIds.has(id)) continue;
      sprite.destroy();
      this.stumpSprites.delete(id);
    }
    for (const stump of this.battle.stumps) {
      if (!this.stumpSprites.has(stump.id)) this.stumpSprites.set(stump.id, this.add.image(0, 0, 'battle_stump').setDepth(DEPTH.necks - 1));
    }

    const cloudIds = new Set(this.battle.clouds.map((c) => c.id));
    for (const [id, puffs] of this.mistPuffs) {
      if (cloudIds.has(id)) continue;
      for (const puff of puffs) puff.destroy();
      this.mistPuffs.delete(id);
    }
    for (const cloud of this.battle.clouds) {
      if (this.mistPuffs.has(cloud.id)) continue;
      const puffs = boardHexes(this.run.battleRules)
        .filter((h) => hexDistance(h, cloud.center) <= cloud.radius)
        .map((h) => {
          const p = this.hexCenter(h);
          // HD: soft puffs like the soft patches under them, unless there is a drawn puff.
          const puff = this.hd && !this.hasArt('battle_mist_puff')
            ? this.add.image(p.x, p.y - 10, LIGHT_TEXTURE).setScale(MIST_PUFF.width / LIGHT_TEXTURE_SIZE, MIST_PUFF.height / LIGHT_TEXTURE_SIZE)
            : this.add.image(p.x, p.y - 10, 'battle_mist_puff');
          return puff.setDepth(DEPTH.mist).setAlpha(0).setData('x0', p.x);
        });
      this.mistPuffs.set(cloud.id, puffs);
    }
  }

  private draw(delta: number): void {
    const rules = this.run.battleRules;
    const now = this.time.now;
    const body = this.bodyCenter();
    this.bodySprite.setPosition(Math.round(body.x), Math.round(body.y)).setDepth(DEPTH.standing + body.y / 1000);
    this.bodyShadow?.setPosition(body.x, body.y + SHADOW.body.below);

    for (const enemy of this.battle.enemies) this.drawEnemy(enemy, body, now);
    this.drawMist(now);
    this.drawHeads(body, now, delta);

    for (const stump of this.battle.stumps) {
      const p = this.neckBase(body, stump.anchorAngle);
      this.stumpSprites.get(stump.id)?.setPosition(Math.round(p.x), Math.round(p.y)).setTexture(stump.cauterized ? 'battle_scar' : 'battle_stump');
    }

    this.drawMarks();
    this.drawOverlay(body);
    if (this.light) this.drawLights(now);
    const { text } = getContext(this).data;
    this.bodyHpText.setText(`${text.battle.body} ${Math.max(0, Math.ceil(this.battle.body.hp))}/${this.battle.body.maxHp}`);
    this.cards.update(
      this.battle.heads.map((h) => ({ ...h, charge: 1 - h.cooldown / rules.headClasses[h.classId]!.attack.cooldownTicks })),
      this.selected,
    );
  }

  private drawEnemy(enemy: Enemy, body: Point, now: number): void {
    const view = this.enemies.get(enemy.id);
    if (!view) return;
    const { point, hop } = this.walkerPosition(enemy, enemy.hex);
    let x = point.x;
    let y = point.y + FEET_BELOW_HEX_CENTER;
    view.feet = { x, y };
    view.shadow.setPosition(Math.round(x), Math.round(y));
    // Standing still they shift their weight a little; walking they hop; attacking they lunge.
    y -= hop > 0 ? Math.round(hop * 3) : Math.sin(now / 280 + view.phase) > 0.6 ? 1 : 0;
    if (now < view.lungeUntil) {
      x += Math.sign(view.lungeTo.x - x) * 3;
      y += Math.sign(view.lungeTo.y - y) * 2;
    }
    const facingLeft = hop > 0 ? this.hexCenter(enemy.hex).x < this.hexCenter(enemy.stepFrom).x : x > body.x;
    view.sprite
      .setPosition(Math.round(x), Math.round(y))
      .setFlipX(facingLeft)
      .setDepth(DEPTH.standing + view.feet.y / 1000);
  }

  private drawHeads(body: Point, now: number, delta: number): void {
    const rules = this.run.battleRules;
    const follow = 1 - Math.exp(-Math.max(delta, 1) / HEAD_FOLLOW_MS);
    this.necks.clear();
    for (const head of this.battle.heads) {
      const view = this.heads.get(head.id);
      if (!view) continue;
      const base = this.neckBase(body, head.anchorAngle);
      const target = head.targetId !== null ? this.enemies.get(head.targetId) : undefined;
      const melee = rules.headClasses[head.classId]!.attack.melee;
      let want: Point;
      let facing = Math.cos(head.anchorAngle) >= 0 ? 1 : -1;
      if (target && melee) {
        // Biting: right beside the enemy, at chest height, on the side facing the body.
        const side = target.feet.x >= body.x ? 1 : -1;
        want = { x: target.feet.x - side * 17, y: target.feet.y - 21 };
        facing = side;
      } else if (target) {
        // Spitting or breathing from the body: leaning towards the enemy.
        const dx = target.feet.x - base.x;
        const dy = target.feet.y - base.y;
        const d = Math.hypot(dx, dy) || 1;
        want = { x: base.x + (dx / d) * 22, y: base.y + (dy / d) * 12 - 20 };
        facing = dx >= 0 ? 1 : -1;
      } else {
        // Resting: raised above its side of the body, swaying a little.
        want = {
          x: base.x + Math.cos(head.anchorAngle) * 16 + Math.sin(now / 700 + view.phase) * 2,
          y: base.y + Math.sin(head.anchorAngle) * 8 - 22 + Math.cos(now / 900 + view.phase) * 1.5,
        };
      }
      view.x += (want.x - view.x) * follow;
      view.y += (want.y - view.y) * follow;
      let x = view.x;
      let y = view.y;
      // How far into its bite the head is: 0 at rest, 1 with the mouth wide open, half way through the lunge.
      let bite = 0;
      if (now < view.lungeUntil) {
        const dx = view.lungeTo.x - x;
        const dy = view.lungeTo.y - y;
        const d = Math.hypot(dx, dy) || 1;
        x += (dx / d) * 6;
        y += (dy / d) * 6;
        bite = Math.sin((1 - (view.lungeUntil - now) / HEAD_LUNGE_MS) * Math.PI);
      }
      if (now < view.recoilUntil) {
        const dx = x - view.recoilFrom.x;
        const dy = y - view.recoilFrom.y;
        const d = Math.hypot(dx, dy) || 1;
        const jolt = HEAD_RECOIL_PX * Math.sin(((view.recoilUntil - now) / HEAD_RECOIL_MS) * Math.PI);
        x += (dx / d) * jolt;
        y += (dy / d) * jolt;
      }
      x = Math.round(x);
      y = Math.round(y);
      this.drawNeck(base, { x, y });
      view.sprite.setPosition(x, y).setFlipX(facing < 0);
      // The jaw hangs under the head and turns around its back end; mirrored (negative scale) when facing left,
      // so it still turns around that end. Its image is as wide as the head's, centred under it.
      view.jaw
        .setPosition(x + facing * (this.jawHinge.x - view.jaw.width / 2), y + view.sprite.height / 2 - JAW_OVERLAP + this.jawHinge.y)
        .setScale(facing, 1)
        .setAngle(facing * bite * JAW_OPEN_DEGREES);
    }
  }

  /** The middle of a drawn head with its jaw, and how far it reaches from there sideways and up and down. */
  private headShape(view: HeadView): { x: number; y: number; halfWidth: number; halfHeight: number } {
    const top = view.y - view.sprite.height / 2;
    const bottom = view.y + view.sprite.height / 2 - JAW_OVERLAP + view.jaw.height;
    return { x: view.x, y: (top + bottom) / 2, halfWidth: view.sprite.width / 2, halfHeight: (bottom - top) / 2 };
  }

  /** A neck as a chain of segments rising from the body in an arc, thinner towards the head. */
  private drawNeck(from: Point, to: Point): void {
    const bend = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 18 };
    const length = Math.hypot(bend.x - from.x, bend.y - from.y) + Math.hypot(to.x - bend.x, to.y - bend.y);
    const discs = Math.max(8, Math.ceil(length / NECK_DISC_SPACING));
    for (const [width, fill] of [[5.5, NECK_OUTLINE], [4.3, NECK_FILL]] as const) {
      this.necks.fillStyle(fill);
      for (let i = 0; i <= discs; i++) {
        const t = i / discs;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * bend.x + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * bend.y + t * t * to.y;
        this.necks.fillCircle(Math.round(x), Math.round(y), width - 1.5 * t);
      }
    }
  }

  /** Mist: tinted hexes under each cloud, and puffs drifting over it (yellow-green when it has turned to acid). */
  private drawMist(now: number): void {
    const { palette } = getContext(this).data;
    const rules = this.run.battleRules;
    const cover = new Map<string, { alpha: number; acid: boolean }>();
    for (const cloud of this.battle.clouds) {
      const acid = isAcid(this.battle, cloud);
      // Thins out over its last second.
      const fade = Math.max(0, Math.min(1, (cloud.untilTick - this.battle.tick) / rules.ticksPerSecond));
      for (const h of boardHexes(rules)) {
        if (hexDistance(h, cloud.center) > cloud.radius) continue;
        const prev = cover.get(hexKey(h));
        cover.set(hexKey(h), { alpha: Math.max(prev?.alpha ?? 0, fade), acid: (prev?.acid ?? false) || acid });
      }
      (this.mistPuffs.get(cloud.id) ?? []).forEach((puff, i) => {
        const drift = Math.round(Math.sin(now / 900 + i * 1.3 + cloud.id) * 3);
        puff
          .setX((puff.getData('x0') as number) + drift)
          .setTint(color(acid ? palette.underground.bioluminescence : palette.mist))
          .setAlpha((acid ? 0.55 : 0.45) * fade);
      });
    }
    for (const [key, tile] of this.mistTiles) {
      const c = cover.get(key);
      tile.setVisible(c !== undefined);
      if (c) tile.setTint(color(c.acid ? palette.underground.bioluminescence : palette.mist)).setAlpha((c.acid ? 0.35 : 0.28) * c.alpha);
    }
  }

  /** Hex outlines: how far the selected heads reach, which enemies they can take, where the body is going. */
  private drawMarks(): void {
    if (this.reach) {
      this.drawMarkLines();
      return;
    }
    const rules = this.run.battleRules;
    for (const mark of this.marks.values()) mark.setVisible(false);
    const show = (h: Hex, tint: number, alpha: number): void => {
      this.marks.get(hexKey(h))?.setVisible(true).setTint(tint).setAlpha(alpha);
    };
    const center = this.battle.body.center;
    const picked = this.battle.heads.filter((h) => this.selected.has(h.id));
    if (picked.length > 0 && !this.finished) {
      const rangeOf = (h: BattleHead) => rules.headClasses[h.classId]!.attack.range;
      const reach = Math.max(...picked.map(rangeOf));
      for (const h of boardHexes(rules)) {
        const d = bodyDistance(center, h);
        if (d >= 1 && d <= reach) show(h, 0xc6e04a, 0.45);
      }
      // Orange: enemies at least one of them can reach. Red: enemies they were ordered to attack.
      const ordered = new Set(picked.map((h) => h.orderTargetId));
      for (const enemy of this.battle.enemies) {
        const inReach = picked.some((h) => bodyDistance(center, enemy.hex) <= rangeOf(h));
        if (ordered.has(enemy.id)) show(enemy.hex, 0xff5030, 0.95);
        else if (inReach) show(enemy.hex, 0xffa030, 0.95);
      }
    }
    if (this.battle.body.moveTarget && !this.finished) show(this.battle.body.moveTarget, 0xe8f0e0, 0.7);
  }

  /**
   * HD: the same marks as lines: one round where the selected heads reach, and a ring round each enemy they can take
   * (orange) or were sent at (red), and round where the body is going. Drawn again only when one of them changes.
   */
  private drawMarkLines(): void {
    const rules = this.run.battleRules;
    const center = this.battle.body.center;
    const picked = this.finished ? [] : this.battle.heads.filter((h) => this.selected.has(h.id));
    const rangeOf = (h: BattleHead): number => rules.headClasses[h.classId]!.attack.range;
    const ordered = new Set(picked.map((h) => h.orderTargetId));
    const rings: Array<{ hex: Hex; tint: number }> = [];
    if (picked.length > 0) {
      for (const enemy of this.battle.enemies) {
        if (ordered.has(enemy.id)) rings.push({ hex: enemy.hex, tint: 0xff5030 });
        else if (picked.some((h) => bodyDistance(center, enemy.hex) <= rangeOf(h))) rings.push({ hex: enemy.hex, tint: 0xffa030 });
      }
    }
    const target = this.finished ? null : this.battle.body.moveTarget;
    if (target) rings.push({ hex: target, tint: 0xe8f0e0 });
    const reach = picked.length > 0 ? Math.max(...picked.map(rangeOf)) : 0;
    const shown = `${hexKey(center)}|${reach}|${rings.map((r) => `${hexKey(r.hex)}:${r.tint}`).join(',')}`;
    const view = this.reach!;
    if (shown === view.shown) return;
    view.shown = shown;
    view.glow.clear();
    view.line.clear();
    const stroke = (outline: Array<{ x: number; y: number }>, tint: number, alpha: number): void => {
      const points = roundCorners(outline, MARK_LINE.rounding).map((p) => new Phaser.Math.Vector2(p.x, p.y));
      view.glow.lineStyle(MARK_LINE.glowWidth, tint, MARK_LINE.glowAlpha).strokePoints(points, true, true);
      view.line.lineStyle(MARK_LINE.width, tint, alpha).strokePoints(points, true, true);
    };
    if (reach > 0) {
      // With the body's own hexes, so the line goes only round the outside.
      const area = boardHexes(rules).filter((h) => bodyDistance(center, h) <= reach);
      const tint = color(getContext(this).data.palette.underground.bioluminescence);
      for (const outline of hexOutlines(area, LAYOUT)) stroke(outline, tint, 0.85);
    }
    for (const ring of rings) stroke(hexOutlines([ring.hex], LAYOUT)[0]!, ring.tint, 0.95);
  }

  /** HD: torches light the board warm around them, acid clouds glow a little, and the board darkens towards its edges. */
  private drawLights(now: number): void {
    const { palette } = getContext(this).data;
    const rules = this.run.battleRules;
    const lights: Light[] = [{ ...BATTLE_LIGHTS.middle }];
    const { torch } = BATTLE_LIGHTS;
    for (const enemy of this.battle.enemies) {
      const view = this.enemies.get(enemy.id);
      if (!view) continue;
      const burning = canCauterize(this.battle, enemy, rules);
      view.glow?.setVisible(burning);
      if (!burning) continue;
      const flicker = 1 - torch.flicker * (0.5 + 0.5 * Math.sin(now / 90 + view.phase) * Math.sin(now / 37 + view.phase * 2));
      const flame = { x: view.sprite.x + (view.sprite.flipX ? -TORCH_FLAME.x : TORCH_FLAME.x), y: view.sprite.y - TORCH_FLAME.y };
      view.glow?.setPosition(flame.x, flame.y).setAlpha(torch.glowAlpha * flicker);
      lights.push({ ...flame, radius: torch.radius, color: color(palette.order.orange), strength: torch.strength * flicker });
    }
    for (const cloud of this.battle.clouds) {
      if (!isAcid(this.battle, cloud)) continue;
      const c = this.hexCenter(cloud.center);
      lights.push({ x: c.x, y: c.y, radius: (cloud.radius + 1) * TILE.width, color: color(palette.underground.bioluminescence), strength: BATTLE_LIGHTS.acid });
    }
    this.light!.draw(lights);
  }

  /** HP bars, status marks, the selection ring, the order line, stump timers. */
  private drawOverlay(body: Point): void {
    const g = this.overlay;
    const rules = this.run.battleRules;
    const { combos } = getContext(this).data;
    g.clear();

    for (const enemy of this.battle.enemies) {
      const view = this.enemies.get(enemy.id);
      if (!view) continue;
      const top = view.feet.y - 44;
      hpBar(g, view.feet.x, top, 18, enemy.hp / enemy.maxHp, 0xd04030);
      if (enemy.armorBroken) {
        g.lineStyle(1, 0xd9a93b);
        g.strokeRect(Math.round(view.feet.x - 10) - 0.5, Math.round(top) - 1.5, 21, 5);
      }
      // One small square per status above the HP bar; grey = torch out.
      const marks = enemy.statuses.map((s) => color(combos.statuses[s.id]?.color ?? '#ffffff'));
      if (this.battle.tick < enemy.torchOutUntilTick) marks.push(0x777777);
      marks.forEach((fill, i) => {
        const x = Math.round(view.feet.x - 9 + i * 5);
        const y = Math.round(top - 6);
        g.fillStyle(0x000000);
        g.fillRect(x, y, 4, 4);
        g.fillStyle(fill);
        g.fillRect(x + 1, y + 1, 2, 2);
      });
      if (enemy.cauterizingStumpId !== null) {
        const stump = this.battle.stumps.find((s) => s.id === enemy.cauterizingStumpId);
        const cauterizeTicks = rules.enemyTypes[enemy.typeId]!.cauterizeTicks ?? 1;
        if (stump) hpBar(g, view.feet.x, view.feet.y + 3, 18, stump.cauterizeProgress / cauterizeTicks, 0xffa030);
      }
    }
    for (const head of this.battle.heads) {
      const view = this.heads.get(head.id);
      if (!view) continue;
      const shape = this.headShape(view);
      hpBar(g, shape.x, shape.y - shape.halfHeight - 4, 20, head.hp / head.maxHp, 0x7fc05a);
      if (!this.selected.has(head.id)) continue;
      g.lineStyle(1, 0xc6e04a);
      g.strokeEllipse(Math.round(shape.x), Math.round(shape.y), shape.halfWidth * 2 + 6, shape.halfHeight * 2 + 6);
      const ordered = head.orderTargetId !== null ? this.enemies.get(head.orderTargetId) : undefined;
      if (ordered) {
        g.lineStyle(1, 0xff5030, 0.7);
        g.lineBetween(shape.x, shape.y, ordered.feet.x, ordered.feet.y - 16);
      }
    }
    // Regrowth timer under each open stump.
    for (const stump of this.battle.stumps) {
      if (stump.cauterized) continue;
      const p = this.neckBase(body, stump.anchorAngle);
      hpBar(g, p.x, p.y + 6, 12, 1 - (stump.regrowAtTick - this.battle.tick) / rules.regrowTicks, 0xc6e04a);
    }
  }

  private fallDown(view: EnemyView): void {
    view.shadow.destroy();
    view.glow?.destroy();
    this.tweens.add({ targets: view.sprite, alpha: 0, y: view.sprite.y + 4, duration: 500, onComplete: () => view.sprite.destroy() });
  }

  private showEvents(events: readonly BattleEvent[], now: number): void {
    const { text, combos, palette } = getContext(this).data;
    const body = this.bodyCenter();
    const above = { x: body.x, y: body.y - 40 };
    for (const event of events) {
      switch (event.type) {
        case 'hit':
          this.showHit(event, now);
          break;
        case 'severed':
          this.floatText(above, text.battle.severed.replace('{name}', event.name), '#ff8060');
          this.cameras.main.shake(120, 0.004);
          break;
        case 'regrown':
          this.floatText(above, text.battle.regrown, '#c6e04a');
          break;
        case 'cauterized':
          this.floatText(above, text.battle.cauterized, '#ffcf5c');
          break;
        case 'combo': {
          const name = combos.combos.find((c) => c.id === event.comboId)?.displayName ?? event.comboId;
          const at = this.hexFeet(event.at);
          this.floatText({ x: at.x, y: at.y - 50 }, name, palette.order.gold, '12px');
          this.slowdownLeft = COMBO_SLOWDOWN_MS;
          this.combosSeen.push(event.comboId);
          break;
        }
        default:
          break;
      }
    }
  }

  /** Who hit whom: the attacker lunges, the one hit flashes. */
  private showHit(event: Extract<BattleEvent, { type: 'hit' }>, now: number): void {
    const hitAt = this.hexFeet(event.at);
    if (event.attacker === 'head' && typeof event.attackerId === 'string') {
      const view = this.heads.get(event.attackerId);
      if (view) Object.assign(view, { lungeUntil: now + HEAD_LUNGE_MS, lungeTo: { x: hitAt.x, y: hitAt.y - 16 } });
    }
    const headHit = event.targetKind === 'head' ? this.heads.get(event.targetId as string) : undefined;
    if (event.attacker === 'enemy' && typeof event.attackerId === 'number') {
      const view = this.enemies.get(event.attackerId);
      if (view) Object.assign(view, { lungeUntil: now + 120, lungeTo: headHit ? { x: headHit.x, y: headHit.y } : this.bodyCenter() });
      if (view && headHit) Object.assign(headHit, { recoilUntil: now + HEAD_RECOIL_MS, recoilFrom: { x: view.feet.x, y: view.feet.y - 20 } });
    }
    const sprite =
      event.targetKind === 'enemy' ? this.enemies.get(event.targetId as number)?.sprite : event.targetKind === 'head' ? headHit?.sprite : this.bodySprite;
    if (sprite) this.flash(sprite);
    if (headHit) this.flash(headHit.jaw);
  }

  private flash(sprite: Phaser.GameObjects.Image): void {
    const originalTint = sprite.tint;
    sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => {
      if (!sprite.active) return;
      sprite.setTintMode(Phaser.TintModes.MULTIPLY).setTint(originalTint);
    });
  }

  private floatText(at: Point, message: string, textColor: string, fontSize = '10px'): void {
    const label = this.add
      .text(Math.round(at.x), Math.round(at.y), message, {
        fontFamily: FONT.callout,
        fontSize,
        color: textColor,
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text);
    this.tweens.add({ targets: label, y: label.y - 16, alpha: 0, delay: 700, duration: 700, onComplete: () => label.destroy() });
  }

  // ------------------------------------------------------------ end of battle

  private finish(): void {
    this.finished = true;
    this.updateButtons();
    this.drawMarks();
    const { palette, text } = getContext(this).data;
    const { width } = SCREEN;
    const won = this.battle.outcome === 'won';
    const result = battleResult(this.battle, this.run.battleRules);

    const panel = this.add.container(width / 2, ARENA_TOP + 110).setDepth(DEPTH.ui + 10);
    const box = this.add.rectangle(0, 0, 300, 90, color(palette.underground.black), 0.95).setStrokeStyle(1, color(won ? palette.underground.bioluminescence : palette.order.bannerRed));
    const title = this.add
      .text(0, -22, won ? text.battle.victoryTitle : text.battle.defeatTitle, {
        fontFamily: FONT.title,
        fontSize: '13px',
        color: won ? '#e8f0e0' : palette.order.fire,
        align: 'center',
        wordWrap: { width: 280 },
      })
      .setOrigin(0.5);
    const button = new Button(
      this,
      0,
      22,
      text.battle.continueButton,
      { width: 120, height: 24, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' },
      () => {
        this.run.finishBattle(result);
        this.scene.start(SceneKey.Map);
      },
    );
    panel.add([box, title, button]);
  }
}

/** The point the lower jaw turns around: the top of its back end (its leftmost drawn column), in image pixels. */
function jawHinge(textures: Phaser.Textures.TextureManager): Point {
  const { width, height } = textures.getFrame('battle_head_jaw');
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) if ((textures.getPixelAlpha(x, y, 'battle_head_jaw') ?? 0) > 0) return { x, y };
  }
  return { x: width / 2, y: 0 }; // an empty jaw (the placeholder head has its jaw drawn in)
}

function hpBar(g: Phaser.GameObjects.Graphics, cx: number, y: number, width: number, share: number, fill: number): void {
  const x = Math.round(cx - width / 2);
  g.fillStyle(0x000000, 0.8);
  g.fillRect(x - 1, Math.round(y) - 1, width + 2, 4);
  g.fillStyle(fill);
  g.fillRect(x, Math.round(y), Math.round(width * Math.max(0, Math.min(1, share))), 2);
}
