// Wiring. This file owns the element references, the handful of pieces of state
// and the event listeners; the work itself lives in the modules it pulls in —
// colour maths in color.js, clustering in extractor.js, and the rest one concern
// per file.

import { rgbToHex } from './color.js';
import { analyzeImage, paletteToCss, paletteToJson } from './extractor.js';
import * as camera from './camera.js';
import { copyText, downloadText } from './export.js';
import { createDemoImage } from './demo.js';
import { mountIcons } from './icons.js';
import { getLocale, localeCode, setLocale, t, translateStaticNodes } from './i18n.js';
import {
  contrastMarkup,
  emptyStateMarkup,
  rolePlaceholdersMarkup,
  rolesMarkup,
  swatchMarkup,
} from './render.js';
import { APP_MARKUP, EMPTY_CSS_PREVIEW } from './template.js';
import './styles.css';

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

document.querySelector('#app').innerHTML = APP_MARKUP;

const refs = {
  fileInput: document.querySelector('#fileInput'),
  dropzone: document.querySelector('#dropzone'),
  previewFrame: document.querySelector('#previewFrame'),
  cameraBtn: document.querySelector('#cameraBtn'),
  captureBtn: document.querySelector('#captureBtn'),
  closeCameraBtn: document.querySelector('#closeCameraBtn'),
  cameraActions: document.querySelector('#cameraActions'),
  analyzeBtn: document.querySelector('#analyzeBtn'),
  demoBtn: document.querySelector('#demoBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  paletteSize: document.querySelector('#paletteSize'),
  paletteSizeValue: document.querySelector('#paletteSizeValue'),
  paletteGrid: document.querySelector('#paletteGrid'),
  rolesList: document.querySelector('#rolesList'),
  contrastCard: document.querySelector('#contrastCard'),
  imageSize: document.querySelector('#imageSize'),
  averageColor: document.querySelector('#averageColor'),
  pixelCount: document.querySelector('#pixelCount'),
  status: document.querySelector('#status'),
  copyCssBtn: document.querySelector('#copyCssBtn'),
  copyJsonBtn: document.querySelector('#copyJsonBtn'),
  downloadCssBtn: document.querySelector('#downloadCssBtn'),
  downloadJsonBtn: document.querySelector('#downloadJsonBtn'),
  codePreview: document.querySelector('#codePreview'),
  languageButtons: document.querySelectorAll('[data-lang]'),
};

let currentSource = null;
let currentResult = null;
let currentObjectUrl = null;

mountIcons();
resetRoles();
applyTranslations();

refs.paletteSize.addEventListener('input', () => {
  refs.paletteSizeValue.value = refs.paletteSize.value;
});

refs.fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file || !isValidImageFile(file)) return;
  closeCamera();
  setSource(URL.createObjectURL(file), { objectUrl: true });
});

refs.dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  refs.dropzone.classList.add('is-dragging');
});

refs.dropzone.addEventListener('dragleave', () => {
  refs.dropzone.classList.remove('is-dragging');
});

refs.dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  refs.dropzone.classList.remove('is-dragging');

  const file = event.dataTransfer.files?.[0];
  if (!file || !isValidImageFile(file)) return;
  closeCamera();
  setSource(URL.createObjectURL(file), { objectUrl: true });
});

refs.dropzone.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  refs.fileInput.click();
});

refs.cameraBtn.addEventListener('click', openCamera);
refs.captureBtn.addEventListener('click', captureShot);
refs.closeCameraBtn.addEventListener('click', () => {
  closeCamera();
  if (!currentSource) renderEmptyPreview();
  setStatus('cameraClosed');
});

refs.analyzeBtn.addEventListener('click', () => runAnalysis());
refs.demoBtn.addEventListener('click', async () => {
  closeCamera();
  setSource(createDemoImage());
  await runAnalysis();
});
refs.resetBtn.addEventListener('click', resetApp);

refs.copyCssBtn.addEventListener('click', () => copyExport('css'));
refs.copyJsonBtn.addEventListener('click', () => copyExport('json'));
refs.downloadCssBtn.addEventListener('click', () => downloadExport('palette.css', getCss()));
refs.downloadJsonBtn.addEventListener('click', () => downloadExport('palette.json', getJson()));

refs.languageButtons.forEach((button) => {
  button.addEventListener('click', () => changeLocale(button.dataset.lang));
});

// Every swatch, hex and role chip is copyable, and they are all rebuilt on each
// analysis — one delegated listener instead of rebinding them every time.
document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;

  const target = event.target.closest('[data-copy]');
  if (!target) return;

  const copied = await copyText(target.dataset.copy);
  setStatus(copied ? 'copied' : 'copyUnavailable', { value: target.dataset.copy.toUpperCase() });
});

async function runAnalysis() {
  if (!currentSource) {
    setStatus(camera.isActive() ? 'captureFirst' : 'loadFirst');
    return;
  }

  refs.analyzeBtn.disabled = true;
  setStatus('analyzing');

  try {
    currentResult = await analyzeImage(currentSource, {
      paletteSize: Number(refs.paletteSize.value),
    });
    renderResult(currentResult);
    setStatus('paletteReady');
  } catch (error) {
    console.error(error);
    setStatus('analysisError');
  } finally {
    refs.analyzeBtn.disabled = false;
  }
}

function renderResult(result) {
  refs.imageSize.textContent = `${result.meta.naturalWidth} x ${result.meta.naturalHeight}px`;
  refs.pixelCount.textContent = result.meta.pixelCount.toLocaleString(localeCode());
  refs.averageColor.textContent = rgbToHex(result.meta.average).toUpperCase();
  refs.averageColor.style.color = rgbToHex(result.meta.average);

  refs.paletteGrid.innerHTML = result.palette.map(swatchMarkup).join('');
  refs.rolesList.innerHTML = rolesMarkup(result.roles);
  refs.contrastCard.innerHTML = contrastMarkup(result.roles);
  refs.codePreview.textContent = getCss();
}

function setSource(source, { objectUrl = false } = {}) {
  closeCamera();
  revokeCurrentObjectUrl();
  currentSource = source;
  currentObjectUrl = objectUrl ? source : null;
  renderImagePreview(source);
  setStatus('imageLoaded');
}

function isValidImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    refs.fileInput.value = '';
    setStatus('unsupportedFormat');
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    refs.fileInput.value = '';
    setStatus('imageTooLarge');
    return false;
  }

  return true;
}

function renderImagePreview(source) {
  const image = document.createElement('img');
  image.src = source;
  image.alt = t('image');
  image.decoding = 'async';
  refs.previewFrame.replaceChildren(image);
}

function revokeCurrentObjectUrl() {
  if (!currentObjectUrl) return;
  URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
}

async function openCamera() {
  if (!camera.isSupported()) {
    setStatus('cameraUnavailable');
    return;
  }

  closeCamera();
  revokeCurrentObjectUrl();
  // Dropped here rather than after the stream opens: revoking the object URL
  // above already invalidated it, so keeping the reference would leave Analyse
  // pointing at a URL that no longer resolves.
  currentSource = null;

  refs.cameraBtn.disabled = true;
  setStatus('openingCamera');

  try {
    const started = await camera.start({
      container: refs.previewFrame,
      label: t('camera'),
    });

    if (!started) {
      setStatus('cameraNotFound');
      return;
    }

    refs.cameraActions.hidden = false;
    setStatus('cameraActive');
  } catch (error) {
    console.error(error);
    closeCamera();
    renderEmptyPreview();
    setStatus(camera.statusKeyForError(error));
  } finally {
    refs.cameraBtn.disabled = false;
  }
}

function captureShot() {
  const shot = camera.capture();

  if (!shot) {
    setStatus('cameraNotReady');
    return;
  }

  closeCamera();
  setSource(shot);
  setStatus('shotReady');
}

function closeCamera() {
  camera.stop();
  refs.cameraActions.hidden = true;
}

function resetApp() {
  closeCamera();
  revokeCurrentObjectUrl();
  currentSource = null;
  currentResult = null;
  refs.fileInput.value = '';
  renderEmptyPreview();
  renderEmptyPalette();
  refs.imageSize.textContent = '-';
  refs.averageColor.textContent = '-';
  refs.averageColor.style.color = '';
  refs.pixelCount.textContent = '-';
  refs.codePreview.textContent = EMPTY_CSS_PREVIEW;
  resetRoles();
  mountIcons();
  setStatus('ready');
}

function renderEmptyPreview() {
  const empty = document.createElement('div');
  empty.className = 'empty-preview';
  empty.setAttribute('aria-hidden', 'true');
  refs.previewFrame.replaceChildren(empty);
}

function renderEmptyPalette() {
  refs.paletteGrid.innerHTML = emptyStateMarkup('emptyPalette');
}

function resetRoles() {
  refs.rolesList.innerHTML = rolePlaceholdersMarkup();
  refs.contrastCard.innerHTML = emptyStateMarkup('contrastEmpty', { small: true });
}

function getCss() {
  if (!currentResult) return '';
  return paletteToCss(currentResult.palette, currentResult.roles);
}

function getJson() {
  if (!currentResult) return '';
  return paletteToJson(currentResult.palette, currentResult.roles, currentResult.meta);
}

async function copyExport(type) {
  const text = type === 'css' ? getCss() : getJson();

  if (!text) {
    setStatus('generateFirst');
    return;
  }

  const copied = await copyText(text);
  setStatus(copied ? 'copied' : 'copyUnavailable', { value: type.toUpperCase() });
}

function downloadExport(filename, text) {
  if (!text) {
    setStatus('generateFirst');
    return;
  }

  downloadText(filename, text);
  setStatus('downloaded', { value: filename });
}

function changeLocale(locale) {
  if (!setLocale(locale)) return;

  applyTranslations();

  // The palette and the roles carry translated labels, so they are rebuilt from
  // the result rather than patched in place.
  if (currentResult) {
    renderResult(currentResult);
  } else {
    renderEmptyPalette();
    resetRoles();
  }

  setStatus('languageChanged');
}

function applyTranslations() {
  translateStaticNodes();

  refs.languageButtons.forEach((button) => {
    const isActive = button.dataset.lang === getLocale();
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  document.querySelector('.language-switch')?.setAttribute('aria-label', t('language'));

  const statusKey = refs.status.dataset.statusKey;
  if (statusKey) refs.status.textContent = formatStatus(statusKey);

  mountIcons();
}

function setStatus(key, values = {}) {
  refs.status.dataset.statusKey = key;
  refs.status.dataset.statusValue = values.value ?? '';
  refs.status.textContent = formatStatus(key, values);
}

function formatStatus(key, values = {}) {
  const value = values.value ?? refs.status.dataset.statusValue ?? '';
  return t(`status.${key}`).replace('{value}', value);
}
