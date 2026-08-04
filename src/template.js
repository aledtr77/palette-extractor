// The whole interface, as one string. The Italian text sitting in the markup is
// the first paint; i18n.translateStaticNodes() rewrites every [data-i18n] node
// straight after mount, and again on each language change.

// Shared by the markup below and by the reset, so the two cannot drift apart.
export const EMPTY_CSS_PREVIEW = ':root {\n  --color-1: ...\n}';

export const APP_MARKUP = `
  <main class="shell">
    <section class="hero">
      <div>
        <h1 class="hero-title">Codedge Palette Extractor</h1>
        <p class="hero-subtitle" data-i18n="title">Da foto a palette UI, con colori piu puliti e riutilizzabili.</p>
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
          <div class="empty-preview"></div>
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
          <div class="sr-only" id="status" role="status" aria-live="polite" data-status-key="ready">Pronto</div>
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
            <pre id="codePreview">${EMPTY_CSS_PREVIEW}</pre>
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
