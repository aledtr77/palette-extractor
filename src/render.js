// Markup for the three blocks that are rebuilt from a result: the swatch grid,
// the UI roles and the contrast card. Each takes data and returns a string —
// they touch no state and no elements, so the caller decides where they land.

import { contrastRatio, readableTextColor, wcagLevel } from './color.js';
import { t } from './strings.js';

// A ratio and the grade it clears, together. Printed apart they are two facts
// the reader has to join; printed together they are an answer.
function ratioMarkup(ratio) {
  const level = wcagLevel(ratio);

  return `<strong class="ratio">${ratio.toFixed(1)}:1 <span class="wcag" data-level="${level}">${t(
    `wcag.${level}`,
  )}</span></strong>`;
}

export function swatchMarkup(color, index) {
  const coverage = Math.round(color.coverage * 1000) / 10;
  const position = String(index + 1).padStart(2, '0');

  return `
    <article class="swatch" aria-label="Color ${index + 1}: ${color.hex}, ${coverage}% coverage">
      <button
        class="swatch-chip"
        type="button"
        style="background:${color.hex};color:${color.text.hex}"
        data-copy="${color.hex}"
        aria-label="${t('copy')} ${color.hex}"
      >
        <span>${position}</span>
        <strong>${coverage}%</strong>
      </button>
      <div class="swatch-meta">
        <button type="button" class="hex-copy" data-copy="${color.hex}">${color.hex.toUpperCase()}</button>
        <span>rgb(${color.r}, ${color.g}, ${color.b})</span>
        <span>hsl(${color.hsl.h} ${color.hsl.s}% ${color.hsl.l}%)</span>
        <span class="swatch-ratio">Aa ${ratioMarkup(color.text.ratio)}</span>
      </div>
    </article>
  `;
}

export function rolesMarkup(roles) {
  if (!roles) return '';

  return [
    [t('roles.background'), roles.background],
    [t('roles.primary'), roles.primary],
    [t('roles.accent'), roles.accent],
    [t('roles.text'), roles.text],
  ]
    .map(([label, color]) => {
      const hex = color.hex.toUpperCase();

      return `
        <button class="role-item" type="button" data-copy="${color.hex}" aria-label="${t('copy')} ${label} ${hex}">
          <span class="role-dot" style="background:${color.hex}" aria-hidden="true"></span>
          <span>
            <strong>${label}</strong>
            <small>${hex}</small>
          </span>
        </button>
      `;
    })
    .join('');
}

export function contrastMarkup(roles) {
  if (!roles) return '';

  const primaryRatio = contrastRatio(roles.primary, roles.background);
  const accentRatio = contrastRatio(roles.accent, roles.background);
  const textRatio = contrastRatio(roles.text, roles.background);

  return `
    <div class="contrast-preview" style="background:${roles.background.hex};color:${roles.text.hex}">
      <span>${t('themePreview')}</span>
      <strong>Primary ${primaryRatio.toFixed(1)}:1</strong>
      <span class="preview-cta" style="background:${roles.primary.hex};color:${readableTextColor(roles.primary).hex}">
        CTA
      </span>
    </div>
    <div class="contrast-list">
      <span>Text / Background ${ratioMarkup(textRatio)}</span>
      <span>Primary / Background ${ratioMarkup(primaryRatio)}</span>
      <span>Accent / Background ${ratioMarkup(accentRatio)}</span>
    </div>
    <p class="contrast-note">
      Graded for normal text: AA needs 4.5:1, AAA 7:1. <strong>AA Large</strong> clears
      3:1 — enough for large text and UI components, not for body copy.
    </p>
  `;
}

export function rolePlaceholdersMarkup() {
  return '<div class="role-placeholder"></div>'.repeat(4);
}

export function emptyStateMarkup(key, { small = false } = {}) {
  return `<div class="empty-state${small ? ' small' : ''}">${t(key)}</div>`;
}
