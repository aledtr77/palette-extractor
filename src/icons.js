// Lucide ships icons as data, not as markup: [tag, attributes, children]. This
// turns that into an inline <svg> so the page never fetches an icon font or a
// sprite sheet.

import {
  Camera,
  Check,
  Copy,
  Download,
  RefreshCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide';

const ICONS = {
  camera: Camera,
  check: Check,
  copy: Copy,
  download: Download,
  refresh: RefreshCcw,
  sparkles: Sparkles,
  upload: Upload,
  x: X,
};

const ICON_SIZE = 18;

// Safe to call again after re-rendering: a slot that already holds an <svg> is
// left alone.
export function mountIcons() {
  document.querySelectorAll('[data-icon]').forEach((element) => {
    const icon = ICONS[element.dataset.icon];
    if (!icon || element.querySelector('svg')) return;
    element.insertAdjacentHTML('afterbegin', iconToSvg(icon));
  });
}

function iconToSvg(icon) {
  const [, attributes, children] = icon;
  const merged = {
    ...attributes,
    width: ICON_SIZE,
    height: ICON_SIZE,
    'aria-hidden': 'true',
  };

  return `<svg ${toAttributes(merged)}>${children.map(childToSvg).join('')}</svg>`;
}

function childToSvg([tag, attributes]) {
  return `<${tag} ${toAttributes(attributes)}></${tag}>`;
}

function toAttributes(attributes) {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ');
}
