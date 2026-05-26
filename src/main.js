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

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">Codedge Palette Extractor</p>
        <h1>Da foto a palette UI, con colori piu puliti e riutilizzabili.</h1>
      </div>
      <div class="hero-actions">
        <button class="button secondary" id="demoBtn" type="button" data-icon="sparkles">Demo</button>
        <button class="button secondary" id="resetBtn" type="button" data-icon="refresh">Reset</button>
      </div>
    </section>

    <section class="workspace">
      <aside class="input-panel">
        <label class="dropzone" id="dropzone" for="fileInput">
          <input id="fileInput" type="file" accept="image/*" />
          <span class="drop-icon" data-icon="upload"></span>
          <span class="drop-title">Carica o trascina una foto</span>
          <span class="drop-meta">Analisi locale nel browser. Nessun upload.</span>
        </label>

        <div class="source-actions">
          <button class="button secondary" id="cameraBtn" type="button" data-icon="camera">
            Fotocamera
          </button>
        </div>

        <div class="preview-frame" id="previewFrame">
          <div class="empty-preview" data-icon="image"></div>
        </div>

        <div class="camera-actions" id="cameraActions" hidden>
          <button class="button primary" id="captureBtn" type="button" data-icon="camera">Scatta</button>
          <button class="button secondary" id="closeCameraBtn" type="button" data-icon="x">Chiudi</button>
        </div>

        <div class="control-row">
          <label for="paletteSize">Colori</label>
          <output id="paletteSizeValue">8</output>
        </div>
        <input class="range" id="paletteSize" type="range" min="4" max="10" value="8" />

        <button class="button primary analyze-button" id="analyzeBtn" type="button" data-icon="sparkles">
          Estrai palette
        </button>

        <div class="metrics">
          <div>
            <span>Immagine</span>
            <strong id="imageSize">-</strong>
          </div>
          <div>
            <span>Media</span>
            <strong id="averageColor">-</strong>
          </div>
          <div>
            <span>Pixel letti</span>
            <strong id="pixelCount">-</strong>
          </div>
        </div>
      </aside>

      <section class="results">
        <div class="section-head">
          <div>
            <h2>Palette dominante</h2>
            <p>Ordinata per rilevanza percettiva, non solo per numero grezzo di pixel.</p>
          </div>
          <div class="status" id="status">Pronto</div>
        </div>

        <div class="palette-grid" id="paletteGrid">
          <div class="empty-state">Carica un'immagine o avvia la demo.</div>
        </div>

        <div class="detail-grid">
          <section class="panel roles-panel">
            <div class="section-head compact">
              <div>
                <h2>Ruoli UI</h2>
                <p>Colori pronti per tema, testi e CTA.</p>
              </div>
            </div>
            <div class="roles-list" id="rolesList"></div>
            <div class="contrast-card" id="contrastCard"></div>
          </section>

          <section class="panel export-panel">
            <div class="section-head compact">
              <div>
                <h2>Export</h2>
                <p>CSS variables e JSON generati dalla palette corrente.</p>
              </div>
            </div>
            <div class="export-actions">
              <button class="button secondary" id="copyCssBtn" type="button" data-icon="copy">CSS</button>
              <button class="button secondary" id="copyJsonBtn" type="button" data-icon="copy">JSON</button>
              <button class="button secondary" id="downloadCssBtn" type="button" data-icon="download">.css</button>
              <button class="button secondary" id="downloadJsonBtn" type="button" data-icon="download">.json</button>
            </div>
            <pre id="codePreview">:root {
  --color-1: ...
}</pre>
          </section>
        </div>
      </section>
    </section>
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
};

let currentSource = null;
let currentResult = null;
let cameraStream = null;

mountIcons();
resetRoles();

refs.paletteSize.addEventListener('input', () => {
  refs.paletteSizeValue.value = refs.paletteSize.value;
});

refs.fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  stopCamera();
  await setSource(await readFile(file));
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
  if (!file || !file.type.startsWith('image/')) return;
  stopCamera();
  await setSource(await readFile(file));
});

refs.cameraBtn.addEventListener('click', startCamera);
refs.captureBtn.addEventListener('click', captureFromCamera);
refs.closeCameraBtn.addEventListener('click', () => {
  stopCamera();
  if (!currentSource) renderEmptyPreview();
  setStatus('Fotocamera chiusa');
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

async function runAnalysis() {
  if (!currentSource) {
    setStatus(cameraStream ? 'Scatta prima una foto' : 'Carica prima una foto');
    return;
  }

  refs.analyzeBtn.disabled = true;
  setStatus('Analisi in corso');

  try {
    currentResult = await analyzeImage(currentSource, {
      paletteSize: Number(refs.paletteSize.value),
    });
    renderResult(currentResult);
    setStatus('Palette pronta');
  } catch (error) {
    console.error(error);
    setStatus('Errore analisi');
  } finally {
    refs.analyzeBtn.disabled = false;
  }
}

function renderResult(result) {
  refs.imageSize.textContent = `${result.meta.naturalWidth} x ${result.meta.naturalHeight}px`;
  refs.pixelCount.textContent = result.meta.pixelCount.toLocaleString('it-IT');
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
        aria-label="Copia ${color.hex}"
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
    ['Background', roles.background],
    ['Primary', roles.primary],
    ['Accent', roles.accent],
    ['Text', roles.text],
  ]
    .map(([label, color]) => {
      const hex = color.hex.toUpperCase();
      return `
        <button class="role-item" type="button" data-copy="${color.hex}">
          <span class="role-dot" style="background:${color.hex}"></span>
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
      <span>Anteprima tema</span>
      <strong>Primary ${primaryRatio.toFixed(1)}:1</strong>
      <button style="background:${roles.primary.hex};color:${readableTextColor(roles.primary).hex}">
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

async function setSource(source) {
  stopCamera();
  currentSource = source;
  refs.previewFrame.innerHTML = `<img src="${source}" alt="Anteprima immagine caricata" />`;
  setStatus('Immagine caricata');
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Fotocamera non disponibile');
    return;
  }

  stopCamera();
  refs.cameraBtn.disabled = true;
  setStatus('Apro la fotocamera');

  try {
    const hasCamera = await hasVideoInput();
    if (hasCamera === false) {
      setStatus('Fotocamera non rilevata');
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
    refs.previewFrame.innerHTML = `
      <video class="camera-preview" id="cameraPreview" autoplay muted playsinline></video>
    `;
    const video = document.querySelector('#cameraPreview');
    video.srcObject = cameraStream;
    await video.play();
    refs.cameraActions.hidden = false;
    setStatus('Fotocamera attiva');
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
    return 'Fotocamera non rilevata';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Permesso fotocamera negato';
  }

  if (error?.name === 'NotReadableError') {
    return 'Fotocamera gia in uso';
  }

  return 'Fotocamera non disponibile';
}

function captureFromCamera() {
  const video = document.querySelector('#cameraPreview');
  if (!video || !video.videoWidth || !video.videoHeight) {
    setStatus('Fotocamera non pronta');
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
  setStatus('Scatto pronto');
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  refs.cameraActions.hidden = true;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  currentSource = null;
  currentResult = null;
  refs.fileInput.value = '';
  renderEmptyPreview();
  refs.paletteGrid.innerHTML = '<div class="empty-state">Carica un\'immagine o avvia la demo.</div>';
  refs.imageSize.textContent = '-';
  refs.averageColor.textContent = '-';
  refs.averageColor.style.color = '';
  refs.pixelCount.textContent = '-';
  refs.codePreview.textContent = ':root {\\n  --color-1: ...\\n}';
  resetRoles();
  mountIcons();
  setStatus('Pronto');
}

function renderEmptyPreview() {
  refs.previewFrame.innerHTML = '<div class="empty-preview" data-icon="image"></div>';
  mountIcons();
}

function resetRoles() {
  refs.rolesList.innerHTML = `
    <div class="role-placeholder"></div>
    <div class="role-placeholder"></div>
    <div class="role-placeholder"></div>
    <div class="role-placeholder"></div>
  `;
  refs.contrastCard.innerHTML = '<div class="empty-state small">I controlli contrasto compariranno dopo l\'analisi.</div>';
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
    setStatus('Genera prima la palette');
    return;
  }

  const ok = await copyText(text);
  setStatus(ok ? `${type.toUpperCase()} copiato` : 'Copia non disponibile');
}

function downloadExport(filename, text) {
  if (!text) {
    setStatus('Genera prima la palette');
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
  setStatus(`${filename} scaricato`);
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
  const target = event.target.closest('[data-copy]');
  if (!target) return;
  const ok = await copyText(target.dataset.copy);
  setStatus(ok ? `${target.dataset.copy.toUpperCase()} copiato` : 'Copia non disponibile');
});

function setStatus(message) {
  refs.status.textContent = message;
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
