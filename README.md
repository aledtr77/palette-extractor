# Palette Extractor

Pulls a colour palette out of an image and turns it into something usable: UI roles,
contrast ratios, CSS custom properties and JSON.

It runs entirely in the browser. The image is read locally and never uploaded — there
is no server and no request to send it anywhere.

**Live: [codedge.it/tools/palette-extractor](https://codedge.it/tools/palette-extractor/)**

## What it does

- Extracts a palette from any image you give it
- Assigns the colours to UI roles instead of returning a flat list of swatches
- Computes WCAG contrast ratios and picks a readable text colour for each one
- Exports the result as CSS custom properties or as JSON

## How it works

The colour maths lives in [`src/color.js`](src/color.js): sRGB → HSL and sRGB → Lab
conversions, relative luminance, WCAG contrast ratio, and perceptual distance in Lab
used to tell colours apart. Extraction and clustering are in
[`src/extractor.js`](src/extractor.js).

Vanilla JavaScript and Vite, no framework. The only runtime dependency is
[`lucide`](https://lucide.dev) for the icons.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

## Licence

MIT — see [LICENSE](LICENSE). The code is yours to use; the "Codedge" name and logo
are not part of the grant.
