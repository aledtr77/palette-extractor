// Two environments, and the split is the point: everything under src/ is a
// module the page loads, so it gets the browser globals and nothing else — a
// stray `process` or `require` in there is a bug that would only surface at
// runtime. The tests and the build config run in Node and never reach a browser.

import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: js.configs.recommended.rules,
  },
  {
    files: ['tests/**/*.js', '*.config.js', '*.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
];
