import { describe, expect, it } from 'vitest';
import { parseUrlParams, testUrl } from '../src/urlParams';

describe('parseUrlParams', () => {
  it('reads seed, scene and debug', () => {
    expect(parseUrlParams('?seed=123&scene=battle&debug=1&group=patrol&hp=5&speed=4')).toEqual({
      seed: 123,
      scene: 'battle',
      debug: true,
      group: 'patrol',
      hp: 5,
      allies: null,
      speed: 4,
      near: null,
      reveal: false,
      modifiers: [],
      zoom: null,
      say: null,
      event: null,
      flags: [],
      conditions: [],
      alert: null,
      units: [],
      ancestors: null,
      eggs: null,
      hidden: false,
      heads: [],
      level: null,
      ults: false,
      surface: false,
      night: false,
      exposed: false,
    });
  });

  it('reads test battle heads and ultimates', () => {
    expect(parseUrlParams('?heads=strangler, lantern,,tender&ults=1')).toMatchObject({ heads: ['strangler', 'lantern', 'tender'], ults: true });
  });

  it('returns defaults when nothing is given', () => {
    expect(parseUrlParams('')).toEqual({ seed: null, scene: null, debug: false, group: null, hp: null, allies: null, speed: null, near: null, reveal: false, modifiers: [], zoom: null, say: null, event: null, flags: [], conditions: [], alert: null, units: [], ancestors: null, eggs: null, hidden: false, heads: [], level: null, ults: false, surface: false, night: false, exposed: false });
    expect(parseUrlParams('?reveal=1').reveal).toBe(true);
    expect(parseUrlParams('?near=shrine').near).toBe('shrine');
    expect(parseUrlParams('?zoom=0.45').zoom).toBe(0.45);
    expect(parseUrlParams('?say=toadWelcome&event=titheBox')).toMatchObject({ say: 'toadWelcome', event: 'titheBox' });
    expect(parseUrlParams('?flags=hushedSongHeard, surveyChain,,hushedSongHeard').flags).toEqual(['hushedSongHeard', 'surveyChain']);
    expect(parseUrlParams('?conditions=warmed').conditions).toEqual(['warmed']);
    expect(parseUrlParams('?alert=60').alert).toBe(60);
  });

  it('reads run modifiers as a list, without blanks or repeats', () => {
    expect(parseUrlParams('?modifiers=wetYear,oldWorkings').modifiers).toEqual(['wetYear', 'oldWorkings']);
    expect(parseUrlParams('?modifiers= wetYear,,wetYear ').modifiers).toEqual(['wetYear']);
  });

  it('ignores an empty seed', () => {
    expect(parseUrlParams('?seed=').seed).toBeNull();
  });

  it('ignores body HP and speed that are not positive numbers', () => {
    expect(parseUrlParams('?hp=abc').hp).toBeNull();
    expect(parseUrlParams('?hp=0').hp).toBeNull();
    expect(parseUrlParams('?hp=-3').hp).toBeNull();
    expect(parseUrlParams('?speed=fast').speed).toBeNull();
  });
});

describe('testUrl', () => {
  it('a URL that starts elsewhere than the title or changes the run is a test, which never touches the saved game', () => {
    for (const query of ['', '?seed=7', '?seed=7&debug=1&speed=4&zoom=2', '?scene=title', '?scene=title&seed=3']) expect(testUrl(parseUrlParams(query)), query).toBe(false);
    for (const query of ['?scene=map', '?scene=battle', '?near=shrine', '?event=titheBox', '?say=toadWelcome', '?flags=surveyChain', '?conditions=warmed', '?alert=60', '?units=patrol', '?reveal=1', '?modifiers=wetYear', '?group=patrol', '?hp=3', '?allies=2', '?ancestors=2', '?eggs=0', '?hidden=1', '?heads=tender', '?level=3', '?ults=1']) {
      expect(testUrl(parseUrlParams(query)), query).toBe(true);
    }
    expect(parseUrlParams('?ancestors=2.7').ancestors).toBe(2);
    expect(parseUrlParams('?ancestors=0').ancestors).toBeNull();
    expect(parseUrlParams('?eggs=0').eggs).toBe(0);
    expect(parseUrlParams('?eggs=2.5').eggs).toBe(2);
    expect(parseUrlParams('?eggs=-1').eggs).toBeNull();
  });
});
