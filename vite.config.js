import { resolve } from 'path';
import { defineConfig } from 'vite';

// `import.meta.dirname` rather than `__dirname`: this file is ESM, and Vite 8
// warns on every build that its next config loader will not shim the CommonJS
// globals. Needs Node 20.11+, which is below the floor Vite 8 already sets.
const here = import.meta.dirname;

// Until now this repo had no Vite config at all and ran on the defaults. They
// happened to be right, which is not the same as being chosen: the defaults are
// free to change between major versions, and anyone reading the repo had no way
// to tell which parts of the build were decisions and which were accidents.

export default defineConfig({
  root: '.',

  // Emitted asset URLs are absolute ("/assets/..."), which is what a site served
  // from a domain root wants — Cloudflare Pages, Netlify, Vercel or a custom
  // domain. Serving from a subpath instead (a GitHub Pages *project* site,
  // https://user.github.io/repo/) needs this set to '/repo/', otherwise every
  // stylesheet and script 404s.
  base: '/',

  build: {
    outDir: 'dist',

    // Never inline an asset as a base64 data URI. Inlined bytes are re-sent with
    // the document on every visit; a hashed file next to it is fetched once and
    // then cached until it changes.
    assetsInlineLimit: 0,

    rollupOptions: {
      input: {
        // 404.html has to be named here or it never reaches dist/: Vite only
        // walks the entries it is given, and the host looks for that file at
        // the root of what gets published.
        main: resolve(here, 'index.html'),
        notFound: resolve(here, '404.html'),
      },
    },
  },

  server: {
    port: 5173,
  },

  preview: {
    port: 4173,
  },
});
