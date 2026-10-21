// Balance report: plays many automatic battles against every enemy group from src/data/enemies.json
// and shows how they end. Run it after changing numbers in src/data/:  npm run balance
// It prints a table and saves the same table to docs/BALANCE.md (scripts/balance.mjs does the running and saving).
//
// Two "players" are compared:
//   - "no orders":  the hydra is left alone, heads pick their own targets.
//   - "focus fire": every head that can reach is ordered onto one enemy at a time
//                   (Torchbearers first, then Headhunters, then the weakest). A simple stand-in for a careful player.
//   - "focus + skills": focus fire, and every head uses its Q and W skills whenever they are ready (at its target,
//                   the most wounded head or the first open stump). A stand-in for a player who uses skills.
// A second table swaps the Mist Breather of the starting hydra for each class in turn, to compare the classes.
// If "focus fire" is not clearly better than "no orders", the player's orders don't matter enough.

import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { runRulesFrom } from '../src/data/runRules';
import { applyCommand, canHeadReach, createBattle, skillCooldown, skillInSlot, stepBattle } from '../src/sim/battle';
import type { BattleRules, BattleState, Enemy, SkillAim } from '../src/sim/battle';
import { hex } from '../src/sim/hex';
import { createRun, pendingBattleSetup } from '../src/sim/turn';

/** A battle still running after this many seconds of game time counts as a stalemate. */
const TIME_LIMIT_SECONDS = 600;

type Policy = 'no orders' | 'focus fire' | 'focus + skills';
const POLICIES: Policy[] = ['no orders', 'focus fire', 'focus + skills'];
/** The groups the class table is played against: the two hardest. */
const CLASS_TABLE_GROUPS = ['burningDetail', 'pyreProcession'];

const data = loadGameData();
const rules = battleRulesFrom(data);
const runRules = runRulesFrom(data);

/** Lower number = kill first. */
function priority(enemy: Enemy, r: BattleRules): number {
  const behavior = r.enemyTypes[enemy.typeId]!.behavior;
  return behavior === 'torchbearer' ? 0 : behavior === 'headhunter' ? 1 : 2;
}

function giveFocusOrders(state: BattleState, r: BattleRules): void {
  for (const head of state.heads) {
    const inReach = state.enemies.filter((e) => canHeadReach(state, head, e, r));
    inReach.sort((a, b) => priority(a, r) - priority(b, r) || a.hp - b.hp || a.id - b.id);
    const target = inReach[0];
    if (!target) {
      if (head.orderTargetId !== null) applyCommand(state, { type: 'clearOrder', headId: head.id }, r);
    } else if (head.orderTargetId !== target.id) {
      applyCommand(state, { type: 'attack', headId: head.id, enemyId: target.id }, r);
    }
  }
}

/** Every head uses its two skills when they are ready: at the enemy it is ordered at, its most wounded friend or the first open stump. */
function useSkills(state: BattleState, r: BattleRules): void {
  for (const head of state.heads) {
    if (head.pendingSkill) continue;
    for (const slot of [0, 1]) {
      const skill = skillInSlot(state, head, slot, r);
      if (!skill || skillCooldown(head, skill.id) > 0) continue;
      const target = state.enemies.find((e) => e.id === head.orderTargetId) ?? state.enemies.find((e) => canHeadReach(state, head, e, r));
      const wounded = [...state.heads].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const stump = state.stumps.find((s) => !s.cauterized);
      let aim: SkillAim | null = null;
      if (skill.target === 'enemy' && target) aim = { kind: 'enemy', enemyId: target.id };
      else if (skill.target === 'hex' && target) aim = { kind: 'hex', at: target.hex };
      else if (skill.target === 'head' && wounded && wounded.hp < wounded.maxHp * 0.6) aim = { kind: 'head', headId: wounded.id };
      else if (skill.target === 'stump' && stump) aim = { kind: 'stump', stumpId: stump.id };
      else if (skill.target === 'none' && target) aim = { kind: 'none' };
      if (aim) {
        applyCommand(state, { type: 'useSkill', headId: head.id, slot, aim }, r);
        break;
      }
    }
  }
}

interface Totals {
  won: number;
  lost: number;
  stalemate: number;
  seconds: number;
  severed: number;
  cauterized: number;
  combos: number;
  headsAtEnd: number;
  bodyHpLost: number;
}

function play(groupId: string, policy: Policy, battles: number, headClasses: readonly string[] | null = null): Totals {
  const t: Totals = { won: 0, lost: 0, stalemate: 0, seconds: 0, severed: 0, cauterized: 0, combos: 0, headsAtEnd: 0, bodyHpLost: 0 };
  for (let seed = 1; seed <= battles; seed++) {
    // The same start as in the game: a fresh hydra with its starting heads walks into this group.
    const run = createRun(seed, runRules);
    run.pendingBattle = { at: hex(0, 0), groupId };
    const setup = pendingBattleSetup(run, runRules)!;
    if (headClasses) {
      setup.heads = headClasses.map((classId, i) => {
        const { maxHp } = rules.headClasses[classId]!;
        return { id: `b${i + 1}`, name: rules.headNames[i]!, classId, level: 1, hp: maxHp, maxHp };
      });
    }
    const state = createBattle(setup, rules);
    const startHp = state.body.hp;
    while (!state.outcome && state.tick < TIME_LIMIT_SECONDS * rules.ticksPerSecond) {
      // A player re-thinks orders now and then, not twenty times a second.
      if (policy !== 'no orders' && state.tick % 10 === 0) giveFocusOrders(state, rules);
      if (policy === 'focus + skills' && state.tick % 10 === 0) useSkills(state, rules);
      stepBattle(state, rules);
      for (const event of state.events) {
        if (event.type === 'severed') t.severed++;
        else if (event.type === 'cauterized') t.cauterized++;
        else if (event.type === 'combo') t.combos++;
      }
    }
    if (state.outcome === 'won') t.won++;
    else if (state.outcome === 'lost') t.lost++;
    else t.stalemate++;
    t.seconds += state.tick / rules.ticksPerSecond;
    t.headsAtEnd += state.heads.length;
    t.bodyHpLost += startHp - Math.max(0, state.body.hp);
  }
  return t;
}

/** Plays `battles` battles per enemy group and player, and returns the results as a Markdown table and a full report. */
export function balanceReport(battles = 200): { table: string; report: string } {
  const header = ['Enemy group', 'Members', 'Player', 'Won', 'Lost', 'Avg. length', 'Heads severed', 'Stumps burnt', 'Combos', 'Body HP lost'];
  const rows: string[][] = [];
  for (const group of data.enemies.encounterGroups) {
    for (const policy of POLICIES) {
      const t = play(group.id, policy, battles);
      const avg = (value: number) => (value / battles).toFixed(1);
      const percent = (value: number) => `${Math.round((value / battles) * 100)}%`;
      rows.push([
        group.id,
        group.members.map((id) => data.enemies.types[id]!.displayName).join(', '),
        policy,
        percent(t.won),
        percent(t.lost) + (t.stalemate > 0 ? ` (+${percent(t.stalemate)} never ended)` : ''),
        `${Math.round(t.seconds / battles)} s`,
        avg(t.severed),
        avg(t.cauterized),
        avg(t.combos),
        avg(t.bodyHpLost),
      ]);
    }
  }

  const table = [header, header.map(() => '---'), ...rows].map((cells) => `| ${cells.join(' | ')} |`).join('\n');

  // The classes compared: the starting hydra with its last head swapped for each class in turn.
  const kept = data.heads.startingHeads.slice(0, -1);
  const classHeader = ['Third head', ...CLASS_TABLE_GROUPS.flatMap((g) => [`${g}: won (focus)`, `${g}: won (+ skills)`, `${g}: HP lost (+ skills)`])];
  const classRows = Object.entries(data.heads.classes).map(([id, cls]) => {
    const cells = [cls.displayName];
    for (const group of CLASS_TABLE_GROUPS) {
      const focus = play(group, 'focus fire', battles, [...kept, id]);
      const skills = play(group, 'focus + skills', battles, [...kept, id]);
      cells.push(`${Math.round((focus.won / battles) * 100)}%`, `${Math.round((skills.won / battles) * 100)}%`, (skills.bodyHpLost / battles).toFixed(0));
    }
    return cells;
  });
  const classTable = [classHeader, classHeader.map(() => '---'), ...classRows].map((cells) => `| ${cells.join(' | ')} |`).join('\n');
  const keptNames = kept.map((id) => data.heads.classes[id]!.displayName).join(', ');
  const startingHeads = data.heads.startingHeads.map((id) => data.heads.classes[id]!.displayName).join(', ');
  const report = `# Balance report

Made by \`npm run balance\` from the numbers in \`src/data/\`. Run it again after changing them; don't edit this file by hand.

${battles} automatic battles per row, each with a fresh hydra (${startingHeads}) and ${data.balance.battle.bodyMaxHp} body HP.

- **no orders:** the hydra is left alone, heads pick their own targets.
- **focus fire:** every head that can reach attacks the same enemy (Torchbearers first, then Headhunters). A stand-in for a careful player.
- **focus + skills:** focus fire, and every head uses its Q and W skills as soon as they are ready. A stand-in for a player who uses skills (a real player aims them better).

"Heads severed", "Stumps burnt", "Combos" and "Body HP lost" are averages per battle.

${table}

## The head classes

The same fresh hydra, but with ${keptNames} and one head of each class in turn, against the hardest groups.

${classTable}
`;
  return { table, report };
}
