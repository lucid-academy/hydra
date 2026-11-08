// The menu (M7), on the map and in battle: Resume, the sound's volume, on the map its view (Near or Far, §5.9), the
// world's seed, and Quit to the title.
// It covers the whole screen with a dim layer, so nothing under it can be pressed while it is open. The game is
// saved after every move, so quitting loses nothing (in a battle, the battle starts over when the game goes on).

import * as Phaser from 'phaser';
import { soundBoard } from '../audio/SoundBoard';
import type { MapView } from '../save/settings';
import { color, getContext } from '../scenes/context';
import { SCREEN } from '../scaling';
import { Button } from './Button';
import { FONT } from './fonts';

/** The volumes the Sound button goes round (0 = off). */
const VOLUMES = [1, 0.6, 0.3, 0] as const;
const PANEL = { width: 220, height: 150 } as const;
/** The map's view button adds a row. */
const VIEW_ROW = 24;

export interface GameMenuOptions {
  seed: number;
  /** A battle is being fought (Quit says it will start over). */
  inBattle: boolean;
  /** On the map: the view now and the switch between Near and Far. */
  view?: { now: () => MapView | null; toggle: () => void };
  onOpen?: () => void;
  onQuit: () => void;
}

export class GameMenu {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly soundButton: Button;
  private readonly viewButton: Button | null;

  constructor(
    private readonly scene: Phaser.Scene,
    depth: number,
    private readonly options: GameMenuOptions,
  ) {
    const { palette, text } = getContext(scene).data;
    const words = text.menu;
    const { width, height } = SCREEN;
    const cx = width / 2;
    const extra = options.view ? VIEW_ROW : 0;
    const panelHeight = PANEL.height + extra;
    const top = height / 2 - panelHeight / 2;
    // The dim layer takes every press, so the map and the board under it don't.
    const dim = scene.add.rectangle(0, 0, width, height, color(palette.underground.black), 0.7).setOrigin(0, 0).setInteractive();
    const panel = scene.add
      .rectangle(cx, height / 2, PANEL.width, panelHeight, color(palette.underground.black), 0.96)
      .setStrokeStyle(1, color(palette.order.gold), 0.9);
    const title = scene.add.text(cx, top + 8, words.title.toUpperCase(), { fontFamily: FONT.title, fontSize: '12px', color: palette.order.gold }).setOrigin(0.5, 0);
    const style = { width: 160, height: 20, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#e8f0e0', fontSize: '11px' };
    const resume = new Button(scene, cx, top + 38, words.resume, style, () => this.close());
    this.soundButton = new Button(scene, cx, top + 62, '', style, () => this.nextVolume());
    this.viewButton = options.view
      ? new Button(scene, cx, top + 86, '', style, () => {
          options.view?.toggle();
          this.showView();
        })
      : null;
    const quit = new Button(scene, cx, top + 86 + extra, words.quit, { ...style, fill: 0x1a1214, border: color(palette.order.orange) }, () => this.options.onQuit());
    const seed = scene.add.text(cx, top + 104 + extra, words.seed.replace('{seed}', String(options.seed)), { fontFamily: FONT.text, fontSize: '9px', color: palette.mist }).setOrigin(0.5, 0);
    const note = scene.add
      .text(cx, top + 118 + extra, options.inBattle ? words.quitBattle : '', { fontFamily: FONT.text, fontSize: '8px', color: '#9a9a8a', align: 'center', wordWrap: { width: PANEL.width - 16 } })
      .setOrigin(0.5, 0);
    const parts = [dim, panel, title, resume, this.soundButton, ...(this.viewButton ? [this.viewButton] : []), quit, seed, note];
    this.layer = scene.add.container(0, 0, parts).setDepth(depth).setVisible(false);
    this.showVolume();
  }

  get visible(): boolean {
    return this.layer.visible;
  }

  open(): void {
    if (this.visible) return;
    this.showVolume();
    this.showView();
    this.layer.setVisible(true);
    this.options.onOpen?.();
  }

  close(): void {
    this.layer.setVisible(false);
  }

  toggle(): void {
    if (this.visible) this.close();
    else this.open();
  }

  private board() {
    return soundBoard(this.scene, getContext(this.scene).data.sounds);
  }

  /** The Sound button goes round 100%, 60%, 30% and off. */
  private nextVolume(): void {
    const board = this.board();
    const now = board.settings.muted ? 0 : board.settings.volume;
    const at = VOLUMES.findIndex((v) => Math.abs(v - now) < 0.01);
    const next = VOLUMES[(at + 1) % VOLUMES.length] ?? VOLUMES[0];
    if (next === 0) board.setMuted(true);
    else {
      board.setVolume(next);
      board.setMuted(false);
    }
    this.showVolume();
  }

  /** The view button shows the view now, as the Sound button shows the volume now. */
  private showView(): void {
    if (!this.viewButton || !this.options.view) return;
    const { menu } = getContext(this.scene).data.text;
    this.viewButton.setLabel(this.options.view.now() === 'far' ? menu.viewFar : menu.viewNear);
  }

  private showVolume(): void {
    const { menu } = getContext(this.scene).data.text;
    const { settings } = this.board();
    this.soundButton.setLabel(settings.muted || settings.volume === 0 ? menu.soundOff : menu.sound.replace('{n}', String(Math.round(settings.volume * 100))));
  }
}
