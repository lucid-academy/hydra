// The Order's people on the map (GAME_DESIGN.md §5.3, §5.5): patrols and messengers where the hydra sees them, walking
// in the world turn; out of sight, a faded picture where they were last seen, with how many turns ago.

import type * as Phaser from 'phaser';
import { hexKey } from '../sim/hex';
import type { Hex } from '../sim/hex';
import type { OrderSighting, OrderUnit, RunEvent, RunState } from '../sim/turn';
import { FONT } from '../ui/fonts';
import type { Light } from './mapLight';

/** What the map lends the tokens: where a hex's feet are, how deep things standing there are drawn, their shadows. */
export interface OrderDrawing {
  feet(h: Hex): { x: number; y: number };
  depth(feetY: number): number;
  shadow(x: number, feetY: number, width: number): Phaser.GameObjects.Image;
  hintDepth: number;
  /** Labels under a faded picture: {n} turns ago, a turn ago, this turn. */
  words: { lastSeen: string; lastSeenOne: string; lastSeenNow: string };
}

const STEP_MS = 150;
/** A patrol's lantern lights the ground round it. */
const LANTERN = { color: 0xe8a450, radius: 34, strength: 0.42, height: 20 } as const;
/** Where a unit was last seen: faded and grey, a faint light so it shows in the dark. */
const GHOST = { alpha: 0.45, tint: 0x9a9aa8, light: { color: 0xa8a8c0, radius: 18, strength: 0.25 } } as const;

interface Token {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

/** The picture of a unit (manifest keys). */
function imageKey(kind: OrderUnit['kind'], tier: number): string {
  if (kind === 'messenger') return 'map_messenger';
  if (kind === 'patrol') return 'map_patrol';
  return `map_encounter_${Math.min(3, tier)}`;
}

export class OrderTokens {
  private live = new Map<string, Token>();
  private ghosts = new Map<string, Token & { label: Phaser.GameObjects.Text; key: string }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly drawing: OrderDrawing,
  ) {}

  /** Every unit where it stands, shown when in sight; where unseen ones were last seen, faded. */
  sync(state: RunState): void {
    const visible = (h: Hex) => state.visibility.get(hexKey(h)) === 'visible';
    for (const unit of state.order.units) {
      const token = this.tokenFor(unit);
      this.put(token, unit.at);
      token.image.setVisible(visible(unit.at));
      token.shadow.setVisible(visible(unit.at));
    }
    for (const [id, token] of this.live) {
      if (state.order.units.some((u) => u.id === id)) continue;
      token.image.destroy();
      token.shadow.destroy();
      this.live.delete(id);
    }
    this.syncGhosts(state, state.order.sightings.filter((s) => !visible(s.at)));
  }

  /** Lights for the light layer: lanterns of the patrols in sight, a faint one over each faded picture. */
  lights(): Light[] {
    const lights: Light[] = [];
    for (const token of this.live.values()) {
      if (token.image.visible && token.image.texture.key === 'map_patrol') lights.push({ x: token.image.x + 6, y: token.image.y - LANTERN.height, ...LANTERN });
    }
    for (const ghost of this.ghosts.values()) lights.push({ x: ghost.image.x, y: ghost.image.y - 8, ...GHOST.light });
    return lights;
  }

  /**
   * Walks the units along the ways they took in the world turn (a unit that just came down starts where it came
   * down). Each is shown only on hexes in sight. Calls `done` when all have arrived; returns false if none moved.
   */
  animate(state: RunState, events: readonly RunEvent[], done: () => void, onFrame: () => void = () => {}): boolean {
    const moves = events.filter((e): e is Extract<RunEvent, { type: 'orderMoved' }> => e.type === 'orderMoved');
    if (moves.length === 0) return false;
    const visible = (h: Hex) => state.visibility.get(hexKey(h)) === 'visible';
    let running = 0;
    for (const move of moves) {
      const unit = state.order.units.find((u) => u.id === move.unitId);
      const arrived = events.find((e) => e.type === 'orderArrived' && e.unitId === move.unitId) as { at: Hex } | undefined;
      // A messenger who got away is gone from the state already: his token walks off and goes.
      const token = this.live.get(move.unitId) ?? (unit ? this.tokenFor(unit) : null);
      if (!token) continue;
      if (arrived) this.put(token, arrived.at);
      let from = arrived?.at ?? null;
      const steps = move.path.map((h) => {
        const to = this.drawing.feet(h);
        const shown = visible(h) || (from !== null && visible(from));
        from = h;
        return { x: to.x, y: to.y, duration: STEP_MS, onStart: () => token.image.setVisible(shown) };
      });
      running++;
      this.scene.tweens.chain({
        targets: token.image,
        tweens: steps,
        onUpdate: () => {
          token.image.setDepth(this.drawing.depth(token.image.y));
          token.shadow.setPosition(token.image.x, token.image.y - 1).setVisible(token.image.visible);
          onFrame();
        },
        onComplete: () => {
          running--;
          if (running === 0) done();
        },
      });
    }
    return running > 0;
  }

  destroy(): void {
    for (const token of [...this.live.values(), ...this.ghosts.values()]) {
      token.image.destroy();
      token.shadow.destroy();
    }
    for (const ghost of this.ghosts.values()) ghost.label.destroy();
    this.live.clear();
    this.ghosts.clear();
  }

  private tokenFor(unit: OrderUnit): Token {
    let token = this.live.get(unit.id);
    if (!token) {
      const image = this.scene.add.image(0, 0, imageKey(unit.kind, unit.tier)).setOrigin(0.5, 1);
      token = { image, shadow: this.drawing.shadow(0, 0, image.width) };
      this.live.set(unit.id, token);
    }
    return token;
  }

  private put(token: Token, at: Hex): void {
    const { x, y } = this.drawing.feet(at);
    token.image.setPosition(x, y).setDepth(this.drawing.depth(y));
    token.shadow.setPosition(x, y - 1);
  }

  private syncGhosts(state: RunState, sightings: readonly OrderSighting[]): void {
    const wanted = new Set(sightings.map((s) => s.unitId));
    for (const [id, ghost] of this.ghosts) {
      if (wanted.has(id)) continue;
      ghost.image.destroy();
      ghost.shadow.destroy();
      ghost.label.destroy();
      this.ghosts.delete(id);
    }
    const { words } = this.drawing;
    for (const sighting of sightings) {
      const key = imageKey(sighting.kind, sighting.tier);
      let ghost = this.ghosts.get(sighting.unitId);
      if (ghost && ghost.key !== key) {
        ghost.image.setTexture(key);
        ghost.key = key;
      }
      if (!ghost) {
        const image = this.scene.add.image(0, 0, key).setOrigin(0.5, 1).setAlpha(GHOST.alpha).setTint(GHOST.tint);
        const label = this.scene.add
          .text(0, 0, '', { fontFamily: FONT.text, fontSize: '8px', color: '#c8c8d8', backgroundColor: '#05090acc', padding: { x: 2, y: 0 } })
          .setOrigin(0.5, 0)
          .setDepth(this.drawing.hintDepth);
        ghost = { image, shadow: this.drawing.shadow(0, 0, image.width).setAlpha(GHOST.alpha), label, key };
        this.ghosts.set(sighting.unitId, ghost);
      }
      this.put(ghost, sighting.at);
      const ago = state.turn - sighting.turn;
      ghost.label.setPosition(ghost.image.x, ghost.image.y + 1).setText(ago <= 0 ? words.lastSeenNow : ago === 1 ? words.lastSeenOne : words.lastSeen.replace('{n}', String(ago)));
    }
  }
}
