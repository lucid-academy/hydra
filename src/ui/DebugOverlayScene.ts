// `?debug=1`: a small panel with the seed and simulation state, drawn above every other scene.
// Ticks show "-" outside battles; turn and visibility show "-" outside a run.

import * as Phaser from 'phaser';
import { getContext } from '../scenes/context';
import type { BattleScene } from '../scenes/BattleScene';
import { lineages } from '../scenes/LineageKeeper';
import { getRun } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';
import { fitScreenCamera } from '../scenes/view';

export class DebugOverlayScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.DebugOverlay);
  }

  create(): void {
    fitScreenCamera(this);
    // Below the HUD's top bar.
    this.label = this.add.text(4, 20, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e8f0e0',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 3 },
    });
    this.refresh();
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
  }

  private battleTick(): number | null {
    return this.scene.isActive(SceneKey.Battle) ? (this.scene.get(SceneKey.Battle) as BattleScene).tick : null;
  }

  private refresh(): void {
    const run = getRun(this)?.state;
    const seed = run?.seed ?? getContext(this).seed;
    let visibility = '-';
    let turn = '-';
    if (run) {
      const up = run.hydra.layer === 'surface';
      const states = [...(up ? run.surface.visibility : run.visibility).values()];
      const visible = states.filter((s) => s === 'visible').length;
      const size = (up ? run.surface.map : run.map).tiles.size;
      visibility = `${run.hydra.layer}: ${visible} visible, ${states.length - visible} remembered, ${size - states.length} unexplored`;
      turn = `${run.turn}  alert: ${run.alert.toFixed(1)}${up ? `  mist: ${Object.keys(run.surface.mist).length} hexes` : ''}`;
    }
    const keeper = lineages(this);
    const lineage = keeper.lineage();
    const lineageLine = `lineage: ${lineage ? `${lineage.name} #${lineage.number} (seed ${lineage.seed}), generation ${lineage.generation}` : '-'}  saves: ${keeper.persist ? 'on' : 'off (test URL)'}`;
    const active = this.scene.manager
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((key) => key !== SceneKey.DebugOverlay);
    this.label.setText(
      [
        `seed: ${seed}`,
        lineageLine,
        `scene: ${active.join(', ') || '-'}`,
        `turn: ${turn}   ticks: ${this.battleTick() ?? '-'}`,
        `visibility: ${visibility}`,
        `fps: ${Math.round(this.game.loop.actualFps)}`,
      ].join('\n'),
    );
    this.scene.bringToTop();
  }
}
