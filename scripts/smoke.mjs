// Smoke test of the whole game loop, clicked through like a player would (mouse only, no shortcuts into the code):
//   title → Begin → map → walk to an encounter → battle with orders → victory → back on the map (twice; a battle
//   lost on the way goes through the generation screen to her heiress), then a battle that is surely lost → the
//   generation screen → the heiress hatches. Dialogues on the way are read to the end (picking the first answer),
//   events get their first choice that can be picked. Last, the saved game: a few moves, the page is reloaded,
//   Continue brings the same hydra back; New Lineage (confirmed) starts another; the Book of Lineages opens.
// Opens the built game (dist/) in a headless browser. Run `npm run build` first.
// Exits with an error on any browser console error, or when a step doesn't happen in time.
//
// Usage: npm run smoke            (desktop window)
//        npm run smoke -- phone   (phone held sideways, 3 device pixels per pixel, played by touch)

import { chromium } from '@playwright/test';
import { preview } from 'vite';

const PHONE = process.argv.includes('phone');
const VIEWPORT = PHONE ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const LABEL = PHONE ? 'phone' : 'desktop';
/** Battles are fast-forwarded, so the test doesn't take minutes. */
const SPEED = 4;
const BATTLES_TO_WIN = 2;
const MAX_MAP_STEPS = 300;

// Where things are on the 640×360 game screen. Update these if the layout changes.
const GAME_WIDTH = 640;
const TITLE_TAP = { x: 320, y: 200 };
const END_TURN_BUTTON = { x: 590, y: 340 };
const RESUME_BUTTON = { x: 602, y: 328 };
const CONTINUE_BUTTON = { x: 320, y: 148 };
const ACCEPT_BLESSING_BUTTON = { x: 258, y: 248 };
const ALL_HEADS_BUTTON = { x: 600, y: 8 };
/** Map hexes under the top bar, the minimap or the End Turn button can't be tapped. */
const MAP_TAP_AREA = { left: 10, right: 630, top: 24, bottom: 320 };
const MINIMAP = { right: 104, top: 266 };
/** Anywhere on the dialogue screen's dimmed part: a tap shows the whole line, or the next one. */
const DIALOGUE_TAP = { x: 320, y: 120 };

const log = (...parts) => console.log(`[${LABEL}]`, ...parts);

const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'warn' });
const baseUrl = server.resolvedUrls?.local[0] ?? 'http://localhost:4174/';
// Software WebGL, because the server has no graphics card.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

async function openPage(query) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: PHONE ? 3 : 1, hasTouch: PHONE });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(new URL(query, baseUrl).href);
  return page;
}

/** Taps a point given in game pixels (640×360), wherever the canvas sits in the window: by touch on a phone, else a click. */
async function tap(page, point) {
  const canvas = await page.locator('canvas').boundingBox();
  const scale = canvas.width / GAME_WIDTH;
  const at = { x: canvas.x + point.x * scale, y: canvas.y + point.y * scale };
  if (PHONE) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
}

/** Sends the hydra to a hex in reach: a touch goes at once; a mouse plans with the first click and sets off with the second. */
async function goTo(page, point) {
  await tap(page, point);
  if (PHONE) return;
  await page.waitForTimeout(150);
  await tap(page, point);
}

const timesReady = (page, scene) => page.evaluate((s) => window.__hydra.readyScenes.filter((x) => x === s).length, scene);

/** A button on the screen now (title, generation screen, book), by name. */
async function button(page, name) {
  const point = await page.evaluate((n) => window.__hydra.buttons?.()[n] ?? null, name);
  if (!point) throw new Error(`No "${name}" button on the screen`);
  return point;
}

/** Waits until the map has shown the last move: the hydra has walked and the view has followed it. */
async function waitForMap(page) {
  await page.waitForFunction(() => !window.__hydra.mapBusy?.(), null, { timeout: 15_000 });
  await page.waitForTimeout(100);
}

/** Scenes get 45 s: software WebGL on a phone-sized canvas (3 device pixels per pixel) can take a while to paint a board. */
async function waitForScene(page, scene, timesBefore = 0) {
  await page.waitForFunction(([s, n]) => (window.__hydra?.readyScenes.filter((x) => x === s).length ?? 0) > n, [scene, timesBefore], { timeout: 45_000 });
  await page.waitForTimeout(400); // let it draw
}

/** One step on the map: into an encounter if one is in reach, otherwise towards unexplored ground. */
async function mapStep(page, step) {
  const points = (await page.evaluate(() => window.__hydra.reachableOnScreen())).filter(
    (p) =>
      p.x > MAP_TAP_AREA.left &&
      p.x < MAP_TAP_AREA.right &&
      p.y > MAP_TAP_AREA.top &&
      p.y < MAP_TAP_AREA.bottom &&
      !(p.x < MINIMAP.right && p.y > MINIMAP.top),
  );
  if (points.length === 0) {
    await tap(page, END_TURN_BUTTON);
    await page.waitForTimeout(250);
    await waitForMap(page);
    return;
  }
  const mostNew = Math.max(...points.map((p) => p.unexploredNear));
  const target =
    points.find((p) => p.encounter) ??
    (mostNew > 0 ? points.find((p) => p.unexploredNear === mostNew) : points[(step * 7) % points.length]);
  await goTo(page, target);
  await waitForMap(page);
}

/**
 * Plays the battle on screen: orders every head onto one enemy (all at once with "All heads", or card by card),
 * starts it, waits for the end, presses Continue.
 */
async function playBattle(page, allAtOnce) {
  const start = await page.evaluate(() => window.__hydra.battleSummary());
  if (!start.paused) throw new Error('A battle should start paused');
  const target = start.enemies[0];
  if (allAtOnce) {
    await tap(page, ALL_HEADS_BUTTON);
    await tap(page, target);
  } else {
    for (const card of start.cards) {
      await tap(page, card);
      await tap(page, target);
    }
  }
  const orders = await page.evaluate(() => window.__hydra.battleSummary().orders);
  if (Object.values(orders).some((id) => id !== target.id)) throw new Error(`Not every head got the order: ${JSON.stringify(orders)}`);
  await tap(page, RESUME_BUTTON);
  await page.waitForFunction(() => window.__hydra.battleSummary().outcome !== null, null, { timeout: 240_000 });
  const end = await page.evaluate(() => window.__hydra.battleSummary());
  log(`battle vs ${start.enemies.length} enemies: ${end.outcome} after ${Math.round(end.tick / 20)} s of game time, heads ${start.heads.length} → ${end.heads.length}, combos: ${end.combos.join(', ') || 'none'}`);
  await page.waitForTimeout(300);
  // Back to the map, or for a dead hydra to the generation screen.
  const next = end.outcome === 'lost' ? 'generation' : 'map';
  const before = await timesReady(page, next);
  await tap(page, CONTINUE_BUTTON);
  await waitForScene(page, next, before);
  return end;
}

/** On the generation screen: hatch from the first egg (or the hidden one), and the heiress's map. Returns her summary. */
async function hatchHeiress(page) {
  const mapsBefore = await timesReady(page, 'map');
  const buttons = await page.evaluate(() => window.__hydra.buttons());
  const choice = ['egg1', 'hatch', 'intervene'].find((key) => buttons[key]);
  if (!choice) throw new Error(`No egg to hatch from on the generation screen: ${Object.keys(buttons).join(', ')}`);
  await tap(page, buttons[choice]);
  await waitForScene(page, 'map', mapsBefore);
  return page.evaluate(() => ({ ...window.__hydra.runSummary(), reachable: window.__hydra.reachableOnScreen().length }));
}

try {
  // Part 1: from the title screen, explore until two battles are won.
  let page = await openPage(`?seed=7&speed=${SPEED}`);
  await waitForScene(page, 'title');
  await tap(page, TITLE_TAP);
  await waitForScene(page, 'map');

  let won = 0;
  let fought = 0;
  const dialoguesRead = new Set();
  let events = 0;
  for (let step = 0; step < MAX_MAP_STEPS && won < BATTLES_TO_WIN; step++) {
    const { inBattle, atShrine, atPlace, atEvent, talking, blessings, mutations } = await page.evaluate(() => window.__hydra.runSummary());
    if (talking) {
      // A dialogue: tap through it, picking the first answer when it asks.
      await page.waitForTimeout(250);
      const dialogue = await page.evaluate(() => window.__hydra.dialogue?.() ?? null);
      if (!dialogue) continue; // still opening or closing
      if (!dialoguesRead.has(dialogue.id)) log(`dialogue: ${dialogue.id}`);
      dialoguesRead.add(dialogue.id);
      await tap(page, dialogue.choices[0] ?? DIALOGUE_TAP);
      continue;
    }
    if (atEvent) {
      // An event: the first choice that can be picked, then Continue.
      await page.waitForTimeout(300);
      const panel = await page.evaluate(() => window.__hydra.placePanel());
      if (!panel) throw new Error('An event panel should be open');
      if (panel.leave) {
        await tap(page, panel.leave);
        await page.waitForTimeout(300);
        if ((await page.evaluate(() => window.__hydra.runSummary())).atEvent) throw new Error('Continue did not close the event panel');
        continue;
      }
      const choice = panel.actions.find((a) => a.enabled);
      if (!choice) throw new Error('An event has no choice that can be picked');
      await tap(page, choice);
      events++;
      log(`event: picked ${choice.id}`);
      continue;
    }
    if (atPlace) {
      // A place or a threshold: read it, and walk on.
      await page.waitForTimeout(300);
      const panel = await page.evaluate(() => window.__hydra.placePanel());
      if (!panel) throw new Error('A place panel should be open');
      await tap(page, panel.leave);
      await page.waitForTimeout(300);
      if ((await page.evaluate(() => window.__hydra.runSummary())).atPlace) throw new Error('Leave did not close the place panel');
      log('visited a place');
      continue;
    }
    if (atShrine) {
      // A shrine of the Great Serpent: take the blessing (or, at a marking shrine, the mutation).
      await page.waitForTimeout(300);
      await tap(page, ACCEPT_BLESSING_BUTTON);
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => window.__hydra.runSummary());
      const took = after.blessings === blessings + 1 || after.mutations.length === mutations.length + 1;
      if (after.atShrine || !took) throw new Error(`Accepting the blessing did not work: ${JSON.stringify(after)}`);
      log(after.blessings > blessings ? 'took a blessing at a shrine' : `took a mark at a shrine: ${after.mutations.at(-1)}`);
      continue;
    }
    if (!inBattle) {
      await mapStep(page, step);
      continue;
    }
    await waitForScene(page, 'battle', fought);
    const end = await playBattle(page, fought === 0);
    fought++;
    const after = await page.evaluate(() => window.__hydra.runSummary());
    if (after.inBattle) throw new Error('Still in battle after pressing Continue');
    if (end.outcome === 'won') {
      won++;
      continue;
    }
    // Losing a fight is part of the game: the generation screen, then her heiress on a new map.
    if (fought - won > 3) throw new Error('Lost too many battles in a row');
    const heiress = await hatchHeiress(page);
    log(`lost a battle: the generation screen → ${heiress.hydraName}, generation ${heiress.generation}`);
  }
  if (won < BATTLES_TO_WIN) throw new Error(`Found only ${won} of ${BATTLES_TO_WIN} battles in ${MAX_MAP_STEPS} map steps`);
  if (dialoguesRead.size === 0) throw new Error('No dialogue came up on the way (one should after a battle won)');
  log(`read ${dialoguesRead.size} dialogues, chose in ${events} events`);
  log('map after two battles:', JSON.stringify(await page.evaluate(() => window.__hydra.runSummary())));
  await page.close();

  // Part 2: a battle the hydra can't win (1 body HP), then the generation screen and her heiress.
  page = await openPage(`?seed=7&scene=battle&group=patrol&hp=1&speed=${SPEED}`);
  await waitForScene(page, 'battle');
  await tap(page, RESUME_BUTTON);
  await page.waitForFunction(() => window.__hydra.battleSummary().outcome !== null, null, { timeout: 240_000 });
  const lost = await page.evaluate(() => window.__hydra.battleSummary());
  if (lost.outcome !== 'lost') throw new Error(`Expected to lose with 1 body HP, but the outcome was "${lost.outcome}"`);
  await page.waitForTimeout(300);
  await tap(page, CONTINUE_BUTTON);
  await waitForScene(page, 'generation');
  const fresh = await hatchHeiress(page);
  if (fresh.turn !== 1 || fresh.reachable === 0 || fresh.generation !== 2 || !fresh.hydraName) throw new Error(`The heiress's run looks wrong: ${JSON.stringify(fresh)}`);
  log(`defeat → the generation screen → ${fresh.hydraName}, generation 2: ok`);
  await page.close();

  // Part 3: the saved game. A few steps, the page is reloaded, and Continue brings back the same hydra where she was.
  page = await openPage(`?seed=11&speed=${SPEED}`);
  await waitForScene(page, 'title');
  await tap(page, await button(page, 'begin'));
  await waitForScene(page, 'map');
  for (let step = 0; step < 3; step++) {
    if ((await page.evaluate(() => window.__hydra.runSummary())).talking) {
      const dialogue = await page.evaluate(() => window.__hydra.dialogue?.() ?? null);
      await tap(page, dialogue?.choices[0] ?? DIALOGUE_TAP);
      await page.waitForTimeout(250);
      continue;
    }
    await mapStep(page, step);
  }
  await page.waitForTimeout(500); // saved a moment after the last change
  const saved = await page.evaluate(() => window.__hydra.runSummary());
  await page.reload();
  await waitForScene(page, 'title');
  await tap(page, await button(page, 'continue'));
  await waitForScene(page, 'map');
  const continued = await page.evaluate(() => window.__hydra.runSummary());
  for (const key of ['hydraName', 'generation', 'turn', 'explored', 'alert', 'muck', 'moisture', 'bones']) {
    if (continued[key] !== saved[key]) throw new Error(`Continue did not bring back the same run (${key}): ${JSON.stringify(saved)} vs ${JSON.stringify(continued)}`);
  }
  log(`reload → Continue: ${continued.hydraName}, turn ${continued.turn}, ${continued.explored} hexes known: ok`);

  // New Lineage asks first, then starts a new first hydra; the Book of Lineages has the one that ended.
  await page.reload();
  await waitForScene(page, 'title');
  await tap(page, await button(page, 'newLineage'));
  await page.waitForTimeout(300);
  const mapsBefore = await timesReady(page, 'map');
  await tap(page, await button(page, 'confirmYes'));
  await waitForScene(page, 'map', mapsBefore);
  const second = await page.evaluate(() => window.__hydra.runSummary());
  if (second.turn !== 1 || second.generation !== 1) throw new Error(`New Lineage looks wrong: ${JSON.stringify(second)}`);
  await page.reload();
  await waitForScene(page, 'title');
  await tap(page, await button(page, 'book'));
  await waitForScene(page, 'book');
  await tap(page, await button(page, 'back'));
  await waitForScene(page, 'title', 1);
  log(`New Lineage → ${second.hydraName}; the Book of Lineages opens: ok`);
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (errors.length > 0) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
log('smoke test passed');
