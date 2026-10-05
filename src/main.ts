import * as Phaser from 'phaser';
import { loadGameData } from './data';
import { DataError } from './data/validate';
import { fitCanvas } from './scaling';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { setContext } from './scenes/context';
import { MapScene } from './scenes/MapScene';
import { TitleScene } from './scenes/TitleScene';
import { sharpenText } from './scenes/view';
import { DebugOverlayScene } from './ui/DebugOverlayScene';
import { HudScene } from './ui/HudScene';
import { parseUrlParams } from './urlParams';

function showFatalError(message: string): void {
  const box = document.createElement('pre');
  box.textContent = message;
  box.style.cssText = 'color:#ffcf5c;background:#05090a;padding:16px;margin:0;white-space:pre-wrap;font:14px monospace;';
  document.body.replaceChildren(box);
}

function start(): void {
  const data = loadGameData();
  const params = parseUrlParams(window.location.search);
  // A fresh run gets a random seed. Math.random() is fine here: this is outside sim/, and the
  // seed is shown in the debug overlay so any run can be replayed with ?seed=.
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000);
  // HD (GAME_DESIGN.md §13): the canvas has the window's real pixels and pixel art is drawn sharp at any zoom
  // (smoothPixelArt: square texels with clean edges between them). Classic: 640×360 pixels, scaled by CSS.
  const { hd } = params;
  const fit = (): ReturnType<typeof fitCanvas> => fitCanvas(window.innerWidth, window.innerHeight, window.devicePixelRatio, hd);
  const first = fit();

  const game = new Phaser.Game({
    type: hd ? Phaser.WEBGL : Phaser.AUTO,
    parent: 'game',
    width: first.width,
    height: first.height,
    ...(hd ? { render: { smoothPixelArt: true } } : { pixelArt: true }),
    backgroundColor: data.palette.underground.black,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    banner: false,
    // Order matters: later scenes draw on top and get input first.
    scene: [BootScene, TitleScene, MapScene, HudScene, BattleScene, DebugOverlayScene],
  });
  setContext(game, { data, seed, params });
  if (hd) sharpenText();

  const rescale = (): void => {
    const { width, height, zoom } = fit();
    if (hd) {
      // Phaser leaves the CSS size alone at zoom 1, so it is set here, before Phaser measures the canvas.
      game.canvas.style.width = `${width * zoom}px`;
      game.canvas.style.height = `${height * zoom}px`;
      game.canvas.style.imageRendering = 'auto';
    }
    game.scale.setZoom(zoom);
    if (game.scale.width !== width || game.scale.height !== height) game.scale.resize(width, height);
  };
  game.events.once(Phaser.Core.Events.READY, rescale);
  window.addEventListener('resize', rescale);
}

try {
  start();
} catch (error) {
  showFatalError(error instanceof DataError ? error.message : `Startup failed:\n${String(error)}`);
  throw error;
}
