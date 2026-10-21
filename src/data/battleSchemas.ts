// Shapes of the battle pieces in heads.json and combos.json that are made of effects:
// what an attack, a skill or a combo does to a human, and a skill's special things.
// Times are in seconds, distances in hexes. schemas.ts uses these for heads.json and combos.json.

import { z } from 'zod';

function section<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...shape, '//': z.string().optional() }).strict();
}

const seconds = z.number().positive();
const hexCount = z.number().int().min(0);
const id = z.string().min(1);

/** One effect on a human. "The target" is the human the effect lands on. */
export const effectSchema = z.discriminatedUnion('type', [
  // Extra damage that ignores armor: `amount`, plus `ofHit` times the damage the hit just dealt (1 = the same again).
  section({ type: z.literal('damage'), amount: z.number().min(0).optional(), ofHit: z.number().min(0).optional() }),
  // A status on the target. `seconds`: how long; leave out for the status's own duration.
  section({ type: z.literal('status'), status: id, seconds: seconds.optional() }),
  // The status already on the target lasts longer.
  section({ type: z.literal('extendStatus'), status: id, seconds }),
  section({ type: z.literal('removeStatus'), status: id }),
  // The target's armor is gone for the rest of the battle.
  section({ type: z.literal('breakArmor') }),
  // The Mist cloud the target stands in turns acid and hurts everyone inside.
  section({ type: z.literal('acidifyMist'), damagePerSecond: z.number().positive(), seconds }),
  // The target's torch goes out: it can't cauterize stumps.
  section({ type: z.literal('putOutTorch'), seconds }),
  // The target is eaten whole. The body heals by the eating head's devourHeal times `healMultiplier`.
  section({ type: z.literal('devour'), healMultiplier: z.number().min(0).optional() }),
  section({ type: z.literal('healBody'), amount: z.number().positive() }),
  // Damage to every other human within `radius` of the target.
  section({ type: z.literal('splash'), amount: z.number().positive(), radius: hexCount }),
  // Everyone within `radius` of the target (the target too) gets the status.
  section({ type: z.literal('statusAround'), status: id, radius: hexCount, seconds: seconds.optional() }),
  // Everyone in the Mist cloud the target stands in gets the status.
  section({ type: z.literal('statusInCloud'), status: id, seconds: seconds.optional() }),
  // When `status` ends on the target, it gets `then`.
  section({ type: z.literal('afterStatus'), status: id, then: id, seconds: seconds.optional() }),
  // Pushed away from the body; if it runs into another human, both get `collisionStatus`.
  section({ type: z.literal('knockback'), hexes: hexCount, collisionStatus: id.optional(), collisionSeconds: seconds.optional() }),
  // Pulled towards the body.
  section({ type: z.literal('pull'), hexes: hexCount }),
  // The hit doesn't wake an Entranced target.
  section({ type: z.literal('keepEntranced') }),
]);

export type EffectData = z.infer<typeof effectSchema>;

/** Which humans a skill's effects land on. */
export const skillAreaSchema = z.discriminatedUnion('shape', [
  // The aimed human.
  section({ shape: z.literal('single') }),
  // Everyone within `radius` of the aimed human or hex.
  section({ shape: z.literal('around'), radius: hexCount }),
  // Everyone within `radius` of the body's edge.
  section({ shape: z.literal('aroundBody'), radius: hexCount }),
  // Everyone in reach in a wedge from the body towards the aim, `degrees` wide.
  section({ shape: z.literal('cone'), degrees: z.number().positive().max(360) }),
  // The aimed human and up to count - 1 others nearest to it, within `radius` of it.
  section({ shape: z.literal('nearest'), count: z.number().int().min(1), radius: hexCount }),
  // Everyone on the board.
  section({ shape: z.literal('all') }),
  // Nobody (the skill only does its special things).
  section({ shape: z.literal('none') }),
]);

/** A skill's special things, done once per use. */
export const skillSpecialSchema = z.discriminatedUnion('type', [
  // A Mist cloud on the aim; `wholeBoard`: over the whole board.
  section({ type: z.literal('mistCloud'), radius: hexCount, seconds, wholeBoard: z.boolean().optional() }),
  // A puddle around the aim: humans standing in it get the status.
  section({ type: z.literal('pool'), radius: hexCount, seconds, status: id }),
  // A false light on the aimed hex: humans within `radius` walk to it and (with `kneel`) kneel, Entranced.
  // Leave `radius` out to draw everyone. `skipsTypes`: enemy types it doesn't draw.
  section({ type: z.literal('beacon'), radius: hexCount.optional(), seconds, kneel: z.boolean(), skipsTypes: z.array(id).optional() }),
  // Moves the head's own clouds towards the aim.
  section({ type: z.literal('driftClouds'), hexes: hexCount }),
  section({ type: z.literal('selfAttackSpeed'), multiplier: z.number().positive(), seconds }),
  section({ type: z.literal('healOnKill'), amount: z.number().positive(), seconds }),
  // Every other head attacks faster.
  section({ type: z.literal('headsAttackSpeed'), multiplier: z.number().positive(), seconds }),
  // The aimed head heals by `share` of its max HP; `cleanse` ends its bad moods.
  section({ type: z.literal('healHead'), share: z.number().positive().max(1), cleanse: z.boolean() }),
  // The aimed stump can't be cauterized; `resetBurning` undoes the burning done so far.
  section({ type: z.literal('protectStump'), seconds, resetBurning: z.boolean() }),
  // The aimed stump regrows `multiplier` times faster.
  section({ type: z.literal('hurryStump'), multiplier: z.number().min(1) }),
  // The next regrowth gives this many heads (the head limit still holds).
  section({ type: z.literal('moreHeadsNextRegrowth'), heads: z.number().int().min(1) }),
  section({ type: z.literal('hurtSelf'), amount: z.number().positive() }),
  // Throws the human this head holds towards the aimed hex.
  section({ type: z.literal('toss'), hexes: hexCount, collisionStatus: id, collisionSeconds: seconds }),
  // Grabs up to `count` humans in reach at once.
  section({ type: z.literal('seizeMany'), count: z.number().int().min(1), seconds, breakArmor: z.boolean() }),
  // Eats every human in reach under `hpShare` of their HP, for `seconds`; then sleeps.
  section({ type: z.literal('bottomless'), seconds, hpShare: z.number().positive().max(1), sleepSeconds: seconds }),
  // Repeats the last skill another head used, at `power` strength.
  section({ type: z.literal('copycat'), power: z.number().positive().max(1) }),
  // One random find from the swamp (rummage in heads.json).
  section({ type: z.literal('rummage') }),
  // With `chance`: damage to every human; those left under `killBelowShare` of their HP are torn apart.
  section({ type: z.literal('multiverse'), chance: z.number().min(0).max(1), damage: z.number().positive(), killBelowShare: z.number().min(0).max(1) }),
]);

export type SkillSpecialData = z.infer<typeof skillSpecialSchema>;

export const SKILL_TARGETS = ['enemy', 'hex', 'head', 'stump', 'none'] as const;

export const skillSchema = section({
  displayName: z.string().min(1),
  // One line for the skill's button and the codex.
  description: z.string().min(1),
  // What the player aims it at: a human ("enemy"), a hex, one of the hydra's heads, a stump, or nothing ("none": it happens at once).
  target: z.enum(SKILL_TARGETS),
  // Hexes from the body. Leave out for skills aimed at heads, stumps or nothing.
  range: z.number().int().min(0).optional(),
  cooldownSeconds: seconds,
  tags: z.array(id).optional(),
  // The aimed human is hit for this many times the head's attack damage (armor applies).
  hitMultiplier: z.number().min(0).optional(),
  // Only humans under this share of their HP can be aimed at.
  targetHpBelow: z.number().positive().max(1).optional(),
  // Only a head holding a human (Seized) can use it.
  needsHeld: z.boolean().optional(),
  // Only after the head ate someone, and it uses one meal up.
  usesMeal: z.boolean().optional(),
  // Which humans `effects` land on. Leave out for the aimed human only.
  area: skillAreaSchema.optional(),
  effects: z.array(effectSchema).optional(),
  specials: z.array(skillSpecialSchema).optional(),
});

/** What The Spare can pull out of the swamp with Rummage. */
export const rummageFindSchema = z.discriminatedUnion('type', [
  // Heals the most wounded head.
  section({ id, weight: z.number().positive(), type: z.literal('healHead'), amount: z.number().positive() }),
  // Lands on the human nearest to the body: everyone within `radius` of it gets the status.
  section({ id, weight: z.number().positive(), type: z.literal('statusAroundNearest'), status: id, radius: hexCount, seconds: seconds.optional() }),
  // Heals every head of a class (a fish for the Glutton).
  section({ id, weight: z.number().positive(), type: z.literal('healClass'), classId: id, amount: z.number().positive() }),
  section({ id, weight: z.number().positive(), type: z.literal('nothing') }),
]);

/** Status ids an effect, area or special mentions (for checking them against combos.json). */
export function statusesIn(effects: readonly EffectData[] = [], specials: readonly SkillSpecialData[] = []): string[] {
  const ids: string[] = [];
  for (const e of effects) {
    if ('status' in e) ids.push(e.status);
    if (e.type === 'afterStatus') ids.push(e.then);
    if (e.type === 'knockback' && e.collisionStatus) ids.push(e.collisionStatus);
  }
  for (const s of specials) {
    if (s.type === 'pool') ids.push(s.status);
    if (s.type === 'toss') ids.push(s.collisionStatus);
  }
  return ids;
}
