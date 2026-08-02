# Palette Extractor

Pulls a colour palette out of an image and turns it into something usable: UI roles,
contrast ratios, CSS custom properties and JSON.

It runs entirely in the browser. The image is read locally and never uploaded — there
is no server and no request to send it anywhere.

**Try it: [codedge.it/tools/palette-extractor](https://codedge.it/tools/palette-extractor/)**

[![The tool after running its built-in demo: eight dominant colours with share, hex, rgb, hsl and contrast ratio, the UI roles derived from them, and the CSS export](.github/preview.jpg)](https://codedge.it/tools/palette-extractor/)

That is the built-in **Demo** button, not a staged screenshot — clone this repo, run it
and press the button to get the same thing.

> **This repo is the standalone version, and the page above is not built from it.**
> codedge.it carries its own copy of the tool, wired into the site's build. Same tool
> and same interface, two separate codebases: this one is the one split into modules
> you can read on their own — the colour maths in `src/color.js`, the clustering in
> `src/extractor.js`, neither of them tangled up with the site around it.

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

Split, and the split matters — see [LICENSE](LICENSE).

**The code is MIT.** The colour maths, the extraction logic, the markup and the styles
are yours to take and build on.

**The Codedge name, logo and interface text are not.** Fork it, change it, ship it —
under your own name.
