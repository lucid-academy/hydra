// The skills of the picked head, in a row over the front edge of the battle board: Q and W (the two skills it took
// into battle) and E (its ultimate, once unlocked). A button darkens while its skill cools down and lights up while
// the player is aiming it. Before the battle starts, the small ⇄ button next to Q and W swaps in the class's third skill.

import * as Phaser from 'phaser';
import { FONT } from './fonts';

const BUTTON = { width: 104, height: 18, gap: 4, swapWidth: 16 } as const;
const DEPTH = 150;
const KEYS = ['Q', 'W', 'E'] as const;

export interface SkillButtonInfo {
  name: string;
  /** 0 = ready, 1 = just used. */
  cooling: number;
  aiming: boolean;
  /** The skill can't be used now for another reason (nothing held, no meal...). */
  unusable: boolean;
}

interface SkillButton {
  bg: Phaser.GameObjects.Rectangle;
  shade: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  swap: Phaser.GameObjects.Rectangle;
  swapLabel: Phaser.GameObjects.Text;
}

export class SkillBar {
  private readonly buttons: SkillButton[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    onUse: (slot: number) => void,
    onSwap: (slot: number) => void,
  ) {
    KEYS.forEach((key, slot) => {
      const left = x + slot * (BUTTON.width + BUTTON.swapWidth + BUTTON.gap);
      const bg = scene.add.rectangle(left, y, BUTTON.width, BUTTON.height, 0x0b1112, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x2c3a3a);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => onUse(slot));
      const shade = scene.add.rectangle(left, y, 0, BUTTON.height, 0x000000, 0.6).setOrigin(0, 0);
      const label = scene.add.text(left + 4, y + 3, key, { fontFamily: FONT.text, fontSize: '10px', color: '#e8f0e0', fixedWidth: BUTTON.width - 6 });
      const swapLeft = left + BUTTON.width + 1;
      const swap = scene.add.rectangle(swapLeft, y, BUTTON.swapWidth - 2, BUTTON.height, 0x14232a, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x2c3a3a);
      swap.setInteractive({ useHandCursor: true }).on('pointerup', () => onSwap(slot));
      const swapLabel = scene.add.text(swapLeft + (BUTTON.swapWidth - 2) / 2, y + BUTTON.height / 2, '⇄', { fontFamily: FONT.text, fontSize: '10px', color: '#c6e04a' }).setOrigin(0.5);
      for (const part of [bg, shade, label, swap, swapLabel]) part.setDepth(DEPTH).setScrollFactor(0);
      this.buttons.push({ bg, shade, label, swap, swapLabel });
    });
    this.show([], false);
  }

  /** Middle of each shown button on screen (for tests that tap them like a player). */
  centers(): Array<{ slot: number; x: number; y: number }> {
    return this.buttons.filter((b) => b.bg.visible).map((b, slot) => ({ slot, x: b.bg.x + BUTTON.width / 2, y: b.bg.y + BUTTON.height / 2 }));
  }

  /** `skills`: one entry per slot (Q, W, then E if unlocked); an empty list hides the bar. `canSwap`: before the battle starts. */
  show(skills: readonly SkillButtonInfo[], canSwap: boolean): void {
    this.buttons.forEach((button, slot) => {
      const skill = skills[slot];
      const visible = skill !== undefined;
      for (const part of [button.bg, button.shade, button.label]) part.setVisible(visible);
      const swappable = visible && canSwap && slot < 2;
      button.swap.setVisible(swappable);
      button.swapLabel.setVisible(swappable);
      if (!skill) return;
      button.label.setText(`${KEYS[slot]}  ${skill.name}`).setColor(skill.unusable ? '#6f7f78' : '#e8f0e0');
      button.bg.setFillStyle(skill.aiming ? 0x2a3a1a : 0x0b1112, 0.95).setStrokeStyle(1, skill.aiming ? 0xc6e04a : skill.cooling <= 0 ? 0x8a7a45 : 0x2c3a3a);
      button.shade.setSize(Math.round(BUTTON.width * Math.max(0, Math.min(1, skill.cooling))), BUTTON.height);
    });
  }
}
