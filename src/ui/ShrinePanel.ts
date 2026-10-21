// Panel shown while the hydra stands at a shrine of the Great Serpent: the blessing's name, its words,
// what it would change (good for the hydra in green, bad in orange), and Accept or Refuse. A marking shrine offers a
// mutation instead, for her and her heiresses (GAME_DESIGN.md §12).

import * as Phaser from 'phaser';
import type { GameData } from '../data';
import type { BLESSING_EFFECTS } from '../data/schemas';
import { color } from '../scenes/context';
import { Button } from './Button';
import { FONT } from './fonts';
import { mutationEffects, mutationName, mutationWords } from './mutationText';
import { SCREEN } from '../scaling';

type EffectName = (typeof BLESSING_EFFECTS)[number];

/** What the shrine offers: its blessing, or a mark (a mutation). */
export type ShrineOffer = { blessingId: string } | { mark: string };

const WIDTH = 360;
const HEIGHT = 176;
const BUTTON_HEIGHT = 22;

export class ShrinePanel {
  private readonly container: Phaser.GameObjects.Container;
  private shownFor: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly data: GameData,
    private readonly onAccept: () => void,
    private readonly onRefuse: () => void,
  ) {
    const { width, height } = SCREEN;
    this.container = scene.add.container(width / 2, height / 2).setDepth(90).setVisible(false);
  }

  /** Shows the panel for this offer, or hides it (null). */
  show(offer: ShrineOffer | null): void {
    const key = offer === null ? null : 'mark' in offer ? `mark:${offer.mark}` : offer.blessingId;
    if (key !== this.shownFor) {
      this.shownFor = key;
      if (offer) this.build(offer);
    }
    this.container.setVisible(offer !== null);
  }

  private build(offer: ShrineOffer): void {
    const { palette, text } = this.data;
    const shown = 'mark' in offer ? this.markShown(offer.mark) : this.blessingShown(offer.blessingId);
    const { width, height } = SCREEN;
    this.container.removeAll(true);

    // Full-screen dimmer: also stops taps from reaching the map while the panel is open.
    const dim = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.55).setInteractive();
    const box = this.scene.add.rectangle(0, 0, WIDTH, HEIGHT, color(palette.underground.black), 0.96).setStrokeStyle(1, 0x7fe0d6);
    const top = -HEIGHT / 2;
    const title = this.scene.add.text(0, top + 8, shown.title, { fontFamily: FONT.title, fontSize: '10px', color: palette.order.gold }).setOrigin(0.5, 0);
    const name = this.scene.add.text(0, top + 22, shown.name, { fontFamily: FONT.title, fontSize: '15px', color: '#e8e0d0' }).setOrigin(0.5, 0);
    const words = this.scene.add
      .text(0, top + 44, shown.words, { fontFamily: FONT.story, fontSize: '10px', color: '#c8c0b0', align: 'center', wordWrap: { width: WIDTH - 30 } })
      .setOrigin(0.5, 0);

    // What it changes, side by side and centred.
    const effects = shown.effects.map(({ text: label, good }) =>
      this.scene.add
        .text(0, words.y + words.height + 14, label, {
          fontFamily: FONT.text,
          fontSize: '10px',
          color: good ? palette.underground.bioluminescence : palette.order.orange,
        })
        .setOrigin(0, 0),
    );
    const gap = 14;
    let x = -(effects.reduce((sum, t) => sum + t.width, 0) + gap * (effects.length - 1)) / 2;
    for (const t of effects) {
      t.setX(Math.round(x));
      x += t.width + gap;
    }

    // The buttons stay where they are; what is written sits in the middle of the space above them.
    const buttonsY = HEIGHT / 2 - 20;
    const written = [title, name, words, ...effects];
    const writtenBottom = Math.max(...written.map((t) => t.y + t.height));
    const spare = buttonsY - BUTTON_HEIGHT / 2 - 10 - writtenBottom;
    if (spare > 0) for (const t of written) t.setY(Math.round(t.y + spare / 2));

    const style = { width: 110, height: BUTTON_HEIGHT, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' };
    const accept = new Button(this.scene, -62, buttonsY, text.shrine.acceptButton, style, () => this.onAccept());
    const refuse = new Button(this.scene, 62, buttonsY, text.shrine.refuseButton, { ...style, fill: 0x1a1f20, border: 0x5a6a6a }, () => this.onRefuse());
    this.container.add([dim, box, title, name, words, ...effects, accept, refuse]);
  }

  private blessingShown(blessingId: string): { title: string; name: string; words: string; effects: Array<{ text: string; good: boolean }> } {
    const { text, shrines } = this.data;
    const blessing = shrines.blessings.find((b) => b.id === blessingId);
    if (!blessing) throw new Error(`Unknown blessing "${blessingId}"`);
    return {
      title: text.shrine.title,
      name: blessing.name,
      words: blessing.text,
      effects: (Object.entries(blessing.effects) as Array<[EffectName, number]>).map(([effect, n]) => ({
        text: text.shrine.effects[effect].replace('{n}', n > 0 ? `+${n}` : String(n)),
        good: effect === 'alert' ? n < 0 : n > 0,
      })),
    };
  }

  /** A marking shrine: the mutation it offers, for the whole lineage. */
  private markShown(mutationId: string): { title: string; name: string; words: string; effects: Array<{ text: string; good: boolean }> } {
    const { text } = this.data;
    return {
      title: text.lineages.markTitle,
      name: mutationName(this.data, mutationId),
      words: `${mutationWords(this.data, mutationId)}\n${text.lineages.markWords}`,
      effects: mutationEffects(this.data, mutationId),
    };
  }
}
