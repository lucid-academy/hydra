// The Book of Lineages (GAME_DESIGN.md §12), opened from the title: every lineage of the account, newest first, with
// each of its hydras and her epitaph, then the run modifiers the account has unlocked and how to unlock the others.
// Pages turn with the arrows (or ← →); Back (or Esc) goes to the title.

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

/** Where the pages are written. */
const PAGE = { left: 70, width: 500, top: 46, bottom: 306 };
const BUTTONS_Y = 334;

type Line = { text: string; style: Phaser.Types.GameObjects.Text.TextStyle; gapBefore: number; indent: number };

export class BookScene extends Phaser.Scene {
  private pages: Line[][] = [];
  private page = 0;
  private written: Phaser.GameObjects.Text[] = [];
  private pageNumber!: Phaser.GameObjects.Text;
  private previous!: Button;
  private next!: Button;

  constructor() {
    super(SceneKey.Book);
  }

  create(): void {
    const { palette, text } = getContext(this).data;
    const words = text.lineages;
    const { width } = SCREEN;
    fitScreenCamera(this);
    this.cameras.main.setBackgroundColor(color(palette.underground.black));
    this.add.image(0, 0, 'title_background').setOrigin(0, 0).setAlpha(0.12);
    this.add.text(width / 2, 14, words.bookTitle, { fontFamily: FONT.title, fontSize: '16px', color: palette.order.gold }).setOrigin(0.5, 0);
    this.pageNumber = this.add.text(width - 16, 18, '', { fontFamily: FONT.text, fontSize: '9px', color: palette.mist }).setOrigin(1, 0);

    this.pages = this.paginate(this.lines());
    this.page = 0;
    this.written = [];

    const look = { width: 44, height: 24, fill: 0x101618, border: 0x5a6a6a, textColor: '#e8e0d0', fontSize: '14px' };
    this.previous = new Button(this, 40, BUTTONS_Y, '‹', look, () => this.turn(-1));
    this.next = new Button(this, width - 40, BUTTONS_Y, '›', look, () => this.turn(1));
    const back = (): void => {
      this.scene.start(SceneKey.Title);
    };
    new Button(this, width / 2, BUTTONS_Y, words.backButton, { ...look, width: 120, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), fontSize: '11px' }, back);
    onKeyDown(this, (event) => {
      if (event.key === 'ArrowLeft') this.turn(-1);
      if (event.key === 'ArrowRight') this.turn(1);
      if (event.key === 'Escape' || event.key === 'Backspace') back();
    });
    exposeButtons(() => ({ previous: { x: 40, y: BUTTONS_Y }, next: { x: width - 40, y: BUTTONS_Y }, back: { x: width / 2, y: BUTTONS_Y } }));
    this.show();
    markReady(SceneKey.Book);
  }

  /** Everything the book says, line by line: lineages newest first, then the run modifiers. */
  private lines(): Line[] {
    const { palette, text, world } = getContext(this).data;
    const words = text.lineages;
    const keeper = lineages(this);
    const lines: Line[] = [];
    const heading = (t: string): Line => ({ text: t, style: { fontFamily: FONT.title, fontSize: '13px', color: '#e8e0d0' }, gapBefore: lines.length > 0 ? 14 : 0, indent: 0 });
    const name = (t: string): Line => ({ text: t, style: { fontFamily: FONT.title, fontSize: '11px', color: palette.order.fire }, gapBefore: 7, indent: 10 });
    const epitaph = (t: string): Line => ({ text: t, style: { fontFamily: FONT.story, fontSize: '11px', fontStyle: 'italic', color: '#d8d0c0' }, gapBefore: 1, indent: 22 });

    const living = keeper.lineage();
    for (const lineage of [...keeper.profile.lineages].reverse()) {
      const state = lineage.ended ? words.bookEnded : words.bookLiving;
      lines.push(heading(`${fillText(words.lineageName, { lineage: lineage.name })} (${state})`));
      for (const entry of lineage.chronicle) {
        lines.push(name(`${entry.generation}. ${entry.name}  ·  ${fillText(words.bookTurns, { turns: entry.turns })}`));
        lines.push(epitaph(entry.epitaph));
      }
      if (lineage === living) {
        lines.push({ ...name(`${lineage.generation}. ${lineage.hydraName}`), style: { fontFamily: FONT.title, fontSize: '11px', color: palette.underground.bioluminescence } });
        lines.push(epitaph(words.bookStillAlive));
      }
    }
    if (lines.length === 0) lines.push({ text: words.bookEmpty, style: { fontFamily: FONT.story, fontSize: '12px', fontStyle: 'italic', color: palette.mist }, gapBefore: 0, indent: 0 });

    lines.push(heading(words.bookUnlocks));
    for (const [id, modifier] of Object.entries(world.runModifiers)) {
      if (typeof modifier !== 'object') continue;
      const unlocked = keeper.profile.unlocked.includes(id);
      lines.push({
        text: `${modifier.name}: ${unlocked ? words.bookUnlocked : modifier.unlock.text}`,
        style: { fontFamily: FONT.text, fontSize: '10px', color: unlocked ? palette.order.gold : palette.mist },
        gapBefore: 4,
        indent: 10,
      });
    }
    return lines;
  }

  /** Splits the lines into pages that fit, measuring each line as it will be written. A name stays with its epitaph. */
  private paginate(lines: Line[]): Line[][] {
    const measure = this.add.text(0, 0, '', { wordWrap: { width: PAGE.width } }).setVisible(false);
    const height = (line: Line): number => {
      measure.setStyle({ ...line.style, wordWrap: { width: PAGE.width - line.indent } }).setText(line.text);
      return measure.height;
    };
    const pages: Line[][] = [[]];
    let used = 0;
    lines.forEach((line, i) => {
      const keepWith = lines[i + 1]?.indent === 22 && line.indent === 10 ? height(lines[i + 1]!) + lines[i + 1]!.gapBefore : 0;
      const needed = (used > 0 ? line.gapBefore : 0) + height(line);
      if (used > 0 && used + needed + keepWith > PAGE.bottom - PAGE.top) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1]!.push(line);
      used += (used > 0 ? line.gapBefore : 0) + height(line);
    });
    measure.destroy();
    return pages;
  }

  private turn(by: number): void {
    const page = Math.max(0, Math.min(this.pages.length - 1, this.page + by));
    if (page === this.page) return;
    this.page = page;
    this.show();
  }

  private show(): void {
    for (const t of this.written) t.destroy();
    this.written = [];
    let y = PAGE.top;
    for (const line of this.pages[this.page] ?? []) {
      if (this.written.length > 0) y += line.gapBefore;
      const t = this.add.text(PAGE.left + line.indent, y, line.text, { ...line.style, wordWrap: { width: PAGE.width - line.indent } });
      this.written.push(t);
      y += t.height;
    }
    this.pageNumber.setText(this.pages.length > 1 ? `${this.page + 1} / ${this.pages.length}` : '');
    this.previous.setEnabled(this.page > 0).setVisible(this.pages.length > 1);
    this.next.setEnabled(this.page < this.pages.length - 1).setVisible(this.pages.length > 1);
  }
}
