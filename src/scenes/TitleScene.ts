// The title screen: Continue the living lineage (or Begin the first one), start a New Lineage (after asking), and
// open the Book of Lineages (GAME_DESIGN.md §12).

import * as Phaser from 'phaser';
import { color, getContext } from './context';
import { lineages } from './LineageKeeper';
import { SceneKey } from './sceneKeys';
import { fitScreenCamera } from './view';
import { SCREEN } from '../scaling';
import { exposeButtons, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import type { ButtonStyle } from '../ui/Button';
import { FONT } from '../ui/fonts';
import { onKeyDown } from '../ui/keys';
import { fillText } from '../ui/mutationText';

/** The first button stays where a tap used to start the game (the smoke test taps it). */
const FIRST_BUTTON_Y = 200;
const BUTTON_GAP = 32;

export class TitleScene extends Phaser.Scene {
  private confirm: Phaser.GameObjects.Container | null = null;
  private buttons: Record<string, { x: number; y: number }> = {};

  constructor() {
    super(SceneKey.Title);
  }

  create(): void {
    const { data } = getContext(this);
    const { palette, text } = data;
    const words = text.lineages;
    const { width } = SCREEN;
    const keeper = lineages(this);
    fitScreenCamera(this);
    this.confirm = null;
    this.buttons = {};

    this.add.image(0, 0, 'title_background').setOrigin(0, 0);

    this.add
      .text(width / 2, 70, text.title.gameTitle, {
        fontFamily: FONT.title,
        fontSize: '56px',
        fontStyle: 'bold',
        color: palette.underground.bioluminescence,
        stroke: palette.underground.black,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 116, text.title.subtitle, {
        fontFamily: FONT.story,
        fontSize: '12px',
        fontStyle: 'italic',
        color: palette.mist,
      })
      .setOrigin(0.5);

    const lineage = keeper.lineage();
    if (lineage) {
      const line = keeper.heiressWaits()
        ? fillText(words.awaiting, { lineage: lineage.name })
        : fillText(words.living, { name: lineage.hydraName, lineage: lineage.name, generation: lineage.generation });
      this.add
        .text(width / 2, FIRST_BUTTON_Y - 30, line, { fontFamily: FONT.story, fontSize: '11px', color: '#e8e0d0', backgroundColor: '#05090acc', padding: { x: 6, y: 2 } })
        .setOrigin(0.5);
    }

    const style: ButtonStyle = { width: 160, height: 26, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '12px' };
    const quiet: ButtonStyle = { ...style, fill: 0x101618, border: 0x5a6a6a, textColor: '#d8e4d0', fontSize: '11px' };
    let y = FIRST_BUTTON_Y;
    const add = (name: string, label: string, look: ButtonStyle, onPress: () => void): void => {
      new Button(this, width / 2, y, label, look, onPress);
      this.buttons[name] = { x: width / 2, y };
      y += BUTTON_GAP;
    };
    let primary: () => void;
    if (lineage) {
      primary = () => this.continueGame();
      add('continue', words.continueButton, style, primary);
      add('newLineage', words.newLineageButton, quiet, () => this.askNewLineage());
    } else {
      primary = () => this.begin();
      add('begin', words.beginButton, style, primary);
    }
    if (keeper.profile.lineages.length > 0) add('book', words.bookButton, quiet, () => this.scene.start(SceneKey.Book));

    onKeyDown(this, (event) => {
      if (this.confirm) {
        if (event.key === 'Escape') this.closeConfirm();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') primary();
    });

    this.cameras.main.setBackgroundColor(color(palette.underground.black));
    exposeButtons(() => ({ ...this.buttons }));
    markReady(SceneKey.Title);
  }

  private begin(): void {
    lineages(this).newLineage();
    this.scene.start(SceneKey.Map);
  }

  private continueGame(): void {
    const where = lineages(this).continueGame();
    this.scene.start(where === 'generation' ? SceneKey.Generation : SceneKey.Map);
  }

  /** New Lineage ends the living one: asked first, because her mutations are lost. */
  private askNewLineage(): void {
    const keeper = lineages(this);
    const lineage = keeper.lineage();
    if (!lineage) return this.begin();
    const { palette, text } = getContext(this).data;
    const words = text.lineages;
    const { width, height } = SCREEN;
    const panel = this.add.container(width / 2, height / 2).setDepth(100);
    // Full-screen dimmer: also stops taps from reaching the buttons below.
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setInteractive();
    const box = this.add.rectangle(0, 0, 380, 140, color(palette.underground.black), 0.97).setStrokeStyle(1, color(palette.order.bannerRed));
    const title = this.add.text(0, -48, fillText(words.confirmTitle, { lineage: lineage.name }), { fontFamily: FONT.title, fontSize: '14px', color: palette.order.fire }).setOrigin(0.5);
    const name = keeper.heiressWaits() ? lineage.chronicle[lineage.chronicle.length - 1]?.name ?? lineage.hydraName : lineage.hydraName;
    const body = this.add
      .text(0, -10, fillText(words.confirmBody, { name }), { fontFamily: FONT.story, fontSize: '11px', color: '#e8e0d0', align: 'center', wordWrap: { width: 340 } })
      .setOrigin(0.5);
    const look = { width: 130, height: 24, textColor: '#ffffff', fontSize: '11px' };
    const yes = new Button(this, -74, 44, words.confirmYes, { ...look, fill: 0x3a1010, border: color(palette.order.bannerRed) }, () => {
      keeper.newLineage();
      this.scene.start(SceneKey.Map);
    });
    const no = new Button(this, 74, 44, words.confirmNo, { ...look, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence) }, () => this.closeConfirm());
    panel.add([dim, box, title, body, yes, no]);
    this.confirm = panel;
    this.buttons.confirmYes = { x: width / 2 - 74, y: height / 2 + 44 };
    this.buttons.confirmNo = { x: width / 2 + 74, y: height / 2 + 44 };
  }

  private closeConfirm(): void {
    this.confirm?.destroy();
    this.confirm = null;
    delete this.buttons.confirmYes;
    delete this.buttons.confirmNo;
  }
}
