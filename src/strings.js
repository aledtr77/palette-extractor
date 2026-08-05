// The strings JavaScript has to produce at runtime: status messages, the labels
// on markup that is rebuilt after every analysis, and the accessible names for
// elements created in code.
//
// Text that never changes is not here — it is written into template.js, where it
// is already correct at first paint and does not need JavaScript to become
// readable. This file is only for what cannot be static.

const STRINGS = {
  copy: 'Copy',
  image: 'Image',
  camera: 'Camera',
  themePreview: 'Theme preview',
  emptyPalette: 'Upload an image or start the demo.',
  contrastEmpty: 'Contrast controls will appear after analysis.',
  noColorsFound:
    'Nothing to extract here. The sampler skips pure white and pure black, and this image is made of little else.',

  roles: {
    background: 'Background',
    primary: 'Primary',
    accent: 'Accent',
    text: 'Text',
  },

  // The grades wcagLevel() returns, spelled out. "AA Large" is the one that
  // needs the qualifier: it passes for large text and for UI components, and
  // fails for body copy, so the label has to carry the condition with it.
  wcag: {
    aaa: 'AAA',
    aa: 'AA',
    aaLarge: 'AA Large',
    fail: 'Fail',
  },

  status: {
    ready: 'Ready',
    loadFirst: 'Upload a photo first',
    captureFirst: 'Capture a photo first',
    analyzing: 'Analyzing',
    paletteReady: 'Palette ready',
    noColors: 'No colours to extract from this image',
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
  },
};

// Falls back to the path itself rather than to undefined: a missing key shows up
// as "status.somethingWrong" in the interface, which is findable, instead of the
// word "undefined", which is not.
export function t(path) {
  return path.split('.').reduce((value, key) => value?.[key], STRINGS) ?? path;
}

// The status messages that report something the user has to act on, and the two
// that report a finished job. Everything not named here is a neutral progress
// note ("Analyzing", "Camera active") and gets no colour: if every message is
// highlighted, none of them is.
const PROBLEM_STATUS = new Set([
  'loadFirst',
  'captureFirst',
  'analysisError',
  'noColors',
  'unsupportedFormat',
  'imageTooLarge',
  'cameraUnavailable',
  'cameraNotFound',
  'cameraNotReady',
  'cameraDenied',
  'cameraBusy',
  'generateFirst',
  'copyUnavailable',
]);

const DONE_STATUS = new Set(['paletteReady', 'copied', 'downloaded']);

export function statusTone(key) {
  if (PROBLEM_STATUS.has(key)) return 'problem';
  if (DONE_STATUS.has(key)) return 'done';
  return 'neutral';
}
