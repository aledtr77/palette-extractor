// The colour maths. Everything here is checked against values that can be worked
// out by hand or come straight from the WCAG definition, not against what the
// code happens to return today — a test that only records current output cannot
// fail for a good reason.

import { describe, expect, it } from 'vitest';
import {
  clamp,
  contrastRatio,
  hexToRgb,
  hueDistance,
  labDistance,
  readableTextColor,
  relativeLuminance,
  rgbToHex,
  rgbToHsl,
  rgbToLab,
} from '../src/color.js';

describe('rgbToHsl', () => {
  it('places the primaries on their hue', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 });
  });

  it('reports greys as unsaturated', () => {
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 });
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
  });

  // Red sits on the seam: a hue computed as a small negative number and left
  // that way would sort and compare as if it were the far end of the wheel.
  it('never returns a negative hue just below red', () => {
    const { h } = rgbToHsl(255, 0, 1);
    expect(h).toBeGreaterThan(300);
    expect(h).toBeLessThanOrEqual(360);
  });
});

describe('rgbToHex and hexToRgb', () => {
  it('pads single-digit channels', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });

  // The averaging in mergeNearbyColors can land a channel just outside the
  // range; a hex of seven or nine characters would reach the CSS export.
  it('clamps and rounds out-of-range channels', () => {
    expect(rgbToHex({ r: 300, g: -20, b: 12.6 })).toBe('#ff000d');
  });

  it('reads a hex back to the channels it was written from', () => {
    for (const rgb of [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 18, g: 22, b: 30 },
      { r: 220, g: 60, b: 61 },
    ]) {
      expect(hexToRgb(rgbToHex(rgb))).toEqual(rgb);
    }
  });

  it('expands the three-digit shorthand', () => {
    expect(hexToRgb('#abc')).toEqual(hexToRgb('#aabbcc'));
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('clamp', () => {
  it('bounds on both sides and passes the middle through', () => {
    expect(clamp(-5, 0, 255)).toBe(0);
    expect(clamp(999, 0, 255)).toBe(255);
    expect(clamp(42, 0, 255)).toBe(42);
  });
});

describe('relativeLuminance and contrastRatio', () => {
  it('anchors the two ends of the WCAG scale', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5);
  });

  it('gives 1 for a colour against itself', () => {
    expect(contrastRatio({ r: 90, g: 120, b: 200 }, { r: 90, g: 120, b: 200 })).toBeCloseTo(1, 6);
  });

  // #767676 on white is the canonical "just passes AA for body text" pair.
  it('matches the known ratio for #767676 on white', () => {
    const ratio = contrastRatio({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeLessThan(4.6);
  });

  it('does not care which colour comes first', () => {
    const a = { r: 20, g: 40, b: 60 };
    const b = { r: 200, g: 210, b: 220 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe('readableTextColor', () => {
  it('picks the side that is actually readable', () => {
    expect(readableTextColor({ r: 255, g: 255, b: 255 }).hex).toBe('#0a0c10');
    expect(readableTextColor({ r: 0, g: 0, b: 0 }).hex).toBe('#ffffff');
  });

  // The one result that would simply be wrong: text nobody can read on the
  // background it was chosen for. The tool hands these out as a ready-made
  // scheme, so this is swept across the whole cube rather than spot-checked.
  it('clears AA on every background there is', () => {
    let worst = Infinity;
    let worstBackground = null;

    for (let r = 0; r <= 255; r += 3) {
      for (let g = 0; g <= 255; g += 3) {
        for (let b = 0; b <= 255; b += 3) {
          const { ratio } = readableTextColor({ r, g, b });
          if (ratio < worst) {
            worst = ratio;
            worstBackground = `rgb(${r}, ${g}, ${b})`;
          }
        }
      }
    }

    expect(worst, `worst background: ${worstBackground}`).toBeGreaterThanOrEqual(4.5);
  });

  it('reports the ratio it actually achieves', () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const background = { r, g, b };
          const chosen = readableTextColor(background);
          expect(chosen.ratio).toBeCloseTo(contrastRatio(chosen, background), 10);
        }
      }
    }
  });

  // Pure black is the fallback, not the default: it costs the palette its
  // softer black, so it may only appear where the softened one cannot reach AA.
  it('keeps the softened black wherever it already reads', () => {
    const softBlack = { r: 10, g: 12, b: 16 };

    for (let r = 0; r <= 255; r += 5) {
      for (let g = 0; g <= 255; g += 5) {
        for (let b = 0; b <= 255; b += 5) {
          const background = { r, g, b };
          const chosen = readableTextColor(background);
          if (chosen.hex !== '#000000') continue;
          // It fell back, so the softened black really was short of AA here.
          const softRatio = Math.max(
            contrastRatio(softBlack, background),
            contrastRatio({ r: 255, g: 255, b: 255 }, background),
          );
          expect(softRatio, `rgb(${r}, ${g}, ${b})`).toBeLessThan(4.5);
        }
      }
    }
  });

  it('clears AA comfortably on the light and dark ends', () => {
    expect(readableTextColor({ r: 255, g: 255, b: 255 }).ratio).toBeGreaterThan(15);
    expect(readableTextColor({ r: 18, g: 22, b: 30 }).ratio).toBeGreaterThan(14);
  });
});

describe('rgbToLab and labDistance', () => {
  it('puts white at L*100 with no chroma', () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(lab.l).toBeCloseTo(100, 1);
    expect(lab.a).toBeCloseTo(0, 1);
    expect(lab.b).toBeCloseTo(0, 1);
  });

  it('puts black at L*0', () => {
    expect(rgbToLab({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 3);
  });

  it('is zero for a colour against itself and symmetric otherwise', () => {
    const red = rgbToLab({ r: 255, g: 0, b: 0 });
    const blue = rgbToLab({ r: 0, g: 0, b: 255 });
    expect(labDistance(red, red)).toBe(0);
    expect(labDistance(red, blue)).toBeCloseTo(labDistance(blue, red), 10);
    expect(labDistance(red, blue)).toBeGreaterThan(50);
  });

  // Lab is used to decide whether two colours are the same one. If a step in
  // sRGB moved a different amount depending on where it started, the merge
  // threshold would mean something different in every part of the space.
  it('separates two colours the eye can tell apart by more than the merge threshold', () => {
    const near = labDistance(rgbToLab({ r: 200, g: 30, b: 30 }), rgbToLab({ r: 202, g: 32, b: 31 }));
    const far = labDistance(rgbToLab({ r: 200, g: 30, b: 30 }), rgbToLab({ r: 30, g: 30, b: 200 }));
    expect(near).toBeLessThan(8);
    expect(far).toBeGreaterThan(8);
  });
});

describe('hueDistance', () => {
  it('goes the short way round the wheel', () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(90, 90)).toBe(0);
  });
});
