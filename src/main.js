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
  paletteGrid: document.querySelector('#paletteGrid'),
  results: document.querySelector('.results'),
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

const exportButtons = [
  refs.copyCssBtn,
  refs.copyJsonBtn,
  refs.downloadCssBtn,
  refs.downloadJsonBtn,
];

let currentSource = null;
let currentResult = null;
let currentObjectUrl = null;
let cameraRequestToken = 0;

// Each run gets a token. Loading a new image, opening the camera or resetting
// retires it so an older analysis can never overwrite the current result.
let analysisToken = 0;

mountIcons();
resetRoles();

refs.fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file || !isValidImageFile(file)) return;
  setSource(URL.createObjectURL(file), { objectUrl: true });
  runAnalysis();
});

refs.dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  refs.dropzone.classList.add('is-dragging');
});

refs.dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  refs.dropzone.classList.remove('is-dragging');

  const file = event.dataTransfer.files?.[0];
  if (!file || !isValidImageFile(file)) return;
  setSource(URL.createObjectURL(file), { objectUrl: true });
  runAnalysis();
});

// Drag events bubble from every child in the label. Only clear the highlight
// when the pointer has actually left the whole drop target.
refs.dropzone.addEventListener('dragleave', (event) => {
  if (event.relatedTarget instanceof Node && refs.dropzone.contains(event.relatedTarget)) return;
  refs.dropzone.classList.remove('is-dragging');
});

refs.cameraBtn.addEventListener('click', openCamera);
refs.captureBtn.addEventListener('click', captureShot);
refs.closeCameraBtn.addEventListener('click', () => {
  closeCamera();
  if (!currentSource) renderEmptyPreview();
  setStatus('cameraClosed');
  refs.cameraBtn.focus();
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
  setExportsEnabled(false);
  refs.analyzeBtn.setAttribute('aria-busy', 'true');
  refs.results.setAttribute('aria-busy', 'true');
  refs.results.classList.add('is-updating');
  refs.analyzeBtn.querySelector('span').textContent = t('analyzingAction');
  setStatus('analyzing');

  try {
    const result = await analyzeImage(currentSource);

    if (token !== analysisToken) return;

    currentResult = result;
    renderResult(result);
    setExportsEnabled(Boolean(result.palette.length));
    setStatus(result.palette.length ? 'paletteReady' : 'noColors');
  } catch (error) {
    console.error(error);
    if (token === analysisToken) setStatus('analysisError');
  } finally {
    if (token === analysisToken) {
      refs.analyzeBtn.disabled = false;
      refs.analyzeBtn.removeAttribute('aria-busy');
      refs.results.removeAttribute('aria-busy');
      refs.results.classList.remove('is-updating');
      refs.analyzeBtn.querySelector('span').textContent = t('extractAction');
    }
  }
}

function renderResult(result) {
  refs.imageSize.textContent = `${result.meta.naturalWidth} x ${result.meta.naturalHeight}px`;
  refs.pixelCount.textContent = result.meta.pixelCount.toLocaleString('en-US');
  const averageHex = rgbToHex(result.meta.average);
  refs.averageColor.textContent = averageHex.toUpperCase();
  refs.averageColor.style.setProperty('--average-color', averageHex);
  refs.averageColor.dataset.hasValue = 'true';

  // A fully transparent image can legitimately produce no buckets. That is a
  // result, not a failure, and must not be exported as an empty ":root {}".
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
  cancelAnalysis();
  currentSource = source;
  currentObjectUrl = objectUrl ? source : null;
  clearResult();
  renderImagePreview(source);
  setStatus('imageLoaded');
}

function isValidImageFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const acceptedExtension = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(extension);

  if (!ACCEPTED_IMAGE_TYPES.has(file.type) && !(file.type === '' && acceptedExtension)) {
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

  const requestToken = (cameraRequestToken += 1);
  refs.cameraBtn.disabled = true;
  refs.cameraBtn.setAttribute('aria-busy', 'true');
  setStatus('openingCamera');

  try {
    const started = await camera.start({
      container: refs.previewFrame,
      label: t('camera'),
    });

    if (requestToken !== cameraRequestToken) {
      return;
    }

    if (!started) {
      setStatus('cameraNotFound');
      return;
    }

    revokeCurrentObjectUrl();
    cancelAnalysis();
    currentSource = null;
    clearResult();
    refs.cameraActions.hidden = false;
    refs.cameraBtn.hidden = true;
    refs.captureBtn.focus();
    setStatus('cameraActive');
  } catch (error) {
    console.error(error);
    if (requestToken !== cameraRequestToken) return;
    closeCamera();
    if (!currentSource) renderEmptyPreview();
    setStatus(camera.statusKeyForError(error));
  } finally {
    refs.cameraBtn.disabled = false;
    refs.cameraBtn.removeAttribute('aria-busy');
  }
}

async function captureShot() {
  const shot = camera.capture();

  if (!shot) {
    setStatus('cameraNotReady');
    return;
  }

  setSource(shot);
  await runAnalysis();
}

function closeCamera() {
  cameraRequestToken += 1;
  camera.stop();
  refs.cameraActions.hidden = true;
  refs.cameraBtn.hidden = false;
}

function resetApp() {
  closeCamera();
  revokeCurrentObjectUrl();
  cancelAnalysis();
  currentSource = null;
  refs.fileInput.value = '';
  renderEmptyPreview();
  clearResult();
  mountIcons();
  setStatus('ready');
}

function cancelAnalysis() {
  analysisToken += 1;
  refs.analyzeBtn.disabled = false;
  refs.analyzeBtn.removeAttribute('aria-busy');
  refs.results.removeAttribute('aria-busy');
  refs.results.classList.remove('is-updating');
  refs.analyzeBtn.querySelector('span').textContent = t('extractAction');
}

function clearResult() {
  currentResult = null;
  renderEmptyPalette();
  refs.imageSize.textContent = '-';
  refs.averageColor.textContent = '-';
  refs.averageColor.style.removeProperty('--average-color');
  delete refs.averageColor.dataset.hasValue;
  refs.pixelCount.textContent = '-';
  refs.codePreview.textContent = EMPTY_CSS_PREVIEW;
  resetRoles();
  setExportsEnabled(false);
}

function setExportsEnabled(enabled) {
  exportButtons.forEach((button) => {
    button.disabled = !enabled;
  });
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
