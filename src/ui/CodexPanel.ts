// The combo codex over the battle: every combo from combos.json, by name with what it does once found, "???" until then.
// Opened from the top bar; it pauses the battle while it is open.

import * as Phaser from 'phaser';
import { Button } from './Button';
import { FONT } from './fonts';

const PANEL = { width: 616, height: 296, columns: 3, rowHeight: 37 } as const;
const DEPTH = 300;

export interface CodexEntry {
  name: string;
  description: string;
  found: boolean;
}

export interface CodexTexts {
  title: string;
  count: string;
  unknown: string;
  close: string;
}

export class CodexPanel {
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  get isOpen(): boolean {
    return this.objects.length > 0;
  }

  open(entries: readonly CodexEntry[], texts: CodexTexts, center: { x: number; y: number }, onClose: () => void): void {
    this.close();
    const left = center.x - PANEL.width / 2;
    const top = center.y - PANEL.height / 2;
    const add = <T extends Phaser.GameObjects.GameObject & { setDepth(d: number): T }>(o: T): T => {
      this.objects.push(o.setDepth(DEPTH));
      return o;
    };
    // The dark backdrop catches taps, so nothing on the board is tapped through the panel.
    add(this.scene.add.rectangle(left, top, PANEL.width, PANEL.height, 0x05090a, 0.96).setOrigin(0, 0).setStrokeStyle(1, 0x8a7a45).setInteractive());
    add(this.scene.add.text(left + 12, top + 8, texts.title, { fontFamily: FONT.title, fontSize: '14px', color: '#f2ead0' }));
    const found = entries.filter((e) => e.found).length;
    const count = texts.count.replace('{n}', String(found)).replace('{total}', String(entries.length));
    add(this.scene.add.text(left + 80, top + 11, count, { fontFamily: FONT.text, fontSize: '10px', color: '#9fb0a0' }));

    const columnWidth = (PANEL.width - 24) / PANEL.columns;
    const perColumn = Math.ceil(entries.length / PANEL.columns);
    entries.forEach((entry, i) => {
      const column = Math.floor(i / perColumn);
      const row = i % perColumn;
      const x = left + 12 + column * columnWidth;
      const y = top + 32 + row * PANEL.rowHeight;
      add(
        this.scene.add.text(x, y, entry.found ? entry.name : texts.unknown, {
          fontFamily: FONT.callout,
          fontSize: '10px',
          color: entry.found ? '#e8c860' : '#5d6b66',
        }),
      );
      if (entry.found) {
        add(
          this.scene.add.text(x, y + 11, entry.description, {
            fontFamily: FONT.text,
            fontSize: '8px',
            color: '#c8d4c4',
            fixedWidth: columnWidth - 10,
            wordWrap: { width: columnWidth - 10 },
            maxLines: 2,
          }),
        );
      }
    });
    const close = new Button(
      this.scene,
      left + PANEL.width - 50,
      top + 14,
      texts.close,
      { width: 80, height: 18, fill: 0x14232a, border: 0x8a7a45, textColor: '#e8f0e0', fontSize: '10px' },
      () => {
        this.close();
        onClose();
      },
    );
    this.objects.push(close.setDepth(DEPTH + 1));
  }

  close(): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }
}
