// Interface strings and the current locale. Everything the user reads comes from
// here: `t()` is the only way the rest of the app gets a piece of text.

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

const DEFAULT_LOCALE = 'it';

let currentLocale = DEFAULT_LOCALE;

export function getLocale() {
  return currentLocale;
}

// Returns whether the locale actually changed, so the caller knows if there is
// anything to repaint.
export function setLocale(locale) {
  if (!TRANSLATIONS[locale] || locale === currentLocale) return false;
  currentLocale = locale;
  return true;
}

export function t(path) {
  return path.split('.').reduce((value, key) => value?.[key], TRANSLATIONS[currentLocale]) ?? path;
}

export function localeCode() {
  return currentLocale === 'it' ? 'it-IT' : 'en-US';
}

// Repaints every node carrying a data-i18n key. Markup rendered from JavaScript
// is not covered — that is rebuilt by whoever rendered it.
export function translateStaticNodes() {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
}
