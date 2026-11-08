// A small map of everything the hydra knows of the map she is on, in the bottom-left corner of the map screen.
// One dot per hex, coloured by its biome and ground; brighter where the hydra sees now; on the surface, mist paler.
// Tapping it moves the view to that part of the map.

import * as Phaser from 'phaser';
import type { GameData } from '../data';
import { color } from '../scenes/context';
import type { RunController } from '../scenes/RunController';
import { hexKey, hexRound } from '../sim/hex';
import type { Hex } from '../sim/hex';
import { hasMist, mapOf, visibilityOf } from '../sim/turn';

/** Size of one hex on the minimap, in screen pixels: across, and from row to row (for a map of FULL_SIZE_RADIUS or less). */
const DOT = { across: 2.2, down: 1.85 };
/** A bigger map (the Big World, GAME_DESIGN.md §5.1) gets smaller dots, so the minimap keeps its size on the screen. */
const FULL_SIZE_RADIUS = 20;
const PADDING = 4;

export class Minimap {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly center: { x: number; y: number };
  /** One hex on this minimap: across, from row to row, and the side of a dot. */
  private readonly cell: { across: number; down: number; scale: number };
  /** Where the minimap's panel starts on the screen (things above it line up with it). */
  readonly top: number;
  readonly left: number;
  readonly width: number;

  constructor(
    scene: Phaser.Scene,
    left: number,
    bottom: number,
    private readonly run: RunController,
    private readonly data: GameData,
    onLookAt: (h: Hex) => void,
  ) {
    const radius = run.state.map.radius;
    const scale = Math.min(1, FULL_SIZE_RADIUS / radius);
    this.cell = { across: DOT.across * scale, down: DOT.down * scale, scale };
    const width = Math.ceil((radius * 2 + 1) * this.cell.across) + PADDING * 2;
    const height = Math.ceil((radius * 2 + 1) * this.cell.down) + PADDING * 2;
    const top = bottom - height;
    this.top = top;
    this.left = left;
    this.width = width;
    this.center = { x: left + width / 2, y: top + height / 2 };
    const panel = scene.add
      .rectangle(left, top, width, height, color(data.palette.underground.black), 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x2c3a3a)
      .setInteractive();
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Pointer positions are canvas pixels; the HUD's camera turns them into screen units (they differ in HD).
      const at = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const r = (at.y - this.center.y) / this.cell.down;
      const q = (at.x - this.center.x) / this.cell.across - r / 2;
      onLookAt(hexRound(q, r));
    });
    this.graphics = scene.add.graphics();
  }

  redraw(): void {
    const g = this.graphics;
    g.clear();
    const { state } = this.run;
    const { hydra } = state;
    const map = mapOf(state);
    const visibility = visibilityOf(state);
    const up = hydra.layer === 'surface';
    const echoes = up ? [] : state.echoes;
    // Terrain dots are a little taller than the row step, so rows touch instead of leaving dark stripes between them.
    const { across, down, scale } = this.cell;
    const dot = (h: Hex, fill: number, alpha = 1, size = 2) => {
      const side = Math.max(1, size * scale);
      g.fillStyle(fill, alpha);
      g.fillRect(this.center.x + (h.q + h.r / 2) * across - side / 2, this.center.y + h.r * down - side / 2, side + scale, side + scale);
    };
    for (const [key, seen] of visibility) {
      const tile = map.tiles.get(key);
      if (!tile) continue;
      const colors = this.data.biomes.biomes[tile.biome]?.colors;
      if (!colors) continue;
      const fill = tile.terrain === 'rock' ? colors.rock : (colors.grounds?.[tile.terrain] ?? (tile.terrain === 'water' ? colors.water : colors.ground));
      dot(tile.hex, color(fill), seen === 'visible' ? 1 : 0.6);
      if (up && hasMist(state, tile.hex)) dot(tile.hex, color(this.data.palette.mist), 0.45);
    }
    // Things worth finding again: the lair, shrines, passages, places, thresholds, the Order's people, event sites, echoes.
    const { palette } = this.data;
    for (const key of visibility.keys()) {
      const tile = map.tiles.get(key);
      const object = tile?.object;
      if (!tile || !object) continue;
      if (object.kind === 'lair') dot(tile.hex, color(palette.underground.bioluminescence), 1, 3);
      else if (object.kind === 'shrine' && !object.used) dot(tile.hex, 0x7fe0d6, 1, 2);
      else if (object.kind === 'passage') dot(tile.hex, 0xd0e4dc, 1, 2);
      else if (object.kind === 'place') dot(tile.hex, color(palette.order.gold), 1, 2);
      else if (object.kind === 'threshold' && object.state !== 'hidden') dot(tile.hex, object.state === 'open' ? 0xe8e0d0 : color(palette.order.orange), 1, 2);
      else if (object.kind === 'encounter') dot(tile.hex, color(palette.order.bannerRed), 1, 2);
      else if (object.kind === 'event' && !object.done) dot(tile.hex, 0x5fd8c8, 1, 2);
      else if (object.kind === 'flameShrine') dot(tile.hex, object.burning ? color(palette.order.fire) : 0x8a9a8a, 1, 2);
      else if (object.kind === 'castle') dot(tile.hex, color(palette.order.gold), 1, 3);
      else if (object.kind === 'settlement') dot(tile.hex, object.settlementId === 'camp' ? color(palette.order.bannerRed) : 0xc8b898, 1, 2);
    }
    for (const echo of echoes) if (!visibility.has(hexKey(echo.source))) dot(echo.mark, 0xa8c8d8, 0.9, 1);
    dot(hydra.position, 0xffffff, 1, 3);
  }
}
