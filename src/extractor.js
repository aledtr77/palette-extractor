import {
  contrastRatio,
  hueDistance,
  labDistance,
  readableTextColor,
  rgbToHex,
  rgbToHsl,
  rgbToLab,
} from './color.js';

const MAX_ANALYSIS_SIDE = 760;
const MAX_BUCKETS = 12000;

export async function analyzeImage(source, options = {}) {
  const paletteSize = normalizePaletteSize(options.paletteSize);
  const image = await loadImage(source);
  const sample = sampleImage(image);
  const palette = extractPalette(sample.buckets, paletteSize);
  const roles = pickRoles(palette);

  return {
    palette,
    roles,
    meta: {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      width: sample.width,
      height: sample.height,
      pixelCount: sample.pixelCount,
      average: sample.average,
    },
  };
}

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Immagine non leggibile'));
    image.src = source;
  });
}

function sampleImage(image) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const ratio = Math.min(
    1,
    MAX_ANALYSIS_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  const stride = Math.max(1, Math.floor((width * height) / 90000));
  const buckets = new Map();
  let pixelCount = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (let index = 0; index < data.length; index += 4 * stride) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.55) continue;

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max > 248 && min > 248) continue;
    if (max < 6 && min < 6) continue;

    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }

    pixelCount += 1;
    rSum += r;
    gSum += g;
    bSum += b;
  }

  let prepared = Array.from(buckets.values())
    .map((bucket) => {
      const rgb = {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      };
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return {
        ...rgb,
        lab: rgbToLab(rgb),
        hsl,
        count: bucket.count,
        weight: bucket.count * (0.76 + hsl.s / 180),
      };
    })
    .sort((a, b) => b.weight - a.weight);

  if (prepared.length > MAX_BUCKETS) prepared = prepared.slice(0, MAX_BUCKETS);

  return {
    width,
    height,
    pixelCount,
    buckets: prepared,
    average: {
      r: Math.round(rSum / Math.max(1, pixelCount)),
      g: Math.round(gSum / Math.max(1, pixelCount)),
      b: Math.round(bSum / Math.max(1, pixelCount)),
    },
  };
}

function extractPalette(buckets, size) {
  if (!buckets.length) return [];

  const k = Math.min(size + 2, buckets.length);
  const centers = seedCenters(buckets, k);

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const groups = centers.map(() => ({
      r: 0,
      g: 0,
      b: 0,
      count: 0,
      weight: 0,
      members: 0,
    }));

    for (const bucket of buckets) {
      const index = nearestCenter(bucket, centers);
      const group = groups[index];
      group.r += bucket.r * bucket.weight;
      group.g += bucket.g * bucket.weight;
      group.b += bucket.b * bucket.weight;
      group.count += bucket.count;
      group.weight += bucket.weight;
      group.members += 1;
    }

    groups.forEach((group, index) => {
      if (!group.weight) return;
      const rgb = {
        r: Math.round(group.r / group.weight),
        g: Math.round(group.g / group.weight),
        b: Math.round(group.b / group.weight),
      };
      centers[index] = {
        ...rgb,
        lab: rgbToLab(rgb),
        hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
        count: group.count,
        weight: group.weight,
        members: group.members,
      };
    });
  }

  const totalPixelCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const merged = mergeNearbyColors(centers)
    .map((color) => decorateColor(color, totalPixelCount))
    .filter((color) => color.coverage >= 0.005)
    .sort((a, b) => b.score - a.score);

  return merged.slice(0, size);
}

function normalizePaletteSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 8;
  return Math.max(4, Math.min(10, Math.round(parsed)));
}

function seedCenters(buckets, size) {
  const centers = [buckets[0]];

  while (centers.length < size) {
    let best = null;
    let bestScore = -Infinity;

    for (const bucket of buckets) {
      const minDistance = Math.min(
        ...centers.map((center) => labDistance(bucket.lab, center.lab)),
      );
      const score = Math.sqrt(bucket.weight) * minDistance;
      if (score > bestScore) {
        best = bucket;
        bestScore = score;
      }
    }

    centers.push(best);
  }

  return centers.map((center) => ({ ...center }));
}

function nearestCenter(bucket, centers) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  centers.forEach((center, index) => {
    const distance = labDistance(bucket.lab, center.lab);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });

  return bestIndex;
}

function mergeNearbyColors(colors) {
  const sorted = [...colors].sort((a, b) => b.weight - a.weight);
  const merged = [];

  for (const color of sorted) {
    const similar = merged.find((item) => labDistance(item.lab, color.lab) < 8);

    if (!similar) {
      merged.push({ ...color });
      continue;
    }

    const totalWeight = similar.weight + color.weight;
    const rgb = {
      r: Math.round((similar.r * similar.weight + color.r * color.weight) / totalWeight),
      g: Math.round((similar.g * similar.weight + color.g * color.weight) / totalWeight),
      b: Math.round((similar.b * similar.weight + color.b * color.weight) / totalWeight),
    };

    Object.assign(similar, {
      ...rgb,
      lab: rgbToLab(rgb),
      hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
      count: similar.count + color.count,
      weight: totalWeight,
    });
  }

  return merged;
}

function decorateColor(color, total) {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const hex = rgbToHex(color);
  const text = readableTextColor(color);
  const chromaBoost = 0.68 + hsl.s / 145;
  const lightnessPenalty = hsl.l < 8 || hsl.l > 94 ? 0.72 : 1;

  return {
    r: color.r,
    g: color.g,
    b: color.b,
    hsl,
    lab: color.lab,
    hex,
    text,
    count: color.count,
    coverage: color.count / Math.max(1, total),
    score: color.count * chromaBoost * lightnessPenalty,
  };
}

function pickRoles(palette) {
  if (!palette.length) return null;

  const darkCandidates = palette.filter((color) => color.hsl.l <= 46);
  const background =
    darkCandidates.sort((a, b) => {
      const aScore = a.coverage * 1.8 + (100 - a.hsl.s) / 150 + (50 - a.hsl.l) / 120;
      const bScore = b.coverage * 1.8 + (100 - b.hsl.s) / 150 + (50 - b.hsl.l) / 120;
      return bScore - aScore;
    })[0] ?? palette[0];

  const primary =
    palette
      .filter((color) => color.hex !== background.hex)
      .sort((a, b) => roleColorScore(b, background) - roleColorScore(a, background))[0] ??
    palette[0];

  const accent =
    palette
      .filter((color) => color.hex !== background.hex && color.hex !== primary.hex)
      .sort((a, b) => {
        const aScore =
          roleColorScore(a, background) +
          hueDistance(a.hsl.h, primary.hsl.h) / 120 +
          Math.abs(a.hsl.l - primary.hsl.l) / 80;
        const bScore =
          roleColorScore(b, background) +
          hueDistance(b.hsl.h, primary.hsl.h) / 120 +
          Math.abs(b.hsl.l - primary.hsl.l) / 80;
        return bScore - aScore;
      })[0] ?? primary;

  return {
    background,
    primary,
    accent,
    text: readableTextColor(background),
  };
}

function roleColorScore(color, background) {
  const contrast = contrastRatio(color, background);
  const contrastScore = contrast >= 3 ? 1.3 : contrast / 3;
  return color.coverage * 1.2 + color.hsl.s / 62 + contrastScore + color.hsl.l / 180;
}

export function paletteToCss(palette, roles) {
  const lines = [':root {'];

  palette.forEach((color, index) => {
    lines.push(`  --color-${index + 1}: ${color.hex};`);
  });

  if (roles) {
    lines.push(
      `  --bg: ${roles.background.hex};`,
      `  --primary: ${roles.primary.hex};`,
      `  --accent: ${roles.accent.hex};`,
      `  --text: ${roles.text.hex};`,
    );
  }

  lines.push('}');
  return lines.join('\n');
}

export function paletteToJson(palette, roles, meta) {
  return JSON.stringify(
    {
      image: meta,
      palette: palette.map((color) => ({
        hex: color.hex,
        rgb: { r: color.r, g: color.g, b: color.b },
        hsl: color.hsl,
        coverage: Number(color.coverage.toFixed(4)),
      })),
      roles: roles
        ? {
            background: roles.background.hex,
            primary: roles.primary.hex,
            accent: roles.accent.hex,
            text: roles.text.hex,
          }
        : null,
    },
    null,
    2,
  );
}
