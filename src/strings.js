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
  },
};

// Falls back to the path itself rather than to undefined: a missing key shows up
// as "status.somethingWrong" in the interface, which is findable, instead of the
// word "undefined", which is not.
export function t(path) {
  return path.split('.').reduce((value, key) => value?.[key], STRINGS) ?? path;
}
