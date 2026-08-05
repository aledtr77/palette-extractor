// Extraction, clustering and the pass that turns a palette into UI roles.
//
// analyzeImage() and loadImage() are not here: they need an <img> and a canvas,
// so they are checked in a browser, which is the only place they can be checked.
// Everything below them was kept free of the DOM precisely so it could be run
// like this.

import { describe, expect, it } from 'vitest';
import { rgbToHsl, rgbToLab } from '../src/color.js';
import {
  extractPalette,
  mergeNearbyColors,
  normalizePaletteSize,
  paletteToCss,
  paletteToJson,
  pickRoles,
} from '../src/extractor.js';

/** A bucket in the shape sampleImage() hands to extractPalette(). */
function bucket(r, g, b, count) {
  const hsl = rgbToHsl(r, g, b);
  return {
    r,
    g,
    b,
    hsl,
    lab: rgbToLab({ r, g, b }),
    count,
    weight: count * (0.76 + hsl.s / 180),
  };
}

describe('normalizePaletteSize', () => {
  it('keeps the slider inside 4–10', () => {
    expect(normalizePaletteSize(2)).toBe(4);
    expect(normalizePaletteSize(99)).toBe(10);
    expect(normalizePaletteSize('7')).toBe(7);
    expect(normalizePaletteSize(7.6)).toBe(8);
  });

  it('falls back to 8 when there is no number at all', () => {
    expect(normalizePaletteSize('abc')).toBe(8);
    expect(normalizePaletteSize(undefined)).toBe(8);
    expect(normalizePaletteSize(NaN)).toBe(8);
  });

  // Number(null) and Number('') are both 0 — finite, and low enough to clamp to
  // the minimum. They mean the same thing undefined means, so they have to give
  // the same answer, or an empty input silently becomes a four-colour palette.
  it('treats null and the empty string as absent, not as zero', () => {
    expect(normalizePaletteSize(null)).toBe(8);
    expect(normalizePaletteSize('')).toBe(8);
  });

  it('still clamps a real zero to the minimum', () => {
    expect(normalizePaletteSize(0)).toBe(4);
    expect(normalizePaletteSize('0')).toBe(4);
  });
});

describe('mergeNearbyColors', () => {
  it('folds two colours the eye would not tell apart', () => {
    const merged = mergeNearbyColors([bucket(200, 30, 30, 100), bucket(202, 32, 31, 40)]);
    expect(merged).toHaveLength(1);
    // Counts and weights add up: the merged entry stands for both.
    expect(merged[0].count).toBe(140);
  });

  it('leaves colours that are genuinely different alone', () => {
    const merged = mergeNearbyColors([bucket(200, 30, 30, 100), bucket(30, 30, 200, 40)]);
    expect(merged).toHaveLength(2);
  });

  it('does not mutate the array it was given', () => {
    const input = [bucket(200, 30, 30, 100), bucket(202, 32, 31, 40)];
    const before = input.map((c) => `${c.r},${c.g},${c.b},${c.count}`);
    mergeNearbyColors(input);
    expect(input.map((c) => `${c.r},${c.g},${c.b},${c.count}`)).toEqual(before);
  });
});

describe('extractPalette', () => {
  it('returns nothing for an image with nothing in it', () => {
    expect(extractPalette([], 6)).toEqual([]);
  });

  it('finds the colours that are actually in the picture', () => {
    const palette = extractPalette(
      [
        bucket(220, 40, 40, 4000),
        bucket(40, 90, 220, 3000),
        bucket(30, 160, 90, 2000),
        bucket(240, 200, 60, 1000),
      ],
      4,
    );

    expect(palette.length).toBeGreaterThan(0);
    expect(palette.length).toBeLessThanOrEqual(4);

    // Every entry the UI renders needs these: a swatch, a readable label, and
    // a share of the image to show under it.
    for (const color of palette) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.text.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.coverage).toBeGreaterThan(0);
      expect(color.coverage).toBeLessThanOrEqual(1);
    }
  });

  it('sorts by score, strongest first', () => {
    const palette = extractPalette(
      [bucket(220, 40, 40, 4000), bucket(40, 90, 220, 3000), bucket(30, 160, 90, 500)],
      3,
    );
    const scores = palette.map((c) => c.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('never asks for more centres than there are buckets', () => {
    expect(() => extractPalette([bucket(10, 20, 30, 5)], 10)).not.toThrow();
    expect(extractPalette([bucket(10, 20, 30, 5)], 10).length).toBeLessThanOrEqual(1);
  });

  // An image with four colours in it cannot yield ten, and the slider is
  // allowed to ask for ten. Returning fewer is the right answer, not a failure.
  it('never returns more than it was asked for', () => {
    const buckets = [
      bucket(220, 40, 40, 4000),
      bucket(40, 90, 220, 3000),
      bucket(30, 160, 90, 2000),
      bucket(240, 200, 60, 1000),
      bucket(150, 60, 200, 900),
      bucket(250, 140, 40, 700),
    ];

    for (const size of [4, 5, 6, 8, 10]) {
      expect(extractPalette(buckets, size).length).toBeLessThanOrEqual(size);
    }
  });

  it('gives the same palette for the same buckets', () => {
    const buckets = [bucket(220, 40, 40, 4000), bucket(40, 90, 220, 3000), bucket(30, 160, 90, 900)];
    const first = extractPalette(buckets, 3).map((c) => c.hex);
    const second = extractPalette(buckets, 3).map((c) => c.hex);
    expect(second).toEqual(first);
  });
});

describe('pickRoles', () => {
  const palette = extractPalette(
    [
      bucket(18, 22, 30, 6000),
      bucket(220, 60, 60, 2500),
      bucket(60, 190, 170, 1500),
      bucket(240, 220, 180, 800),
    ],
    4,
  );

  it('has nothing to assign when the palette is empty', () => {
    expect(pickRoles([])).toBeNull();
  });

  it('takes the background from the dark end', () => {
    expect(pickRoles(palette).background.hsl.l).toBeLessThanOrEqual(46);
  });

  // The roles are handed to the user as a ready-made scheme. Text that cannot
  // be read on its own background is the one result that is simply wrong.
  it('returns text that is readable on the background it chose', () => {
    expect(pickRoles(palette).text.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('does not hand the same colour to background and primary', () => {
    const roles = pickRoles(palette);
    expect(roles.primary.hex).not.toBe(roles.background.hex);
  });

  it('fills all four roles even when the palette is only two colours long', () => {
    const roles = pickRoles(extractPalette([bucket(18, 22, 30, 6000), bucket(220, 60, 60, 2500)], 2));
    for (const role of ['background', 'primary', 'accent', 'text']) {
      expect(roles[role].hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('exports', () => {
  const palette = extractPalette([bucket(18, 22, 30, 6000), bucket(220, 60, 60, 2500)], 2);
  const roles = pickRoles(palette);

  it('writes CSS custom properties for the palette and the roles', () => {
    const css = paletteToCss(palette, roles);
    expect(css.startsWith(':root {')).toBe(true);
    expect(css.trimEnd().endsWith('}')).toBe(true);
    expect(css).toContain(`--color-1: ${palette[0].hex};`);
    expect(css).toContain(`--bg: ${roles.background.hex};`);
    expect(css).toContain(`--text: ${roles.text.hex};`);
  });

  it('leaves the role block out when there are no roles', () => {
    const css = paletteToCss(palette, null);
    expect(css).not.toContain('--bg:');
    expect(css).toContain('--color-1:');
  });

  it('produces JSON that parses, with coverage cut to four decimals', () => {
    const parsed = JSON.parse(paletteToJson(palette, roles, { name: 'demo.png' }));
    expect(parsed.image).toEqual({ name: 'demo.png' });
    expect(parsed.palette).toHaveLength(palette.length);
    expect(parsed.roles.background).toBe(roles.background.hex);
    for (const color of parsed.palette) {
      expect(String(color.coverage).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
    }
  });

  it('says roles are null rather than omitting the key', () => {
    expect(JSON.parse(paletteToJson(palette, null, {})).roles).toBeNull();
  });
});
