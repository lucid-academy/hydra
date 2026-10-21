import { describe, expect, it } from 'vitest';
import { parseUrlParams } from '../src/urlParams';

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
    });
  });

  it('returns defaults when nothing is given', () => {
    expect(parseUrlParams('')).toEqual({ seed: null, scene: null, debug: false, group: null, hp: null, speed: null, near: null, reveal: false, modifiers: [], zoom: null });
    expect(parseUrlParams('?reveal=1').reveal).toBe(true);
    expect(parseUrlParams('?near=shrine').near).toBe('shrine');
    expect(parseUrlParams('?zoom=0.45').zoom).toBe(0.45);
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
