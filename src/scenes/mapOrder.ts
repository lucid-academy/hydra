// The Order's people on the map (GAME_DESIGN.md §5.3, §5.5): patrols, messengers and expeditions where the hydra sees
// them, walking in the world turn; out of sight, a faded picture where they were last seen, with how many turns ago.
// Also the hydra's own brood (§7): her scouts, which she always knows the whereabouts of, and the eggs and Broodlings
// in the lair.

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
/** Where eggs and Broodlings guarding it sit round the lair's pool (from its feet), first first. */
const EGG_SPOTS: ReadonlyArray<readonly [number, number]> = [[-17, -3], [-13, 0], [-20, 1], [16, -2], [20, 1], [12, 1]];
const GUARD_SPOTS: ReadonlyArray<readonly [number, number]> = [[-9, 7], [9, 7], [0, 9], [-22, 6], [22, 6], [0, -8]];

interface Token {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

/** The picture of a unit (manifest keys). */
function imageKey(kind: OrderUnit['kind'] | 'scout', tier: number): string {
  if (kind === 'scout') return 'map_broodling';
  if (kind === 'messenger') return 'map_messenger';
  if (kind === 'patrol') return 'map_patrol';
  if (kind === 'expedition') return 'map_expedition';
  if (kind === 'greatBurning') return 'map_great_burning';
  return `map_encounter_${Math.min(3, tier)}`;
}

export class OrderTokens {
  private live = new Map<string, Token>();
  /** Eggs and guards drawn round the lair. */
  private brood: Phaser.GameObjects.Image[] = [];
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
    for (const scout of state.lair.scouts) {
      const token = this.tokenFor({ id: scout.id, kind: 'scout', tier: 1 });
      this.put(token, scout.at);
      token.image.setVisible(true);
      token.shadow.setVisible(true);
    }
    this.syncBrood(state);
    for (const [id, token] of this.live) {
      if (state.order.units.some((u) => u.id === id) || state.lair.scouts.some((s) => s.id === id)) continue;
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
    const moves = events.flatMap((e) =>
      e.type === 'orderMoved' ? [{ id: e.unitId, path: e.path, ours: false }] : e.type === 'scoutMoved' ? [{ id: e.scoutId, path: e.path, ours: true }] : [],
    );
    if (moves.length === 0) return false;
    const visible = (h: Hex) => state.visibility.get(hexKey(h)) === 'visible';
    let running = 0;
    for (const move of moves) {
      const unit = state.order.units.find((u) => u.id === move.id);
      const arrived = events.find((e) => (e.type === 'orderArrived' || e.type === 'expeditionSent') && e.unitId === move.id) as { at: Hex } | undefined;
      // A messenger who got away is gone from the state already: his token walks off and goes. A scout that just
      // hatched comes out of the lair.
      const hatched = move.ours && !this.live.has(move.id);
      const token = this.live.get(move.id) ?? (unit ? this.tokenFor(unit) : move.ours ? this.tokenFor({ id: move.id, kind: 'scout', tier: 1 }) : null);
      if (!token) continue;
      const start = arrived?.at ?? (hatched ? state.map.lair : null);
      if (start) this.put(token, start);
      let from = start;
      const steps = move.path.map((h) => {
        const to = this.drawing.feet(h);
        const shown = move.ours || visible(h) || (from !== null && visible(from));
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
    for (const image of this.brood) image.destroy();
    this.brood = [];
    for (const token of [...this.live.values(), ...this.ghosts.values()]) {
      token.image.destroy();
      token.shadow.destroy();
    }
    for (const ghost of this.ghosts.values()) ghost.label.destroy();
    this.live.clear();
    this.ghosts.clear();
  }

  /** Eggs (the ones hatching wobble a little) and the Broodlings guarding the lair, round its pool, when it is known. */
  private syncBrood(state: RunState): void {
    for (const image of this.brood) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    this.brood = [];
    if (!state.visibility.has(hexKey(state.map.lair))) return;
    const { x, y } = this.drawing.feet(state.map.lair);
    state.lair.eggs.slice(0, EGG_SPOTS.length).forEach((egg, i) => {
      const [dx, dy] = EGG_SPOTS[i]!;
      const image = this.scene.add.image(x + dx, y + dy, 'map_egg').setOrigin(0.5, 1).setDepth(this.drawing.depth(y + dy));
      if (egg.hatching) this.scene.tweens.add({ targets: image, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.brood.push(image);
    });
    for (let i = 0; i < Math.min(state.lair.defenders, GUARD_SPOTS.length); i++) {
      const [dx, dy] = GUARD_SPOTS[i]!;
      this.brood.push(this.scene.add.image(x + dx, y + dy, 'map_broodling').setOrigin(0.5, 1).setFlipX(dx > 0).setDepth(this.drawing.depth(y + dy)));
    }
  }

  private tokenFor(unit: Pick<OrderUnit, 'id' | 'tier'> & { kind: OrderUnit['kind'] | 'scout' }): Token {
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
