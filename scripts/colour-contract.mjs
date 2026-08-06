// The colour maths, pinned to numbers, so two copies of it cannot drift apart
// in silence.
//
// The palette extractor exists twice on purpose: once here, on its own and in
// English, and once inside aledtr77/codedge, built into the site and bilingual.
// Keeping them separate is a decision, not an accident — but the decision came
// with a hole. The ten functions below are the same maths in both,
// and nothing stopped one of them being corrected while the other went on
// shipping the old answer to a different URL under the same name. Nobody would
// have noticed until a reader compared two contrast ratios.
//
// So both repos hold this same fixture and assert their own implementation
// against it. That does not prove the two agree — only a job that fetches both
// could do that — but it removes the silence: change the maths on either side
// and that side's tests go red, naming the other repo in the failure.
//
//   node scripts/colour-contract.mjs            regenerate the fixture
//   node scripts/colour-contract.mjs <file.js>  regenerate from another copy
//
// Regenerating is a deliberate act: it means the numbers moved, and the fixture
// has to be copied to the other repo in the same breath.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_IMPL = '../src/color.js';
const FIXTURE = fileURLToPath(new URL('../tests/fixtures/colour-contract.json', import.meta.url));

// Black and white for the ends, a mid grey for the middle, the near-black the
// site actually uses, and four saturated colours far enough apart in hue that a
// change to the Lab conversion cannot hide in any of them.
export const COLOURS = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 127, g: 127, b: 127 },
  { r: 18, g: 18, b: 18 },
  { r: 233, g: 84, b: 32 },
  { r: 41, g: 128, b: 185 },
  { r: 46, g: 204, b: 113 },
  { r: 241, g: 196, b: 15 },
];

const WHITE = { r: 255, g: 255, b: 255 };
const REFERENCE = { r: 200, g: 100, b: 50 };

/**
 * Every case is a function name and the arguments to call it with, so a fixture
 * entry is readable on its own and a failing one says exactly which call moved.
 */
export function cases(impl) {
  const list = [];
  const add = (fn, args) => list.push({ fn, args });

  for (const colour of COLOURS) {
    add('relativeLuminance', [colour]);
    add('rgbToLab', [colour]);
    add('readableTextColor', [colour]);
    add('rgbToHex', [colour]);
    add('rgbToHsl', [colour.r, colour.g, colour.b]);
    add('contrastRatio', [colour, WHITE]);
    add('contrastRatio', [colour, { r: 18, g: 18, b: 18 }]);
    add('labDistance', [impl.rgbToLab(colour), impl.rgbToLab(REFERENCE)]);
    add('hueDistance', [impl.rgbToHsl(colour.r, colour.g, colour.b).h, 120]);
  }

  // The two that take plain numbers, including the out-of-range inputs that
  // decide whether clamping happens at all.
  for (const args of [[5, 0, 10], [-3, 0, 10], [15, 0, 10], [0.5, 0, 1]]) add('clamp', args);
  for (const value of [0, 5, 16, 255]) add('toHex', [value]);

  return list;
}

export function runCases(impl) {
  return cases(impl).map(({ fn, args }) => {
    if (typeof impl[fn] !== 'function') throw new Error(`the implementation does not export ${fn}`);
    return { fn, args, out: impl[fn](...args) };
  });
}

// Exact equality was the first attempt and it was wrong: Math.pow does not
// return the same last bit on every V8, so the fixture generated on Node 24
// failed on the runner's Node 22 by one unit in the last place —
// 0.006048833022857055 against ...54. The contract is about the maths agreeing,
// not about which engine rounded last, so numbers are compared with room for
// that and nothing more.
//
// 1e-12 is four orders of magnitude above the noise and six below anything a
// real change produces: moving 0.2126 to 0.2127 in the luminance shifts the
// same value by 5e-6. The floor of 1 in the scale keeps the tolerance absolute
// near zero, where the Lab components live at 1e-7 and relative tolerance would
// collapse to nothing.
export const TOLERANCE = 1e-12;

export function closeEnough(actual, expected, tolerance = TOLERANCE) {
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Number.isNaN(expected) || Number.isNaN(actual)) return Number.isNaN(expected) && Number.isNaN(actual);
    return Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(actual), Math.abs(expected));
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false;
    return expected.every((value, i) => closeEnough(actual[i], value, tolerance));
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const keys = Object.keys(expected);
    if (keys.length !== Object.keys(actual).length) return false;
    return keys.every((key) => closeEnough(actual[key], expected[key], tolerance));
  }
  return Object.is(actual, expected);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`).href : DEFAULT_IMPL;
  const impl = await import(target);
  const fixture = {
    // Deliberately names neither repo as "this one": the file has to be
    // byte-identical on both sides, or comparing them stops being possible.
    _contract: 'The shared colour maths of the palette extractor, which exists in two ' +
      'independent repos: aledtr77/codedge and aledtr77/palette-extractor. Both hold ' +
      'this file, byte for byte, and test their own implementation against it. If you ' +
      'regenerate it because the numbers legitimately changed, copy it to the other ' +
      'repo in the same commit — otherwise the two tools go on answering differently ' +
      'under the same name.',
    _regenerate: 'node scripts/colour-contract.mjs',
    cases: runCases(impl),
  };
  writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`Wrote ${fixture.cases.length} cases to tests/fixtures/colour-contract.json`);
  console.log('If the numbers moved, copy this file to the other repo too.');
}
