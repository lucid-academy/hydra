// The dialogue screen, in the style of Hades (GAME_DESIGN.md §11): the game dims, the one who speaks shows as a large
// painted portrait (heads on the left, Old Mother Toad on the right), their name on a plate, and the line types itself
// out letter by letter. A tap (or Space, Enter) shows the whole line, the next tap the next line; some dialogues end
// with answers to pick. The Great Serpent has no portrait: his words are centred, in italics, as if from everywhere.
// It shows the run's queued dialogues one after another, then closes and lets the map carry on.

import * as Phaser from 'phaser';
import { SCREEN } from '../scaling';
import { color, getContext } from '../scenes/context';
import { requireRun } from '../scenes/RunController';
import type { RunController } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';
import { fitScreenCamera } from '../scenes/view';
import type { ShownDialogue, ShownLine } from '../sim/turn';
import { exposeDialogue } from '../testHooks';
import { Button } from './Button';
import { FONT } from './fonts';
import { onKeyDown } from './keys';

const BOX = { x: 20, y: 264, width: 600, height: 84, padding: 14 };
/** Portraits stand on the box's top edge (a little behind it), this tall. */
const PORTRAIT = { height: 196, sink: 10, slide: 14, inMs: 200, dimTint: 0x6a6a6a };
/** Old Mother Toad is wider than tall, so she is sized by width. */
const TOAD_WIDTH = 250;
const LETTERS_PER_SECOND = 55;
const CHOICE = { width: 340, height: 22, gap: 5 };
const SERPENT_COLOR = '#7fe0d6';
const TOAD_COLOR = '#b8c870';

type Slot = 'left' | 'right';

export class DialogueScene extends Phaser.Scene {
  private run!: RunController;
  private dialogue!: ShownDialogue;
  /** The lines being shown: the dialogue's, then the reply to the answer picked. */
  private lines: ShownLine[] = [];
  private index = 0;
  private phase: 'lines' | 'choosing' | 'reply' = 'lines';
  private choice: number | null = null;
  private typing: Phaser.Time.TimerEvent | null = null;
  private portraits: Record<Slot, Phaser.GameObjects.Image | null> = { left: null, right: null };
  /** Who stands in each slot: a head's name, or 'toad'. */
  private standing: Record<Slot, string | null> = { left: null, right: null };
  /** Where the last speaker stood. */
  private lastSlot: Slot | null = null;
  private box!: Phaser.GameObjects.Rectangle;
  private name!: Phaser.GameObjects.Text;
  private role!: Phaser.GameObjects.Text;
  private words!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private choiceButtons: Button[] = [];
  private closing = false;

  constructor() {
    super(SceneKey.Dialogue);
  }

  create(): void {
    this.run = requireRun(this);
    fitScreenCamera(this);
    const { palette, text } = getContext(this).data;
    const { width, height } = SCREEN;
    this.portraits = { left: null, right: null };
    this.standing = { left: null, right: null };
    this.choiceButtons = [];
    this.closing = false;

    // The dimmer takes every tap, so nothing below reacts while the dialogue is on.
    // Wider than the screen, for windows of another shape (the map shows round the 640×360 screen there).
    const dim = this.add.rectangle(-width, -height, width * 3, height * 3, 0x000000, 0.62).setOrigin(0, 0).setInteractive().setDepth(0);
    dim.on('pointerup', () => this.advance());
    this.box = this.add
      .rectangle(BOX.x, BOX.y, BOX.width, BOX.height, color(palette.underground.black), 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(1, color(palette.order.gold))
      .setDepth(20);
    this.name = this.add.text(0, BOX.y - 4, '', { fontFamily: FONT.title, fontSize: '15px', color: '#e8e0d0', stroke: '#05090a', strokeThickness: 4 }).setOrigin(0, 1).setDepth(21);
    this.role = this.add.text(0, BOX.y - 6, '', { fontFamily: FONT.text, fontSize: '9px', color: '#c8c0b0', stroke: '#05090a', strokeThickness: 3 }).setOrigin(0, 1).setDepth(21);
    this.words = this.add
      .text(BOX.x + BOX.padding, BOX.y + BOX.padding - 2, '', { fontFamily: FONT.story, fontSize: '12px', color: '#e8e0d0', wordWrap: { width: BOX.width - BOX.padding * 2 }, lineSpacing: 2 })
      .setDepth(21);
    this.hint = this.add
      .text(BOX.x + BOX.width - 8, BOX.y + BOX.height - 5, text.dialogue.tapToContinue, { fontFamily: FONT.text, fontSize: '8px', color: '#8a9890' })
      .setOrigin(1, 1)
      .setDepth(21);
    this.tweens.add({ targets: this.hint, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });

    onKeyDown(this, (event) => {
      if (event.key === ' ' || event.key === 'Enter') this.advance();
      const n = Number(event.key);
      if (this.phase === 'choosing' && n >= 1 && n <= this.dialogue.choices.length) this.pick(n - 1);
    });
    exposeDialogue(() =>
      this.scene.isActive() && !this.closing
        ? {
            id: this.dialogue.id,
            line: this.index,
            typing: this.typing !== null,
            choices: this.choiceButtons.map((b) => ({ x: b.x, y: b.y })),
          }
        : null,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => exposeDialogue(() => null));

    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 180 });
    const first = this.run.nextDialogue();
    if (first) this.begin(first);
    else this.close();
  }

  private begin(dialogue: ShownDialogue): void {
    for (const slot of ['left', 'right'] as const) this.portraits[slot]?.destroy();
    this.portraits = { left: null, right: null };
    this.standing = { left: null, right: null };
    this.lastSlot = null;
    this.dialogue = dialogue;
    this.phase = 'lines';
    this.choice = null;
    this.lines = dialogue.lines;
    this.show(0);
  }

  /** Shows a line: its speaker's portrait and name, and types the words out. */
  private show(index: number): void {
    this.index = index;
    const line = this.lines[index]!;
    const { heads } = getContext(this).data;
    const serpent = line.speaker === 'serpent';
    const slot = this.slotFor(line);
    if (slot) this.portrait(slot, line.speaker === 'toad' ? 'dialogue_oldMotherToad' : `dialogue_${line.classId}`, line.speaker === 'toad' ? 'toad' : line.name);
    this.lastSlot = slot ?? this.lastSlot;
    for (const s of ['left', 'right'] as const) this.portraits[s]?.setTint(s === slot ? 0xffffff : PORTRAIT.dimTint);

    const classData = line.classId ? heads.classes[line.classId] : undefined;
    const plateColor = serpent ? SERPENT_COLOR : line.speaker === 'toad' ? TOAD_COLOR : (classData?.color ?? '#e8e0d0');
    this.name.setText(line.name).setColor(plateColor);
    this.role.setText(classData?.displayName ?? '');
    const left = BOX.x + BOX.padding;
    const right = BOX.x + BOX.width - BOX.padding;
    if (slot === 'right') {
      this.name.setOrigin(1, 1).setX(right);
    } else if (serpent) {
      this.name.setOrigin(0.5, 1).setX(SCREEN.width / 2);
    } else {
      this.name.setOrigin(0, 1).setX(left);
    }
    this.role.setX(this.name.x + (slot === 'right' ? -this.name.width - 6 : this.name.width + 6)).setOrigin(slot === 'right' ? 1 : 0, 1);
    this.box.setStrokeStyle(1, color(serpent ? SERPENT_COLOR : plateColor), serpent ? 0.6 : 0.8);

    this.words
      .setFontFamily(FONT.story)
      .setFontStyle(serpent ? 'italic' : 'normal')
      .setColor(serpent ? SERPENT_COLOR : '#e8e0d0')
      .setAlign(serpent ? 'center' : 'left')
      .setOrigin(serpent ? 0.5 : 0, 0)
      .setX(serpent ? SCREEN.width / 2 : left);
    this.type(line.text);
  }

  /**
   * Where a speaker stands: Old Mother Toad on the right, heads on the left when she is in the dialogue. Without her,
   * two heads face each other: a head that is already standing keeps its place, a new one takes the side the last
   * speaker is not on. The Serpent stands nowhere.
   */
  private slotFor(line: ShownLine): Slot | null {
    if (line.speaker === 'serpent') return null;
    if (line.speaker === 'toad') return 'right';
    const all = [...this.dialogue.lines, ...this.dialogue.choices.flatMap((c) => c.reply)];
    if (all.some((l) => l.speaker === 'toad')) return 'left';
    if (this.standing.left === line.name) return 'left';
    if (this.standing.right === line.name) return 'right';
    return this.lastSlot === 'left' ? 'right' : 'left';
  }

  /** Puts a portrait in a slot (sliding in if it is someone new there), or clears the slot if the image doesn't exist. */
  private portrait(slot: Slot, key: string, who: string): void {
    if (this.standing[slot] === who && this.portraits[slot]) return;
    this.portraits[slot]?.destroy();
    this.portraits[slot] = null;
    this.standing[slot] = who;
    if (!this.textures.exists(key)) return;
    const right = slot === 'right';
    const image = this.add.image(0, BOX.y + PORTRAIT.sink, key).setOrigin(right ? 1 : 0, 1).setDepth(10);
    image.setScale(who === 'toad' ? TOAD_WIDTH / image.width : PORTRAIT.height / image.height);
    // Everyone looks right in the paintings; on the right they turn to face the middle.
    image.setFlipX(right);
    const x = right ? BOX.x + BOX.width + 8 : BOX.x - 6;
    image.setX(x + (right ? PORTRAIT.slide : -PORTRAIT.slide)).setAlpha(0);
    this.tweens.add({ targets: image, x, alpha: 1, duration: PORTRAIT.inMs, ease: 'Quad.easeOut' });
    this.portraits[slot] = image;
  }

  private type(full: string): void {
    this.typing?.remove();
    this.hint.setVisible(false);
    let shown = 0;
    this.words.setText('');
    this.typing = this.time.addEvent({
      delay: 1000 / LETTERS_PER_SECOND,
      repeat: full.length - 1,
      callback: () => {
        shown += 1;
        this.words.setText(full.slice(0, shown));
        if (shown >= full.length) this.typed();
      },
    });
  }

  private typed(): void {
    this.typing?.remove();
    this.typing = null;
    this.words.setText(this.lines[this.index]!.text);
    const last = this.index === this.lines.length - 1;
    if (last && this.phase === 'lines' && this.dialogue.choices.length > 0) this.offerChoices();
    else this.hint.setVisible(true);
  }

  /** A tap: finishes the line being typed, or goes on to the next one. */
  private advance(): void {
    if (this.closing || this.phase === 'choosing') return;
    if (this.typing) {
      this.typed();
      return;
    }
    if (this.index < this.lines.length - 1) {
      this.show(this.index + 1);
      return;
    }
    this.finish();
  }

  private offerChoices(): void {
    this.phase = 'choosing';
    const { palette } = getContext(this).data;
    const style = { width: CHOICE.width, height: CHOICE.height, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' };
    const n = this.dialogue.choices.length;
    const top = BOX.y - 30 - n * (CHOICE.height + CHOICE.gap);
    this.choiceButtons = this.dialogue.choices.map((c, i) =>
      new Button(this, SCREEN.width / 2, top + i * (CHOICE.height + CHOICE.gap) + CHOICE.height / 2, c.text, style, () => this.pick(i)).setDepth(30),
    );
  }

  private pick(i: number): void {
    if (this.phase !== 'choosing') return;
    this.choice = i;
    for (const b of this.choiceButtons) b.destroy();
    this.choiceButtons = [];
    const reply = this.dialogue.choices[i]!.reply;
    if (reply.length === 0) {
      this.finish();
      return;
    }
    this.phase = 'reply';
    this.lines = reply;
    this.show(0);
  }

  /** The dialogue is over: the next queued one, or back to the game. */
  private finish(): void {
    this.run.dialogueShown(this.choice);
    const next = this.run.nextDialogue();
    if (next) this.begin(next);
    else this.close();
  }

  private close(): void {
    this.closing = true;
    this.typing?.remove();
    this.typing = null;
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 0,
      duration: 160,
      onComplete: () => {
        this.scene.stop();
        this.run.doneTalking();
      },
    });
  }
}
