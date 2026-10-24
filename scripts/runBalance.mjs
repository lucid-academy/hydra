// Runs the run balance report (scripts/runBalance.ts) and saves it to docs/BALANCE_RUNS.md.
// The TypeScript file is loaded through Vite, so its imports work the same as in the game.
// Usage: npm run balance:runs            (50 runs)
//        npm run balance:runs -- 20      (quicker, rougher)   add "--no-save" to only print
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a)) ?? 50);
const { module } = await runnerImport(resolve('scripts/runBalance.ts'), { logLevel: 'warn' });
const { table, report } = module.runBalanceReport(runs);
console.log(table);
console.log(report.slice(report.indexOf('**§8 target:**')));
if (!args.includes('--no-save')) {
  writeFileSync('docs/BALANCE_RUNS.md', report);
  console.log('\nSaved to docs/BALANCE_RUNS.md');
}
