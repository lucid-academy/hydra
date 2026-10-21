import { describe, expect, it } from 'vitest';
import { fitCanvas, MAX_HD_SCALE } from '../src/scaling';

describe('fitCanvas', () => {
  it('gives the canvas the device pixels of the largest 16:9 picture that fits', () => {
    expect(fitCanvas(1920, 1080, 1)).toEqual({ width: 1920, height: 1080, zoom: 1 });
    // A laptop: no whole-number zoom fits, the canvas uses the window anyway.
    expect(fitCanvas(1366, 768, 1)).toMatchObject({ width: 1365, height: 768 });
    // A phone on its side, 3 device pixels per page pixel: one canvas pixel per device pixel.
    const phone = fitCanvas(844, 390, 3);
    expect(phone).toMatchObject({ width: 2080, height: 1170 });
    expect(phone.zoom).toBeCloseTo(1 / 3);
  });

  it('caps the resolution of very large windows', () => {
    const big = fitCanvas(3840, 2160, 1);
    expect(big).toMatchObject({ width: 640 * MAX_HD_SCALE, height: 360 * MAX_HD_SCALE });
    expect(big.zoom).toBeCloseTo(3840 / (640 * MAX_HD_SCALE));
  });

  it('never goes under 640×360 pixels, shrinking the canvas on tiny screens instead', () => {
    const upright = fitCanvas(390, 844, 1);
    expect(upright).toMatchObject({ width: 640, height: 360 });
    expect(upright.zoom).toBeCloseTo(390 / 640);
  });
});
