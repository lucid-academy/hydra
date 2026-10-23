// Screenshots of key screens for review: opens the built game (dist/) in a headless browser
// and saves PNGs to docs/screens/. Run `npm run build` first. Fails on any browser console error.

import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const DESKTOP = { width: 1280, height: 720 };

async function tapGame(page, point) {
  const canvas = (await page.locator('canvas').boundingBox()) ?? { x: 0, y: 0, width: 640, height: 360 };
  const scale = canvas.width / 640;
  await page.mouse.click(canvas.x + point.x * scale, canvas.y + point.y * scale);
}

/** Sends the hydra to a hex in reach with the mouse: the first click plans the way, the second sets off. */
async function goTo(page, point) {
  await tapGame(page, point);
  await page.waitForTimeout(150);
  await tapGame(page, point);
}

/** Waits for a panel to open, reading through any dialogue that comes first (e.g. on entering a new biome). */
async function waitForPanel(page) {
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__hydra.placePanel() !== null)) break;
    if (await page.evaluate(() => window.__hydra.dialogue?.() != null)) await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(200);
  }
  await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
}

/** Steps onto the reachable place with this id (it is next to the hydra with ?near=), and waits for its panel. */
async function stepOntoPlace(page, id) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  const target = points.find((p) => p.id === id);
  if (!target) throw new Error(`No ${id} next to the hydra`);
  await goTo(page, target);
  await waitForPanel(page);
  await page.waitForTimeout(300);
}

/** Taps a closed threshold the hydra knows, and waits for its panel. */
async function tapThreshold(page, id) {
  const points = await page.evaluate(() => window.__hydra.inspectableOnScreen());
  const target = points.find((p) => p.id === id);
  if (!target) throw new Error(`No ${id} in sight`);
  await tapGame(page, target);
  await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
  await page.waitForTimeout(300);
}

/** Taps the reachable hex that costs the most to reach, like a player would. */
async function moveFarthest(page) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  if (points.length === 0) throw new Error('No reachable hex to tap');
  const target = points.reduce((a, b) => (b.cost > a.cost ? b : a));
  await goTo(page, target);
  // Walking and the view following, however long the drawing takes.
  await page.waitForFunction(() => !window.__hydra.mapBusy?.(), null, { timeout: 15_000 });
  await page.waitForTimeout(300);
}

/** Waits for the dialogue screen and taps until line `line` of it is shown in full (or its answers are up). */
async function readDialogueTo(page, line) {
  await page.waitForFunction(() => window.__hydra.dialogue?.() != null, null, { timeout: 10_000 });
  for (let i = 0; i < 20; i++) {
    const d = await page.evaluate(() => window.__hydra.dialogue());
    if (d.choices.length > 0 || (d.line >= line && !d.typing)) break;
    await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
}

/** Taps through dialogues until line `line` of the dialogue `id` is shown in full. */
async function readUntilDialogue(page, id, line = 0) {
  for (let i = 0; i < 40; i++) {
    const d = await page.evaluate(() => window.__hydra.dialogue?.() ?? null);
    if (d && d.id === id && d.line >= line && !d.typing) break;
    await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
}

/** Taps through the dialogues stepping onto a shrine brought on (a new biome), and waits for the shrine's panel. */
async function readThroughToShrine(page) {
  const summary = () => page.evaluate(() => window.__hydra.runSummary());
  for (let i = 0; i < 40; i++) {
    if ((await summary()).talking) await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(600); // a dialogue may still be about to open
    const { atShrine, talking } = await summary();
    if (atShrine && !talking) break;
  }
  await page.waitForTimeout(600);
}

/** Taps through any dialogue on screen. */
async function readThrough(page) {
  for (let i = 0; i < 40; i++) {
    if (!(await page.evaluate(() => window.__hydra.runSummary().talking))) break;
    await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(400);
  }
}

/** Reads through any dialogue on screen, then ends the turn. */
async function endTurn(page) {
  await readThrough(page);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
}

/** Steps onto the event site next to the hydra (?event=), and waits for its panel. */
async function stepOntoEvent(page) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  const target = points.find((p) => p.object === 'event');
  if (!target) throw new Error('No event site next to the hydra');
  await goTo(page, target);
  await waitForPanel(page);
  await page.waitForTimeout(300);
}

const SHOTS = [
  { name: 'title', query: '?seed=123', viewport: DESKTOP, scene: 'title' },
  { name: 'title-debug', query: '?seed=123&debug=1', viewport: DESKTOP, scene: 'title' },
  { name: 'title-phone-landscape', query: '?seed=123', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'title' },
  { name: 'map-start', query: '?seed=123&scene=map&debug=1', viewport: DESKTOP, scene: 'map' },
  { name: 'map-after-moves', query: '?seed=123&scene=map&debug=1', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await moveFarthest(page);
    await moveFarthest(page);
  } },
  { name: 'map-shrine', query: '?seed=123&scene=map&near=shrine', viewport: DESKTOP, scene: 'map', act: async (page) => {
    // Step onto the shrine like a player: its blessing comes up.
    const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
    const shrine = points.find((p) => p.object === 'shrine');
    if (!shrine) throw new Error('No shrine next to the hydra');
    await goTo(page, shrine);
    await readThroughToShrine(page);
  } },
  { name: 'battle-start', query: '?seed=123&scene=battle&group=burningDetail', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('1'); // battles start paused; select the first head
  } },
  { name: 'battle-fight', query: '?seed=123&scene=battle&group=burningDetail&debug=1', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space'); // start the battle
    await page.waitForTimeout(16_000);
  } },
  { name: 'battle-combo', query: '?seed=123&scene=battle&group=burningDetail', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    // Like a player: send every head at the same enemy, start, and wait for the first combo to land.
    const { heads, enemies } = await page.evaluate(() => window.__hydra.battleSummary());
    const canvas = (await page.locator('canvas').boundingBox()) ?? { x: 0, y: 0, width: 640, height: 360 };
    const scale = canvas.width / 640;
    for (let i = 0; i < heads.length; i++) {
      await page.keyboard.press(String(i + 1));
      await page.mouse.click(canvas.x + enemies[0].x * scale, canvas.y + enemies[0].y * scale);
    }
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__hydra.battleSummary().combos.length > 0, null, { timeout: 90_000 });
    await page.waitForTimeout(250);
  } },
  { name: 'battle-phone-landscape', query: '?seed=123&scene=battle&group=patrol', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(12_000);
  } },
  { name: 'map-order', query: '?seed=123&scene=map&units=patrol,messenger', viewport: DESKTOP, scene: 'map' },
  { name: 'map-order-ghosts', query: '?seed=123&scene=map&units=patrol,messenger', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await readThrough(page);
    await moveFarthest(page);
  } },
  { name: 'map-order-attack', query: '?seed=123&scene=map&units=patrol', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await endTurn(page);
    // Old Mother Toad speaks while the hydra rests; then the patrol is upon her.
    for (let i = 0; i < 40 && !(await page.evaluate(() => window.__hydra.readyScenes.includes('battle'))); i++) {
      await readThrough(page);
      await page.waitForTimeout(400);
    }
    await page.waitForFunction(() => window.__hydra?.readyScenes.includes('battle'), null, { timeout: 15_000 });
    await page.waitForTimeout(800);
  } },
  { name: 'map-lair', query: '?seed=123&scene=map', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await readThrough(page);
    const lair = (await page.evaluate(() => window.__hydra.inspectableOnScreen())).find((p) => p.object === 'lair');
    if (!lair) throw new Error('The lair is not there to tap');
    await tapGame(page, lair);
    await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
    await page.waitForTimeout(300);
  } },
  { name: 'map-scout', query: '?seed=123&scene=map&zoom=0.7', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await readThrough(page);
    const lair = (await page.evaluate(() => window.__hydra.inspectableOnScreen())).find((p) => p.object === 'lair');
    await tapGame(page, lair);
    await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
    const scout = (await page.evaluate(() => window.__hydra.placePanel())).actions.find((a) => a.id === '__lair:scout');
    await tapGame(page, scout);
    // Three turns to hatch, then two of scouting.
    for (let i = 0; i < 5; i++) {
      await endTurn(page);
      await page.waitForFunction(() => !window.__hydra.mapBusy?.(), null, { timeout: 15_000 });
    }
    await readThrough(page);
    await page.waitForTimeout(400);
  } },
  { name: 'map-expedition', query: '?seed=123&scene=map&units=expedition,greatBurning', viewport: DESKTOP, scene: 'map' },
  { name: 'map-alert-stage', query: '?seed=123&scene=map&alert=55', viewport: DESKTOP, scene: 'map', act: endTurn },
  { name: 'map-phone-landscape', query: '?seed=123&scene=map', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map' },
  // M2c: whole worlds at a glance (map revealed and zoomed out), with and without run modifiers.
  { name: 'world-123', query: '?seed=123&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-7', query: '?seed=7&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-2026', query: '?seed=2026&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-146-rare', query: '?seed=146&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-123-modifiers', query: '?seed=123&scene=map&reveal=1&zoom=0.45&modifiers=wetYear,myceliumBloom,oldWorkings', viewport: DESKTOP, scene: 'map' },
  { name: 'map-reveal-close', query: '?seed=123&scene=map&reveal=1&near=saltPlug', viewport: DESKTOP, scene: 'map' },
  { name: 'map-threshold', query: '?seed=123&scene=map&near=saltPlug', viewport: DESKTOP, scene: 'map', act: async (page) => tapThreshold(page, 'saltPlug') },
  { name: 'map-place', query: '?seed=99&scene=map&near=brineLake', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await stepOntoPlace(page, 'brineLake');
    const panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]); // drink
    await page.waitForTimeout(400);
  } },
  { name: 'map-place-phone', query: '?seed=7&scene=map&near=lostSurvey', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map', act: async (page) => stepOntoPlace(page, 'lostSurvey') },
  // A travel plan, as in Heroes: one click on a hex several turns away shows the way and how many turns it takes.
  { name: 'map-journey', query: '?seed=123&scene=map&reveal=1', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await tapGame(page, { x: 450, y: 238 });
    await page.waitForTimeout(300);
  } },
  { name: 'map-landmark', query: '?seed=123&scene=map&near=sunkenOak', viewport: DESKTOP, scene: 'map' },
  // M5: dialogues (Old Mother Toad, heads, the Serpent, an answer to pick) and events.
  { name: 'dialogue-toad', query: '?seed=123&scene=map', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await tapGame(page, { x: 590, y: 340 }); // End Turn in the lair: Old Mother Toad speaks
    await readDialogueTo(page, 1);
  } },
  { name: 'dialogue-heads', query: '?seed=123&scene=map&say=biomeOldCrypts', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 1) },
  { name: 'dialogue-serpent', query: '?seed=123&scene=map&say=serpentFirst', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 0) },
  { name: 'dialogue-choice', query: '?seed=123&scene=map&say=toadSerpent', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 99) },
  { name: 'dialogue-phone', query: '?seed=123&scene=map&say=afterFirstWin', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map', act: async (page) => readDialogueTo(page, 0) },
  { name: 'map-event-site', query: '?seed=123&scene=map&near=event', viewport: DESKTOP, scene: 'map' },
  { name: 'event-panel', query: '?seed=123&scene=map&event=noviceChecklist', viewport: DESKTOP, scene: 'map', act: stepOntoEvent },
  { name: 'event-result', query: '?seed=123&scene=map&event=titheBox', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await stepOntoEvent(page);
    const panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]); // break it open
    await page.waitForTimeout(400);
  } },
  // M5 thresholds of the story: the Sealed Door (a step of "The Silent Song") and a tunnel the Cinderkin melt.
  { name: 'sealed-door', query: '?seed=123&scene=map&near=sealedDoor', viewport: DESKTOP, scene: 'map', act: async (page) => tapThreshold(page, 'sealedDoor') },
  { name: 'sealed-door-open', query: '?seed=123&scene=map&near=sealedDoor&flags=hushedSongHeard', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await tapThreshold(page, 'sealedDoor');
    const panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]); // hum the note
    await readDialogueTo(page, 2); // the Serpent's line
  } },
  { name: 'cinder-bore', query: '?seed=123&scene=map&near=sealedDoor&event=cinderSwarm&conditions=warmed', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await stepOntoEvent(page);
    const panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]); // let them taste the warmth
    await page.waitForTimeout(600);
  } },
  { name: 'cinder-bore-map', query: '?seed=123&scene=map&near=sealedDoor&event=cinderSwarm&conditions=warmed', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await stepOntoEvent(page);
    let panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]);
    await page.waitForTimeout(400);
    panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.leave); // Continue
    // The heads talk it over; then the map shows the glowing tunnel.
    for (let i = 0; i < 30 && (await page.evaluate(() => window.__hydra.dialogue?.() != null || window.__hydra.runSummary().talking)); i++) {
      await tapGame(page, { x: 320, y: 120 });
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1200);
  } },
  // M3: the battle for the lair with Broodlings, the Order's new people, and the Great Burning's Master.
  { name: 'battle-lair', query: '?seed=123&scene=battle&group=knightsVigil&allies=3', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(6000);
    await page.keyboard.press('Space');
  } },
  { name: 'battle-tithe', query: '?seed=123&scene=battle&group=titheVisit', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(7000);
    await page.keyboard.press('Space');
  } },
  { name: 'battle-great-burning', query: '?seed=123&scene=battle&group=greatBurning&allies=2', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(5000);
    await page.keyboard.press('Space');
  } },
  { name: 'battle-serpent', query: '?seed=123&scene=battle&group=patrol&say=battleSmall', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
  } },
  // M6: generations. The title of a saved game, the screen after a death, the Book of Lineages, an heiress greeted by
  // Old Mother Toad, her mother in a dream, and a marking shrine.
  { name: 'title-continue', query: '?seed=123', viewport: DESKTOP, scene: 'title', act: async (page) => {
    await tapGame(page, await page.evaluate(() => window.__hydra.buttons().begin));
    await page.waitForFunction(() => window.__hydra.readyScenes.includes('map'), null, { timeout: 15_000 });
    await page.waitForTimeout(800); // saved
    await page.reload();
    await page.waitForFunction(() => window.__hydra?.readyScenes.includes('title'), null, { timeout: 15_000 });
    await page.waitForTimeout(500);
  } },
  { name: 'generation', query: '?seed=123&scene=generation&ancestors=3&eggs=3', viewport: DESKTOP, scene: 'generation' },
  { name: 'generation-phone', query: '?seed=123&scene=generation&ancestors=3&eggs=3', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'generation' },
  { name: 'generation-extinct', query: '?seed=123&scene=generation&ancestors=2&eggs=0&hidden=1', viewport: DESKTOP, scene: 'generation' },
  { name: 'book', query: '?seed=123&scene=book&ancestors=6', viewport: DESKTOP, scene: 'book' },
  { name: 'heiress-greeted', query: '?seed=123&scene=map&ancestors=3', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 1) },
  { name: 'dialogue-ancestor', query: '?seed=123&scene=map&ancestors=1&say=dreamDeeper', viewport: DESKTOP, scene: 'map', act: async (page) => readUntilDialogue(page, 'dreamDeeper') },
  { name: 'map-mark', query: '?seed=123&scene=map&near=mark', viewport: DESKTOP, scene: 'map', act: async (page) => {
    // Step onto the marking shrine like a player: it offers a mutation instead of a blessing.
    const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
    const shrine = points.find((p) => p.object === 'shrine');
    if (!shrine) throw new Error('No shrine next to the hydra');
    await goTo(page, shrine);
    await readThroughToShrine(page);
  } },
];

const OUT_DIR = 'docs/screens';
await mkdir(OUT_DIR, { recursive: true });

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const baseUrl = server.resolvedUrls?.local[0] ?? 'http://localhost:4173/';
// Software WebGL, because the server has no graphics card.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const errors = [];
try {
  // `npm run shots -- map world` takes only the shots whose names start with one of these words.
  const only = process.argv.slice(2);
  for (const shot of SHOTS.filter((s) => only.length === 0 || only.some((word) => s.name.startsWith(word)))) {
    const page = await browser.newPage({ viewport: shot.viewport, deviceScaleFactor: shot.dpr ?? 1 });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[${shot.name}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`[${shot.name}] ${err.message}`));

    await page.goto(new URL(shot.query, baseUrl).href);
    await page.waitForFunction((scene) => window.__hydra?.readyScenes.includes(scene), shot.scene, { timeout: 15_000 });
    await page.waitForTimeout(500); // let the first frames render
    if (shot.act) await shot.act(page);
    await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png` });
    console.log(`saved ${OUT_DIR}/${shot.name}.png`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (errors.length > 0) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
