import { describe, expect, it } from 'vitest';
import { computeZoom, fitCanvas, MAX_HD_SCALE } from '../src/scaling';

describe('computeZoom', () => {
  it('uses the largest whole-number zoom that fits', () => {
    expect(computeZoom(1920, 1080, 640, 360)).toBe(3);
    expect(computeZoom(1366, 768, 640, 360)).toBe(2);
    expect(computeZoom(844, 390, 640, 360)).toBe(1);
  });

  it('shrinks by a fraction only when the screen is smaller than the game', () => {
    expect(computeZoom(390, 844, 640, 360)).toBeCloseTo(390 / 640);
  });
});

describe('fitCanvas', () => {
  it('keeps the classic 640×360 canvas, zoomed by whole numbers', () => {
    expect(fitCanvas(1920, 1080, 2, false)).toEqual({ width: 640, height: 360, zoom: 3 });
    expect(fitCanvas(1366, 768, 1, false)).toEqual({ width: 640, height: 360, zoom: 2 });
  });

  it('in HD gives the canvas the device pixels of the largest 16:9 picture that fits', () => {
    expect(fitCanvas(1920, 1080, 1, true)).toEqual({ width: 1920, height: 1080, zoom: 1 });
    // A laptop: no whole-number zoom fits, HD uses the window anyway.
    expect(fitCanvas(1366, 768, 1, true)).toMatchObject({ width: 1365, height: 768 });
    // A phone on its side, 3 device pixels per page pixel: one canvas pixel per device pixel.
    const phone = fitCanvas(844, 390, 3, true);
    expect(phone).toMatchObject({ width: 2080, height: 1170 });
    expect(phone.zoom).toBeCloseTo(1 / 3);
  });

  it('in HD caps the resolution of very large windows', () => {
    const big = fitCanvas(3840, 2160, 1, true);
    expect(big).toMatchObject({ width: 640 * MAX_HD_SCALE, height: 360 * MAX_HD_SCALE });
    expect(big.zoom).toBeCloseTo(3840 / (640 * MAX_HD_SCALE));
  });

  it('in HD never goes under 640×360 pixels, shrinking the canvas on tiny screens instead', () => {
    const upright = fitCanvas(390, 844, 1, true);
    expect(upright).toMatchObject({ width: 640, height: 360 });
    expect(upright.zoom).toBeCloseTo(390 / 640);
  });
});
