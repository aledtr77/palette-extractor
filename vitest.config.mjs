// Deliberately not an extension of vite.config.js. That file exists to produce
// dist/; none of it has anything to say about whether rgbToHsl() is right, and
// pulling it in would make every test run pay for a build it does not use.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node, not jsdom: what is tested here is the logic that was deliberately
    // kept out of the DOM. The parts that need an <img>, a canvas or a camera
    // are checked in a real browser, which is the only place they can be.
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
