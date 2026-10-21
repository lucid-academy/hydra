// Names the battle data files borrow from each other (heads.json, combos.json, enemies.json) must exist.

import { statusesIn } from './battleSchemas';
import type { CombosData, EnemiesData, HeadsData } from './schemas';

export function battleProblems(heads: HeadsData, combos: CombosData, enemies?: EnemiesData): string[] {
  const problems: string[] = [];
  const statuses = Object.keys(combos.statuses);
  const classes = Object.keys(heads.classes);
  const tags = new Set([...Object.values(heads.classes).flatMap((c) => c.attack.tags), ...Object.values(heads.skills).flatMap((s) => s.tags ?? [])]);
  const status = (file: string, path: string, id: string) => {
    if (!statuses.includes(id)) problems.push(`  - src/data/${file}, ${path}: unknown status "${id}"; known (from combos.json): ${statuses.join(', ')}`);
  };

  for (const [id, cls] of Object.entries(heads.classes)) {
    statusesIn(cls.attack.randomEffects).forEach((s) => status('heads.json', `classes.${id}.attack.randomEffects`, s));
  }
  for (const [id, skill] of Object.entries(heads.skills)) {
    statusesIn(skill.effects, skill.specials).forEach((s) => status('heads.json', `skills.${id}`, s));
  }
  heads.rummage.forEach((find, i) => {
    if (find.type === 'statusAroundNearest') status('heads.json', `rummage.${i}.status`, find.status);
  });
  // Seizing is a hold by a head: the status must break when the head is hit.
  if (statuses.includes('seized') && combos.statuses.seized!.breaksWhenHolderTakes === undefined) {
    problems.push('  - src/data/combos.json, statuses.seized.breaksWhenHolderTakes: Seized is a hold; it needs the damage that breaks it');
  }
  if (!classes.includes(combos.spareMischief.classId)) problems.push(`  - src/data/combos.json, spareMischief.classId: unknown head class "${combos.spareMischief.classId}"`);
  combos.combos.forEach((combo, c) => {
    const headClass = combo.conditions.headClass;
    if (headClass !== undefined && !classes.includes(headClass)) problems.push(`  - src/data/combos.json, combos.${c}.conditions.headClass: unknown head class "${headClass}"; known: ${classes.join(', ')}`);
    const tag = combo.conditions.otherHeads?.tag;
    if (tag !== undefined && !tags.has(tag)) problems.push(`  - src/data/combos.json, combos.${c}.conditions.otherHeads.tag: no head attack or skill has the tag "${tag}"`);
    for (const line of combo.lines ?? []) {
      if (!['any', 'enemy', ...classes].includes(line.speaker)) problems.push(`  - src/data/combos.json, combos.${c}.lines: unknown speaker "${line.speaker}"; use a head class, "any" or "enemy"`);
    }
  });
  if (enemies) {
    for (const [id, type] of Object.entries(enemies.types)) {
      (type.immuneTo ?? []).forEach((s) => status('enemies.json', `types.${id}.immuneTo`, s));
    }
  }
  return problems;
}
