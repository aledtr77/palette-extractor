# Palette Extractor

[![lint · tests · build](https://img.shields.io/github/actions/workflow/status/aledtr77/palette-extractor/ci.yml?branch=main&label=lint%20%C2%B7%20tests%20%C2%B7%20build)](https://github.com/aledtr77/palette-extractor/actions/workflows/ci.yml)
[![128 tests](https://img.shields.io/badge/tests-128%20(Vitest)-3fb950)](tests/)
[![licence: MIT](https://img.shields.io/badge/licence-MIT-0969da)](LICENSE)

Pulls a colour palette out of an image and turns it into something usable: UI roles,
contrast ratios, CSS custom properties and JSON.

It runs entirely in the browser. The image is read locally and never uploaded — there
is no server and no request to send it anywhere.

**Use it: [palette-extractor-7hm.pages.dev](https://palette-extractor-7hm.pages.dev/)** — the
working tool, not a preview of one, built from this repo, from this branch.

[![The tool after running its built-in demo: eight dominant colours with share, hex, rgb, hsl and contrast ratio, the UI roles derived from them, and the CSS export](public/preview.jpg)](https://palette-extractor-7hm.pages.dev/)

That is the built-in **Demo** button, not a staged screenshot — clone this repo, run it
and press the button to get the same thing. Two commands, no key, no account, nothing to
configure.

codedge.it ships this tool as one of its four as well, built into the site. This is the
tool on its own: no site around it, one concern per file, nothing to unpick before you
can read it or drop it into something else.

## What it does

- Extracts a palette from any image you give it
- Assigns the colours to UI roles instead of returning a flat list of swatches
- Computes WCAG contrast ratios, and says which grade each one clears — AAA, AA,
  AA Large or Fail — because a bare ratio is data and a grade is an answer
- Picks a readable text colour for every swatch and for the background it chose
- Exports the result as CSS custom properties or as JSON

## How it works

One concern per file, so you can open the part you came for and stop there:

| File | What it holds |
| --- | --- |
| [`src/color.js`](src/color.js) | sRGB → HSL and sRGB → Lab, relative luminance, WCAG contrast ratio and the grade it clears, perceptual distance in Lab |
| [`src/extractor.js`](src/extractor.js) | Sampling, clustering, and the pass that assigns colours to UI roles |
| [`src/camera.js`](src/camera.js) | The `getUserMedia` lifecycle and the frame grab — knows nothing about the interface |
| [`src/export.js`](src/export.js) | Clipboard and file download, with the fallback for when the Clipboard API is refused |
| [`src/render.js`](src/render.js) | Markup for the swatches, the roles and the contrast card |
| [`src/strings.js`](src/strings.js) | The strings JavaScript produces at runtime — status messages, role labels, accessible names |
| [`src/icons.js`](src/icons.js) | Lucide icon data → inline `<svg>`, so no icon font is fetched |
| [`src/demo.js`](src/demo.js) | The image behind the Demo button, built as an SVG here so pressing it costs no network request |
| [`src/template.js`](src/template.js) | The interface, as one markup string — the text in it is the final text, not a placeholder JavaScript swaps out |
| [`src/main.js`](src/main.js) | Wiring only: element references, the four pieces of state, the listeners |

Start with `color.js` and `extractor.js` if you came for the colour work — they are
where the actual thinking is, and neither imports anything from the app around it.

Vanilla JavaScript and Vite, no framework. The only runtime dependency is
[`lucide`](https://lucide.dev) for the icons.

## Tests

47 tests over the part that runs without a DOM: the sRGB → HSL and sRGB → Lab
conversions, relative luminance and the WCAG ratio, the threshold that decides two
colours are the same one, the role assignment, and the CSS and JSON that come out the
other end. They check values that can be worked out by hand or come from the WCAG
definition — not what the code happens to return today, which is a test that cannot
fail for a good reason.

The one that earns its place: `readableTextColor` is swept across the whole RGB cube
and every result has to clear AA. Two colours cannot cover every background — around
L\*50 white and black are equally far away — and that sweep is what found the gap.

`wcagLevel` is checked on each boundary and just under it. "Greater than or equal" is
the whole of the difference between a ratio that passes and one that does not, and
4.49:1 is exactly the value a rounded display would show as `4.5:1`.

Extraction from a real image, the camera and the clipboard need a browser, so they are
checked in one. Lint, tests and build all run on every push.

```bash
npm test         # 47 tests (Vitest)
npm run lint     # ESLint
```

## Run it locally

Node 20.19 or newer (22.12+ on the 22 line) — what Vite 8 asks for.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
npm run preview  # serve the build
```

## Deploying it

The build is a directory of static files with no server side, so it belongs on a
static host. It runs on [Cloudflare Pages](https://pages.cloudflare.com/):

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22` (`NODE_VERSION` environment variable) |

Two files in the published output are there for the host rather than for the browser:

- **`404.html`** answers any unknown URL. It carries its own styles and loads no
  script, because a 404 that depends on the build can break in the one situation it
  exists for.
- **`public/_headers`** sets the response headers — a Content-Security-Policy that
  leaves the page no way to send anything anywhere, `nosniff`, a `Permissions-Policy`
  that keeps the camera and drops the rest, and a one-year immutable cache on the
  hashed assets only. The CSP is the part of "the image never leaves your browser"
  that a visitor can check without reading the source.

Nothing here is Cloudflare-specific beyond `_headers`, which Netlify reads too and
other hosts ignore. `base` is `/` in [`vite.config.js`](vite.config.js), which is what
a site served from a domain root needs; a GitHub Pages *project* site lives under
`/repo/` and needs that set instead.

## Licence

**MIT** — see [LICENSE](LICENSE). The colour maths, the extraction logic, the markup,
the styles and the interface text are yours to take, change and ship, commercially or
otherwise.

The one thing that isn't yours is the **Codedge** name and logo, which no copyright
licence hands over anyway — [TRADEMARK.md](TRADEMARK.md) says so out loud. Fork it,
build on it, give it your own name.
