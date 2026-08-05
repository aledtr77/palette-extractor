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
import { statusTone, t } from './strings.js';
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
};

let currentSource = null;
let currentResult = null;
let currentObjectUrl = null;

// Now that the slider re-runs the analysis on release, two runs can be in
// flight at once — drag, let go, drag again. Each run takes the token it was
// given and drops its own result if a later one has already claimed the
// counter, so what is on screen is always the palette for the slider's current
// value and not whichever request happened to come back last. Loading a new
// image or resetting retires the token too.
let analysisToken = 0;

mountIcons();
resetRoles();

// 'input' tracks the thumb so the number under the cursor is the number on
// screen; 'change' fires once, on release.
refs.paletteSize.addEventListener('input', () => {
  refs.paletteSizeValue.value = refs.paletteSize.value;
});

// Re-runs on release when a palette is already showing. Without this the slider
// and the swatches disagree the moment you touch it, and nothing on screen says
// which of the two is the current one. The analysis is a few hundred
// milliseconds on the worst image the sampler will hand it, so it is cheaper to
// redo than to explain.
refs.paletteSize.addEventListener('change', () => {
  if (currentResult) runAnalysis();
});

refs.fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file || !isValidImageFile(file)) return;
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

// setSource() closes the camera itself, so these do not do it first.
refs.analyzeBtn.addEventListener('click', () => runAnalysis());
refs.demoBtn.addEventListener('click', async () => {
  setSource(createDemoImage());
  await runAnalysis();
});
refs.resetBtn.addEventListener('click', resetApp);

refs.copyCssBtn.addEventListener('click', () => copyExport('css'));
refs.copyJsonBtn.addEventListener('click', () => copyExport('json'));
refs.downloadCssBtn.addEventListener('click', () => downloadExport('palette.css', getCss()));
refs.downloadJsonBtn.addEventListener('click', () => downloadExport('palette.json', getJson()));

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

  const token = (analysisToken += 1);
  refs.analyzeBtn.disabled = true;
  setStatus('analyzing');

  try {
    const result = await analyzeImage(currentSource, {
      paletteSize: Number(refs.paletteSize.value),
    });

    if (token !== analysisToken) return;

    currentResult = result;
    renderResult(result);
    setStatus(result.palette.length ? 'paletteReady' : 'noColors');
  } catch (error) {
    console.error(error);
    if (token === analysisToken) setStatus('analysisError');
  } finally {
    if (token === analysisToken) refs.analyzeBtn.disabled = false;
  }
}

function renderResult(result) {
  refs.imageSize.textContent = `${result.meta.naturalWidth} x ${result.meta.naturalHeight}px`;
  refs.pixelCount.textContent = result.meta.pixelCount.toLocaleString('en-US');
  refs.averageColor.textContent = rgbToHex(result.meta.average).toUpperCase();
  refs.averageColor.style.color = rgbToHex(result.meta.average);

  // A palette can legitimately come back empty: the sampler drops pure white and
  // pure black, so an image made of nothing else leaves it with no buckets at
  // all. That is a result, not a failure — but rendering it as four empty boxes
  // under the word "ready" reads as a broken app, and the export would be an
  // empty ":root {}". Say what happened instead, and leave the panels as they
  // look before the first run.
  if (!result.palette.length) {
    refs.paletteGrid.innerHTML = emptyStateMarkup('noColorsFound');
    resetRoles();
    refs.codePreview.textContent = EMPTY_CSS_PREVIEW;
    return;
  }

  refs.paletteGrid.innerHTML = result.palette.map(swatchMarkup).join('');
  refs.rolesList.innerHTML = rolesMarkup(result.roles);
  refs.contrastCard.innerHTML = contrastMarkup(result.roles);
  refs.codePreview.textContent = getCss();
}

function setSource(source, { objectUrl = false } = {}) {
  closeCamera();
  revokeCurrentObjectUrl();
  // Whatever was being analysed is not this image. Retiring the token stops an
  // in-flight run from painting the previous picture's palette over the new one.
  analysisToken += 1;
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
  analysisToken += 1;
  currentSource = null;
  currentResult = null;
  refs.analyzeBtn.disabled = false;
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

// Both return '' when there is nothing worth exporting, which is what the copy
// and download handlers test. An empty palette counts: paletteToCss() would
// happily produce ":root {}", and handing someone that as a successful copy is
// worse than telling them there is nothing to copy.
function getCss() {
  if (!currentResult?.palette.length) return '';
  return paletteToCss(currentResult.palette, currentResult.roles);
}

function getJson() {
  if (!currentResult?.palette.length) return '';
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

// data-status-key is what the styles and any future test hook off; the tone
// drives the colour. The text is derived from both here and nowhere else.
function setStatus(key, { value = '' } = {}) {
  refs.status.dataset.statusKey = key;
  refs.status.dataset.statusTone = statusTone(key);
  refs.status.textContent = t(`status.${key}`).replace('{value}', value);
}
