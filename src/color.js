const D65 = { x: 0.95047, y: 1, z: 1.08883 };

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function toHex(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

export function rgbToHex(color) {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const normalized =
    value.length === 3 ? value.split('').map((char) => char + char).join('') : value;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHsl(r, g, b) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(lightness * 100) };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue;
  if (max === nr) hue = (ng - nb) / delta + (ng < nb ? 6 : 0);
  else if (max === ng) hue = (nb - nr) / delta + 2;
  else hue = (nr - ng) / delta + 4;

  return {
    h: Math.round((hue / 6) * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

// 0.03928 here and 0.04045 in rgbToLab() are not a typo and not a drift: they
// are two different documents. WCAG 2.x fixes the luminance threshold at
// 0.03928, the sRGB standard rounds the same crossing to 0.04045, and the two
// have never been reconciled. Contrast ratios are a WCAG claim, so they follow
// WCAG; Lab is a colour-science conversion, so it follows sRGB. The gap between
// them is under one part in 4000 of a channel and cannot move a ratio.
export function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(first, second) {
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

const WHITE = { r: 255, g: 255, b: 255 };
const SOFT_BLACK = { r: 10, g: 12, b: 16 };
const PURE_BLACK = { r: 0, g: 0, b: 0 };

export const AA_LARGE_TEXT = 3;
export const AA_NORMAL_TEXT = 4.5;
export const AAA_NORMAL_TEXT = 7;

/**
 * Which WCAG 2.1 grade a contrast ratio actually clears, as a token — the words
 * for it live in strings.js, because this file does maths and not prose.
 *
 * The tool's whole claim is contrast, so a ratio printed on its own is only half
 * an answer: 1.04:1 and 7.2:1 look equally like data until something says which
 * one you can ship. 3:1 is the floor for large text and for UI components,
 * 4.5:1 for body text, 7:1 for AAA.
 */
export function wcagLevel(ratio) {
  if (ratio >= AAA_NORMAL_TEXT) return 'aaa';
  if (ratio >= AA_NORMAL_TEXT) return 'aa';
  if (ratio >= AA_LARGE_TEXT) return 'aaLarge';
  return 'fail';
}

function betterOn(background, dark) {
  const whiteRatio = contrastRatio(WHITE, background);
  const darkRatio = contrastRatio(dark, background);
  const rgb = whiteRatio >= darkRatio ? WHITE : dark;

  return {
    ...rgb,
    hex: rgbToHex(rgb),
    ratio: Math.max(whiteRatio, darkRatio),
  };
}

/**
 * Text that can actually be read on the given background.
 *
 * Two colours cannot cover every background: around L*50 white and black are
 * equally far away, and the lift that softens SOFT_BLACK is enough to land the
 * worst case at 4.42 — under what AA asks for normal text. Backgrounds near
 * #518175 hit it. Pure black buys the difference back (its own worst case
 * against white is 4.58), so it steps in exactly where the softened black
 * falls short and nowhere else: the palette keeps its softer black on every
 * background where that one already reads.
 */
export function readableTextColor(background) {
  const softened = betterOn(background, SOFT_BLACK);
  return softened.ratio >= AA_NORMAL_TEXT ? softened : betterOn(background, PURE_BLACK);
}

export function rgbToLab({ r, g, b }) {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  const z = lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041;

  const fx = xyzToLabPivot(x / D65.x);
  const fy = xyzToLabPivot(y / D65.y);
  const fz = xyzToLabPivot(z / D65.z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function xyzToLabPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

export function labDistance(first, second) {
  return Math.sqrt(
    (first.l - second.l) ** 2 +
      (first.a - second.a) ** 2 +
      (first.b - second.b) ** 2,
  );
}

export function hueDistance(first, second) {
  const distance = Math.abs(first - second);
  return Math.min(distance, 360 - distance);
}
