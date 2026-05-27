import {
  Camera,
  Check,
  Copy,
  Download,
  Image,
  RefreshCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide';
import { contrastRatio, readableTextColor, rgbToHex } from './color.js';
import { analyzeImage, paletteToCss, paletteToJson } from './extractor.js';
import './styles.css';

const app = document.querySelector('#app');
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
]);
const TRANSLATIONS = {
  it: {
    title: 'Da foto a palette UI, con colori piu puliti e riutilizzabili.',
    demo: 'Demo',
    reset: 'Reset',
    uploadTitle: 'Carica o trascina una foto',
    uploadMeta: 'Analisi locale nel browser. Nessun upload.',
    camera: 'Fotocamera',
    capture: 'Scatta',
    close: 'Chiudi',
    colors: 'Colori',
    analyze: 'Estrai palette',
    image: 'Immagine',
    average: 'Media',
    pixels: 'Pixel letti',
    dominantPalette: 'Palette dominante',
    dominantPaletteMeta: 'Ordinata per rilevanza percettiva, non solo per numero grezzo di pixel.',
    ready: 'Pronto',
    emptyPalette: "Carica un'immagine o avvia la demo.",
    uiRoles: 'Ruoli UI',
    uiRolesMeta: 'Colori pronti per tema, testi e CTA.',
    export: 'Export',
    exportMeta: 'CSS variables e JSON generati dalla palette corrente.',
    contrastEmpty: "I controlli contrasto compariranno dopo l'analisi.",
    themePreview: 'Anteprima tema',
    developedBy: 'Sviluppato da',
    footerNote: 'Palette extractor per interfacce, brand e prodotti digitali.',
    privacyPolicy: 'Privacy Policy',
    cookiePolicy: 'Cookie Policy',
    language: 'Lingua',
    copy: 'Copia',
    roles: {
      background: 'Background',
      primary: 'Primary',
      accent: 'Accent',
      text: 'Text',
    },
    status: {
      ready: 'Pronto',
      loadFirst: 'Carica prima una foto',
      captureFirst: 'Scatta prima una foto',
      analyzing: 'Analisi in corso',
      paletteReady: 'Palette pronta',
      analysisError: 'Errore analisi',
      imageLoaded: 'Immagine caricata',
      unsupportedFormat: 'Formato immagine non supportato',
      imageTooLarge: 'Immagine troppo pesante',
      cameraUnavailable: 'Fotocamera non disponibile',
      openingCamera: 'Apro la fotocamera',
      cameraNotFound: 'Fotocamera non rilevata',
      cameraActive: 'Fotocamera attiva',
      cameraClosed: 'Fotocamera chiusa',
      cameraNotReady: 'Fotocamera non pronta',
      cameraDenied: 'Permesso fotocamera negato',
      cameraBusy: 'Fotocamera gia in uso',
      shotReady: 'Scatto pronto',
      generateFirst: 'Genera prima la palette',
      copyUnavailable: 'Copia non disponibile',
      copied: '{value} copiato',
      downloaded: '{value} scaricato',
      languageChanged: 'Lingua impostata su italiano',
    },
  },
  en: {
    title: 'From photo to UI palette, with cleaner and reusable colors.',
    demo: 'Demo',
    reset: 'Reset',
    uploadTitle: 'Upload or drop a photo',
    uploadMeta: 'Local browser analysis. No upload.',
    camera: 'Camera',
    capture: 'Capture',
    close: 'Close',
    colors: 'Colors',
    analyze: 'Extract palette',
    image: 'Image',
    average: 'Average',
    pixels: 'Pixels read',
    dominantPalette: 'Dominant palette',
    dominantPaletteMeta: 'Sorted by perceptual relevance, not only by raw pixel count.',
    ready: 'Ready',
    emptyPalette: 'Upload an image or start the demo.',
    uiRoles: 'UI roles',
    uiRolesMeta: 'Colors ready for theme, text and CTAs.',
    export: 'Export',
    exportMeta: 'CSS variables and JSON generated from the current palette.',
    contrastEmpty: 'Contrast controls will appear after analysis.',
    themePreview: 'Theme preview',
    developedBy: 'Developed by',
    footerNote: 'Palette extractor for interfaces, brands and digital products.',
    privacyPolicy: 'Privacy Policy',
    cookiePolicy: 'Cookie Policy',
    language: 'Language',
    copy: 'Copy',
    roles: {
      background: 'Background',
      primary: 'Primary',
      accent: 'Accent',
      text: 'Text',
    },
    status: {
      ready: 'Ready',
      loadFirst: 'Upload a photo first',
      captureFirst: 'Capture a photo first',
      analyzing: 'Analyzing',
      paletteReady: 'Palette ready',
      analysisError: 'Analysis error',
      imageLoaded: 'Image loaded',
      unsupportedFormat: 'Unsupported image format',
      imageTooLarge: 'Image is too large',
      cameraUnavailable: 'Camera unavailable',
      openingCamera: 'Opening camera',
      cameraNotFound: 'Camera not found',
      cameraActive: 'Camera active',
      cameraClosed: 'Camera closed',
      cameraNotReady: 'Camera not ready',
      cameraDenied: 'Camera permission denied',
      cameraBusy: 'Camera already in use',
      shotReady: 'Capture ready',
      generateFirst: 'Generate the palette first',
      copyUnavailable: 'Copy unavailable',
      copied: '{value} copied',
      downloaded: '{value} downloaded',
      languageChanged: 'Language set to English',
    },
  },
};

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Codedge Palette Extractor</p>
        <h1 data-i18n="title">Da foto a palette UI, con colori piu puliti e riutilizzabili.</h1>
      </div>
      <div class="hero-actions">
        <div class="language-switch" role="group" aria-label="Lingua">
          <button class="language-option is-active" type="button" data-lang="it" aria-pressed="true">IT</button>
          <button class="language-option" type="button" data-lang="en" aria-pressed="false">EN</button>
        </div>
        <button class="button secondary" id="demoBtn" type="button" data-icon="sparkles">
          <span data-i18n="demo">Demo</span>
        </button>
        <button class="button secondary" id="resetBtn" type="button" data-icon="refresh">
          <span data-i18n="reset">Reset</span>
        </button>
      </div>
    </section>

    <section class="workspace">
      <aside class="input-panel">
        <label class="dropzone" id="dropzone" for="fileInput" role="button" tabindex="0">
          <input
            class="file-input"
            id="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            aria-describedby="dropMeta"
          />
          <span class="drop-icon" data-icon="upload"></span>
          <span class="drop-title" data-i18n="uploadTitle">Carica o trascina una foto</span>
          <span class="drop-meta" id="dropMeta" data-i18n="uploadMeta">Analisi locale nel browser. Nessun upload.</span>
        </label>

        <div class="source-actions">
          <button class="button secondary" id="cameraBtn" type="button" data-icon="camera">
            <span data-i18n="camera">Fotocamera</span>
          </button>
        </div>

        <div class="preview-frame" id="previewFrame">
          <div class="empty-preview" data-icon="image"></div>
        </div>

        <div class="camera-actions" id="cameraActions" hidden>
          <button class="button primary" id="captureBtn" type="button" data-icon="camera">
            <span data-i18n="capture">Scatta</span>
          </button>
          <button class="button secondary" id="closeCameraBtn" type="button" data-icon="x">
            <span data-i18n="close">Chiudi</span>
          </button>
        </div>

        <div class="control-row">
          <label for="paletteSize" data-i18n="colors">Colori</label>
          <output id="paletteSizeValue">8</output>
        </div>
        <input class="range" id="paletteSize" type="range" min="4" max="10" value="8" />

        <button class="button primary analyze-button" id="analyzeBtn" type="button" data-icon="sparkles">
          <span data-i18n="analyze">Estrai palette</span>
        </button>

        <div class="metrics">
          <div>
            <span data-i18n="image">Immagine</span>
            <strong id="imageSize">-</strong>
          </div>
          <div>
            <span data-i18n="average">Media</span>
            <strong id="averageColor">-</strong>
          </div>
          <div>
            <span data-i18n="pixels">Pixel letti</span>
            <strong id="pixelCount">-</strong>
          </div>
        </div>
      </aside>

      <section class="results">
        <div class="section-head">
          <div>
            <h2 data-i18n="dominantPalette">Palette dominante</h2>
            <p data-i18n="dominantPaletteMeta">Ordinata per rilevanza percettiva, non solo per numero grezzo di pixel.</p>
          </div>
          <div class="status" id="status" role="status" aria-live="polite" data-status-key="ready">Pronto</div>
        </div>

        <div class="palette-grid" id="paletteGrid">
          <div class="empty-state" data-i18n="emptyPalette">Carica un'immagine o avvia la demo.</div>
        </div>

        <div class="detail-grid">
          <section class="panel roles-panel">
            <div class="section-head compact">
              <div>
                <h2 data-i18n="uiRoles">Ruoli UI</h2>
                <p data-i18n="uiRolesMeta">Colori pronti per tema, testi e CTA.</p>
              </div>
            </div>
            <div class="roles-list" id="rolesList"></div>
            <div class="contrast-card" id="contrastCard"></div>
          </section>

          <section class="panel export-panel">
            <div class="section-head compact">
              <div>
                <h2 data-i18n="export">Export</h2>
                <p data-i18n="exportMeta">CSS variables e JSON generati dalla palette corrente.</p>
              </div>
            </div>
            <div class="export-actions">
              <button class="button secondary" id="copyCssBtn" type="button" data-icon="copy">
                <span>CSS</span>
              </button>
              <button class="button secondary" id="copyJsonBtn" type="button" data-icon="copy">
                <span>JSON</span>
              </button>
              <button class="button secondary" id="downloadCssBtn" type="button" data-icon="download">
                <span>.css</span>
              </button>
              <button class="button secondary" id="downloadJsonBtn" type="button" data-icon="download">
                <span>.json</span>
              </button>
            </div>
            <pre id="codePreview">:root {
  --color-1: ...
}</pre>
          </section>
        </div>
      </section>
    </section>

    <footer class="site-footer">
      <div class="footer-brand">
        <span data-i18n="developedBy">Sviluppato da</span>
        <a href="https://codedge.it" target="_blank" rel="noopener noreferrer">codedge.it</a>
      </div>
      <div class="footer-meta">
        <p data-i18n="footerNote">Palette extractor per interfacce, brand e prodotti digitali.</p>
        <nav class="footer-links" aria-label="Policy">
          <a href="https://codedge.it/privacy-policy/" target="_blank" rel="noopener noreferrer" data-i18n="privacyPolicy">Privacy Policy</a>
          <a href="https://codedge.it/cookie-policy/" target="_blank" rel="noopener noreferrer" data-i18n="cookiePolicy">Cookie Policy</a>
        </nav>
      </div>
    </footer>
  </main>
`;

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

let currentLocale = 'it';
let currentSource = null;
let currentResult = null;
let cameraStream = null;
let currentObjectUrl = null;

mountIcons();
resetRoles();
applyTranslations();

refs.paletteSize.addEventListener('input', () => {
  refs.paletteSizeValue.value = refs.paletteSize.value;
});

refs.fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!isValidImageFile(file)) return;
  stopCamera();
  await setSource(URL.createObjectURL(file), { objectUrl: true });
});

refs.dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  refs.dropzone.classList.add('is-dragging');
});

refs.dropzone.addEventListener('dragleave', () => {
  refs.dropzone.classList.remove('is-dragging');
});

refs.dropzone.addEventListener('drop', async (event) => {
  event.preventDefault();
  refs.dropzone.classList.remove('is-dragging');
  const file = event.dataTransfer.files?.[0];
  if (!file || !isValidImageFile(file)) return;
  stopCamera();
  await setSource(URL.createObjectURL(file), { objectUrl: true });
});

refs.dropzone.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  refs.fileInput.click();
});

refs.cameraBtn.addEventListener('click', startCamera);
refs.captureBtn.addEventListener('click', captureFromCamera);
refs.closeCameraBtn.addEventListener('click', () => {
  stopCamera();
  if (!currentSource) renderEmptyPreview();
  setStatus('cameraClosed');
});
refs.analyzeBtn.addEventListener('click', () => runAnalysis());
refs.demoBtn.addEventListener('click', async () => {
  stopCamera();
  await setSource(createDemoImage());
  await runAnalysis();
});
refs.resetBtn.addEventListener('click', resetApp);

refs.copyCssBtn.addEventListener('click', () => copyExport('css'));
refs.copyJsonBtn.addEventListener('click', () => copyExport('json'));
refs.downloadCssBtn.addEventListener('click', () => downloadExport('palette.css', getCss()));
refs.downloadJsonBtn.addEventListener('click', () => downloadExport('palette.json', getJson()));
refs.languageButtons.forEach((button) => {
  button.addEventListener('click', () => setLocale(button.dataset.lang));
});

async function runAnalysis() {
  if (!currentSource) {
    setStatus(cameraStream ? 'captureFirst' : 'loadFirst');
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

  refs.paletteGrid.innerHTML = result.palette.map(renderSwatch).join('');
  refs.rolesList.innerHTML = renderRoles(result.roles);
  refs.contrastCard.innerHTML = renderContrast(result.roles);
  refs.codePreview.textContent = getCss();
}

function renderSwatch(color, index) {
  const textColor = color.text.hex;
  const coverage = Math.round(color.coverage * 1000) / 10;

  return `
    <article class="swatch">
      <button
        class="swatch-chip"
        type="button"
        style="background:${color.hex};color:${textColor}"
        data-copy="${color.hex}"
        aria-label="${t('copy')} ${color.hex}"
      >
        <span>${String(index + 1).padStart(2, '0')}</span>
        <strong>${coverage}%</strong>
      </button>
      <div class="swatch-meta">
        <button type="button" class="hex-copy" data-copy="${color.hex}">${color.hex.toUpperCase()}</button>
        <span>rgb(${color.r}, ${color.g}, ${color.b})</span>
        <span>hsl(${color.hsl.h} ${color.hsl.s}% ${color.hsl.l}%)</span>
        <span>Aa ${color.text.ratio.toFixed(1)}:1</span>
      </div>
    </article>
  `;
}

function renderRoles(roles) {
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
        <button class="role-item" type="button" data-copy="${color.hex}" aria-label="Copia ${label} ${hex}">
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

function renderContrast(roles) {
  if (!roles) return '';
  const primaryRatio = contrastRatio(roles.primary, roles.background);
  const accentRatio = contrastRatio(roles.accent, roles.background);
  const textRatio = contrastRatio(roles.text, roles.background);

  return `
    <div class="contrast-preview" style="background:${roles.background.hex};color:${roles.text.hex}">
      <span>${t('themePreview')}</span>
      <strong>Primary ${primaryRatio.toFixed(1)}:1</strong>
      <button type="button" style="background:${roles.primary.hex};color:${readableTextColor(roles.primary).hex}">
        CTA
      </button>
    </div>
    <div class="contrast-list">
      <span>Text / Background <strong>${textRatio.toFixed(1)}:1</strong></span>
      <span>Primary / Background <strong>${primaryRatio.toFixed(1)}:1</strong></span>
      <span>Accent / Background <strong>${accentRatio.toFixed(1)}:1</strong></span>
    </div>
  `;
}

async function setSource(source, options = {}) {
  stopCamera();
  revokeCurrentObjectUrl();
  currentSource = source;
  currentObjectUrl = options.objectUrl ? source : null;
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

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('cameraUnavailable');
    return;
  }

  stopCamera();
  revokeCurrentObjectUrl();
  refs.cameraBtn.disabled = true;
  setStatus('openingCamera');

  try {
    const hasCamera = await hasVideoInput();
    if (hasCamera === false) {
      setStatus('cameraNotFound');
      return;
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    currentSource = null;
    const video = document.createElement('video');
    video.className = 'camera-preview';
    video.id = 'cameraPreview';
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-label', t('camera'));
    refs.previewFrame.replaceChildren(video);
    video.srcObject = cameraStream;
    await video.play();
    refs.cameraActions.hidden = false;
    setStatus('cameraActive');
  } catch (error) {
    console.error(error);
    stopCamera();
    renderEmptyPreview();
    setStatus(cameraErrorMessage(error));
  } finally {
    refs.cameraBtn.disabled = false;
  }
}

async function hasVideoInput() {
  if (!navigator.mediaDevices?.enumerateDevices) return null;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'videoinput');
  } catch {
    return null;
  }
}

function cameraErrorMessage(error) {
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
    return 'cameraNotFound';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'cameraDenied';
  }

  if (error?.name === 'NotReadableError') {
    return 'cameraBusy';
  }

  return 'cameraUnavailable';
}

function captureFromCamera() {
  const video = document.querySelector('#cameraPreview');
  if (!video || !video.videoWidth || !video.videoHeight) {
    setStatus('cameraNotReady');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const source = canvas.toDataURL('image/jpeg', 0.92);
  stopCamera();
  setSource(source);
  setStatus('shotReady');
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  refs.cameraActions.hidden = true;
}

function createDemoImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="1200" height="800" fill="#111827"/>
      <rect x="0" y="0" width="680" height="800" fill="#0f766e"/>
      <circle cx="770" cy="235" r="190" fill="#f59e0b"/>
      <circle cx="920" cy="520" r="230" fill="#e11d48"/>
      <rect x="170" y="155" width="380" height="490" rx="72" fill="#f8fafc"/>
      <rect x="235" y="220" width="250" height="62" rx="31" fill="#0ea5e9"/>
      <rect x="235" y="336" width="190" height="38" rx="19" fill="#334155"/>
      <rect x="235" y="410" width="255" height="38" rx="19" fill="#94a3b8"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resetApp() {
  stopCamera();
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
  refs.codePreview.textContent = ':root {\\n  --color-1: ...\\n}';
  resetRoles();
  mountIcons();
  setStatus('ready');
}

function renderEmptyPreview() {
  const empty = document.createElement('div');
  empty.className = 'empty-preview';
  empty.dataset.icon = 'image';
  empty.setAttribute('aria-hidden', 'true');
  refs.previewFrame.replaceChildren(empty);
  mountIcons();
}

function resetRoles() {
  refs.rolesList.innerHTML = `
    <div class="role-placeholder"></div>
    <div class="role-placeholder"></div>
    <div class="role-placeholder"></div>
    <div class="role-placeholder"></div>
  `;
  refs.contrastCard.innerHTML = `<div class="empty-state small">${t('contrastEmpty')}</div>`;
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

  const ok = await copyText(text);
  setStatus(ok ? 'copied' : 'copyUnavailable', { value: type.toUpperCase() });
}

function downloadExport(filename, text) {
  if (!text) {
    setStatus('generateFirst');
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
  setStatus('downloaded', { value: filename });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }
}

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const target = event.target.closest('[data-copy]');
  if (!target) return;
  const ok = await copyText(target.dataset.copy);
  setStatus(ok ? 'copied' : 'copyUnavailable', { value: target.dataset.copy.toUpperCase() });
});

function renderEmptyPalette() {
  refs.paletteGrid.innerHTML = `<div class="empty-state">${t('emptyPalette')}</div>`;
}

function setLocale(locale) {
  if (!TRANSLATIONS[locale] || locale === currentLocale) return;
  currentLocale = locale;
  applyTranslations();
  if (currentResult) renderResult(currentResult);
  else {
    renderEmptyPalette();
    resetRoles();
  }
  setStatus('languageChanged');
}

function applyTranslations() {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  refs.languageButtons.forEach((button) => {
    const isActive = button.dataset.lang === currentLocale;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  document.querySelector('.language-switch')?.setAttribute('aria-label', t('language'));

  const statusKey = refs.status.dataset.statusKey;
  if (statusKey) refs.status.textContent = formatStatus(statusKey);
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

function t(path) {
  return path.split('.').reduce((value, key) => value?.[key], TRANSLATIONS[currentLocale]) ?? path;
}

function localeCode() {
  return currentLocale === 'it' ? 'it-IT' : 'en-US';
}

function mountIcons() {
  const icons = {
    camera: Camera,
    check: Check,
    copy: Copy,
    download: Download,
    image: Image,
    refresh: RefreshCcw,
    sparkles: Sparkles,
    upload: Upload,
    x: X,
  };

  document.querySelectorAll('[data-icon]').forEach((element) => {
    const Icon = icons[element.dataset.icon];
    if (!Icon || element.querySelector('svg')) return;
    element.insertAdjacentHTML('afterbegin', iconToSvg(Icon));
  });
}

function iconToSvg(icon) {
  const [, attributes, children] = icon;
  const merged = {
    ...attributes,
    width: 18,
    height: 18,
    'aria-hidden': 'true',
  };
  const attrs = Object.entries(merged)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ');
  const body = children
    .map(([tag, childAttrs]) => {
      const child = Object.entries(childAttrs)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(' ');
      return `<${tag} ${child}></${tag}>`;
    })
    .join('');

  return `<svg ${attrs}>${body}</svg>`;
}
