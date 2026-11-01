// The ending (M7, GAME_DESIGN.md §4, answer D1): the Eternal Flame is out. "The Mist Settles": a few lines of what
// it did to the world (castle.json texts.ending), the hydra who did it and her page in the Book of Lineages, where her
// lineage ends as victorious. Then the Book, or the title. Mist drifts across the screen, slowly, and does not lift.

import * as Phaser from 'phaser';
import { color, getContext } from './context';
import { lineages } from './LineageKeeper';
import { SceneKey } from './sceneKeys';
import { fitScreenCamera } from './view';
import { SCREEN } from '../scaling';
import { exposeButtons, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import { FONT } from '../ui/fonts';
import { onKeyDown } from '../ui/keys';
import { fillText } from '../ui/mutationText';
import { LIGHT_TEXTURE, LIGHT_TEXTURE_SIZE, makeSoftTextures } from './mapLight';

const TEXT_WIDTH = 470;
const BUTTONS_Y = 332;
/** The lines come in one after another, this many ms apart; mist banks drift across in this many ms. */
const LOOK = { lineEveryMs: 700, fadeMs: 900, mistBanks: 9, driftMs: 26000 } as const;

export class EndingScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Ending);
  }

  create(): void {
    const { data, params } = getContext(this);
    const { palette, castle, text } = data;
    const words = castle.texts.ending;
    const { width } = SCREEN;
    const keeper = lineages(this);
    // ?scene=ending on a test URL: a hydra who has just won, to look at the screen.
    if (params.scene === SceneKey.Ending && !keeper.lastWin()) keeper.winForTest();
    const win = keeper.lastWin();
    fitScreenCamera(this);
    this.scene.stop(SceneKey.Hud);
    if (!win) {
      this.scene.start(SceneKey.Title);
      return;
    }
    const { lineage, entry } = win;

    this.cameras.main.setBackgroundColor(color(palette.underground.black));
    this.cameras.main.fadeIn(LOOK.fadeMs, 5, 9, 10);
    this.add.image(0, 0, 'title_background').setOrigin(0, 0).setAlpha(0.28).setDepth(-3);
    makeSoftTextures(this);
    this.driftMist(palette.mist);

    const values = { name: entry.name, lineage: lineage.name, turns: entry.turns, generation: entry.generation };
    const items: Phaser.GameObjects.Text[] = [];
    let y = 0;
    const put = (content: string, style: Phaser.Types.GameObjects.Text.TextStyle, gapAfter: number): void => {
      const t = this.add.text(width / 2, y, content, { align: 'center', wordWrap: { width: TEXT_WIDTH }, ...style }).setOrigin(0.5, 0).setAlpha(0);
      items.push(t);
      y += t.height + gapAfter;
    };
    put(words.title, { fontFamily: FONT.title, fontSize: '24px', color: palette.order.gold }, 14);
    for (const line of words.lines) put(fillText(line, values), { fontFamily: FONT.story, fontSize: '12px', color: '#e8e0d0' }, 7);
    y += 6;
    put(fillText(text.lineages.lineageName, { lineage: lineage.name }), { fontFamily: FONT.title, fontSize: '11px', color: '#e8e0d0' }, 2);
    put(entry.name, { fontFamily: FONT.title, fontSize: '18px', color: palette.order.gold }, 2);
    put(entry.epitaph, { fontFamily: FONT.story, fontSize: '11px', fontStyle: 'italic', color: palette.mist }, 0);

    // Centred above the buttons; each line fades in after the one before.
    const shift = Math.max(10, (BUTTONS_Y - 24 - y) / 2);
    items.forEach((t, i) => {
      t.y += Math.round(shift);
      this.tweens.add({ targets: t, alpha: 1, delay: LOOK.fadeMs + i * LOOK.lineEveryMs, duration: LOOK.fadeMs });
    });

    const style = { width: 150, height: 26, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '12px' };
    const toBook = (): void => {
      this.scene.start(SceneKey.Book);
    };
    const toTitle = (): void => {
      this.scene.start(SceneKey.Title);
    };
    const book = new Button(this, width / 2 - 84, BUTTONS_Y, words.book, style, toBook);
    const title = new Button(this, width / 2 + 84, BUTTONS_Y, words.toTitle, style, toTitle);
    onKeyDown(this, (event) => {
      if (event.key === 'Enter' || event.key === ' ') toTitle();
      if (event.key === 'b' || event.key === 'B') toBook();
    });
    exposeButtons(() => ({ book: { x: book.x, y: book.y }, title: { x: title.x, y: title.y } }));
    markReady(SceneKey.Ending);
  }

  /** Banks of mist drifting slowly across the lower half of the screen, round and round. */
  private driftMist(tint: string): void {
    const { width, height } = SCREEN;
    for (let i = 0; i < LOOK.mistBanks; i++) {
      const y = height * 0.45 + (i / LOOK.mistBanks) * height * 0.55;
      const bank = this.add
        .image(-120 + ((i * 197) % (width + 240)), y, LIGHT_TEXTURE)
        .setScale(260 / LIGHT_TEXTURE_SIZE, 60 / LIGHT_TEXTURE_SIZE)
        .setTint(color(tint))
        .setAlpha(0.1 + 0.05 * (i % 3))
        .setDepth(-2);
      const speed = LOOK.driftMs * (0.8 + 0.1 * (i % 4));
      const left = bank.x;
      this.tweens.add({
        targets: bank,
        x: width + 140,
        duration: speed * ((width + 140 - left) / (width + 260)),
        onComplete: () => {
          bank.x = -140;
          this.tweens.add({ targets: bank, x: width + 140, duration: speed, repeat: -1 });
        },
      });
    }
  }
}
