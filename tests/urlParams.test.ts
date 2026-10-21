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
      speed: 4,
      near: null,
      reveal: false,
      modifiers: [],
      zoom: null,
      say: null,
      event: null,
      flags: [],
      conditions: [],
      ancestors: null,
    });
  });

  it('returns defaults when nothing is given', () => {
    expect(parseUrlParams('')).toEqual({ seed: null, scene: null, debug: false, group: null, hp: null, speed: null, near: null, reveal: false, modifiers: [], zoom: null, say: null, event: null, flags: [], conditions: [], ancestors: null });
    expect(parseUrlParams('?reveal=1').reveal).toBe(true);
    expect(parseUrlParams('?near=shrine').near).toBe('shrine');
    expect(parseUrlParams('?zoom=0.45').zoom).toBe(0.45);
    expect(parseUrlParams('?say=toadWelcome&event=titheBox')).toMatchObject({ say: 'toadWelcome', event: 'titheBox' });
    expect(parseUrlParams('?flags=hushedSongHeard, surveyChain,,hushedSongHeard').flags).toEqual(['hushedSongHeard', 'surveyChain']);
    expect(parseUrlParams('?conditions=warmed').conditions).toEqual(['warmed']);
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
    for (const query of ['?scene=map', '?scene=battle', '?near=shrine', '?event=titheBox', '?say=toadWelcome', '?flags=surveyChain', '?conditions=warmed', '?reveal=1', '?modifiers=wetYear', '?group=patrol', '?hp=3', '?ancestors=2']) {
      expect(testUrl(parseUrlParams(query)), query).toBe(true);
    }
    expect(parseUrlParams('?ancestors=2.7').ancestors).toBe(2);
    expect(parseUrlParams('?ancestors=0').ancestors).toBeNull();
  });
});
