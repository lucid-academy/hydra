// Panel shown while the hydra stands at a place, or next to a closed threshold: what it is, its words, what can be
// done there, and Leave. An action that needs a head class starts with the class, e.g. "[Biter] Gnaw through the roots.";
// one that can't be done now is greyed out, with the reason under it.

import type * as Phaser from 'phaser';
import type { GameData } from '../data';
import { color } from '../scenes/context';
import { Button } from './Button';
import { FONT } from './fonts';
import { SCREEN } from '../scaling';

export interface PlacePanelAction {
  id: string;
  label: string;
  enabled: boolean;
  /** Why it can't be done now (null when it can). */
  why: string | null;
}

/** Everything the panel shows. The HUD builds it from the run state and the data files. */
export interface PlacePanelView {
  /** "A landmark", "A threshold"... */
  kind: string;
  name: string;
  text: string;
  /** A line about the state of things, e.g. how far the digging got (null = none). */
  status: string | null;
  /** What was said after the last action here (null = none). */
  result: string | null;
  actions: PlacePanelAction[];
}

const WIDTH = 380;
const ACTION = { width: 330, height: 20, gap: 4 };
const LEAVE = { width: 110, height: 22 };

/** Where the panel's buttons are on screen (game pixels), for tests. */
export interface PlacePanelButtons {
  leave: { x: number; y: number };
  actions: Array<{ id: string; x: number; y: number; enabled: boolean }>;
}

export class PlacePanel {
  private readonly container: Phaser.GameObjects.Container;
  /** What is on screen now, to rebuild only when it changes. */
  private shown = '';
  buttons: PlacePanelButtons = { leave: { x: 0, y: 0 }, actions: [] };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly data: GameData,
    private readonly onAction: (id: string) => void,
    private readonly onLeave: () => void,
  ) {
    const { width, height } = SCREEN;
    this.container = scene.add.container(width / 2, height / 2).setDepth(90).setVisible(false);
  }

  /** Shows the panel with this content, or hides it (null). */
  show(view: PlacePanelView | null): void {
    const key = view ? JSON.stringify(view) : '';
    if (key !== this.shown) {
      this.shown = key;
      if (view) this.build(view);
    }
    this.container.setVisible(view !== null);
  }

  get visible(): boolean {
    return this.container.visible;
  }

  private build(view: PlacePanelView): void {
    const { palette } = this.data;
    const { width, height } = SCREEN;
    const { add } = this.scene;
    this.container.removeAll(true);

    // Laid out top to bottom first; the box is sized to fit and everything is then moved to centre it.
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 8;
    const line = (text: string, size: number, fill: string, gapAfter: number, font: string = FONT.story): Phaser.GameObjects.Text => {
      const t = add.text(0, y, text, { fontFamily: font, fontSize: `${size}px`, color: fill, align: 'center', wordWrap: { width: WIDTH - 30 } }).setOrigin(0.5, 0);
      parts.push(t);
      y += t.height + gapAfter;
      return t;
    };
    line(view.kind, 10, palette.order.gold, 2, FONT.title);
    line(view.name, 15, '#e8e0d0', 6, FONT.title);
    line(view.text, 10, '#c8c0b0', 6);
    if (view.status) line(view.status, 10, '#d8d0c0', 4);
    if (view.result) line(view.result, 10, palette.underground.bioluminescence, 6);
    y += 2;

    const style = { width: ACTION.width, height: ACTION.height, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '10px' };
    const actionButtons: Button[] = [];
    for (const action of view.actions) {
      const button = new Button(this.scene, 0, y + ACTION.height / 2, action.label, style, () => this.onAction(action.id)).setEnabled(action.enabled);
      actionButtons.push(button);
      y += ACTION.height + ACTION.gap;
      if (action.why) {
        const why = add.text(0, y - 2, action.why, { fontFamily: FONT.text, fontSize: '9px', color: palette.order.orange }).setOrigin(0.5, 0);
        parts.push(why);
        y += why.height + ACTION.gap;
      }
    }
    y += 4;
    const leave = new Button(this.scene, 0, y + LEAVE.height / 2, this.data.text.place.leaveButton, { ...style, width: LEAVE.width, height: LEAVE.height, fill: 0x1a1f20, border: 0x5a6a6a, fontSize: '11px' }, () =>
      this.onLeave(),
    );
    y += LEAVE.height + 8;

    const boxHeight = Math.min(height - 8, y);
    // Full-screen dimmer: also stops taps from reaching the map while the panel is open.
    const dim = add.rectangle(0, 0, width, height, 0x000000, 0.55).setInteractive();
    const box = add.rectangle(0, 0, WIDTH, boxHeight, color(palette.underground.black), 0.96).setStrokeStyle(1, color(palette.order.gold));
    const shift = -boxHeight / 2;
    for (const part of [...parts, ...actionButtons, leave]) {
      const placed = part as unknown as { y: number };
      placed.y = Math.round(placed.y + shift);
    }
    this.container.add([dim, box, ...parts, ...actionButtons, leave]);
    const screen = (b: Button) => ({ x: this.container.x + b.x, y: this.container.y + b.y });
    this.buttons = {
      leave: screen(leave),
      actions: view.actions.map((a, i) => ({ id: a.id, ...screen(actionButtons[i]!), enabled: a.enabled })),
    };
  }
}
