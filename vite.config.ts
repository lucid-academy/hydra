import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths, so the build works on GitHub Pages under any repo name.
  base: './',
  build: {
    // Phaser alone is ~1.2 MB; don't warn about it.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Many tests build whole worlds (radius 40 since the Big World), which takes 3-8 s on a GitHub runner; the default
    // 5 s failed a deploy once. Tests that go through hundreds of worlds still set their own, longer timeout.
    testTimeout: 30_000,
  },
});
