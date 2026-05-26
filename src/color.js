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

export function readableTextColor(background) {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 10, g: 12, b: 16 };
  const whiteRatio = contrastRatio(white, background);
  const blackRatio = contrastRatio(black, background);
  const rgb = whiteRatio >= blackRatio ? white : black;

  return {
    ...rgb,
    hex: rgbToHex(rgb),
    ratio: Math.max(whiteRatio, blackRatio),
  };
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
