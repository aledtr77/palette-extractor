// The whole interface, as one string.
//
// The text here is the final text: English, written in, not swapped in by
// JavaScript afterwards. Everything the user reads that never changes lives in
// this file; what has to be produced at runtime comes from strings.js.

import {
  DEFAULT_PALETTE_SIZE,
  MAX_PALETTE_SIZE,
  MIN_PALETTE_SIZE,
} from './extractor.js';

// Shared by the markup below and by the reset, so the two cannot drift apart.
export const EMPTY_CSS_PREVIEW = ':root {\n  --color-1: ...\n}';

export const APP_MARKUP = `
  <main class="shell">
    <section class="hero">
      <div>
        <h1 class="hero-title">Codedge Palette Extractor</h1>
        <p class="hero-subtitle">From photo to UI palette, with cleaner and reusable colors.</p>
      </div>
      <div class="hero-actions">
        <button class="button secondary" id="demoBtn" type="button" data-icon="sparkles">
          <span>Demo</span>
        </button>
        <button class="button secondary" id="resetBtn" type="button" data-icon="refresh">
          <span>Reset</span>
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
          <span class="drop-title">Upload or drop a photo</span>
          <span class="drop-meta" id="dropMeta">Local browser analysis. No upload.</span>
        </label>

        <div class="source-actions">
          <button class="button secondary" id="cameraBtn" type="button" data-icon="camera">
            <span>Camera</span>
          </button>
        </div>

        <div class="preview-frame" id="previewFrame">
          <div class="empty-preview"></div>
        </div>

        <div class="camera-actions" id="cameraActions" hidden>
          <button class="button primary" id="captureBtn" type="button" data-icon="camera">
            <span>Capture</span>
          </button>
          <button class="button secondary" id="closeCameraBtn" type="button" data-icon="x">
            <span>Close</span>
          </button>
        </div>

        <div class="control-row">
          <label for="paletteSize">Colors</label>
          <output id="paletteSizeValue" for="paletteSize">${DEFAULT_PALETTE_SIZE}</output>
        </div>
        <input
          class="range"
          id="paletteSize"
          type="range"
          min="${MIN_PALETTE_SIZE}"
          max="${MAX_PALETTE_SIZE}"
          value="${DEFAULT_PALETTE_SIZE}"
        />

        <button class="button primary analyze-button" id="analyzeBtn" type="button" data-icon="sparkles">
          <span>Extract palette</span>
        </button>

        <div class="metrics">
          <div>
            <span>Image</span>
            <strong id="imageSize">-</strong>
          </div>
          <div>
            <span>Average</span>
            <strong id="averageColor">-</strong>
          </div>
          <div>
            <span>Pixels read</span>
            <strong id="pixelCount">-</strong>
          </div>
        </div>
      </aside>

      <section class="results">
        <div class="section-head">
          <div>
            <h2>Dominant palette</h2>
            <p>Sorted by perceptual relevance, not only by raw pixel count.</p>
          </div>
          <!-- Visible as well as announced. Every message the app produces
               arrives here — "Image is too large", "Camera permission denied",
               "CSS copied" — and a message a sighted user cannot see is the
               same as no message at all: the app just appears not to react. -->
          <div class="status" id="status" role="status" aria-live="polite" data-status-key="ready" data-status-tone="neutral">Ready</div>
        </div>

        <div class="palette-grid" id="paletteGrid">
          <div class="empty-state">Upload an image or start the demo.</div>
        </div>

        <div class="detail-grid">
          <section class="panel roles-panel">
            <div class="section-head compact">
              <div>
                <h2>UI roles</h2>
                <p>Colors ready for theme, text and CTAs.</p>
              </div>
            </div>
            <div class="roles-list" id="rolesList"></div>
            <div class="contrast-card" id="contrastCard"></div>
          </section>

          <section class="panel export-panel">
            <div class="section-head compact">
              <div>
                <h2>Export</h2>
                <p>CSS variables and JSON generated from the current palette.</p>
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
            <pre id="codePreview">${EMPTY_CSS_PREVIEW}</pre>
          </section>
        </div>
      </section>
    </section>

    <footer class="site-footer">
      <div class="footer-brand">
        <span>Built by</span>
        <a href="https://codedge.it" target="_blank" rel="noopener noreferrer">codedge.it</a>
      </div>
      <div class="footer-meta">
        <p>Palette extractor for interfaces, brands and digital products.</p>
        <nav class="footer-links" aria-label="Policies">
          <a href="https://codedge.it/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="https://codedge.it/cookie-policy/" target="_blank" rel="noopener noreferrer">Cookie Policy</a>
        </nav>
      </div>
    </footer>
  </main>
`;
