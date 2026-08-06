// The half of the contract this repo can enforce.
//
// color.test.js checks that the maths is *right*, against values worked out by
// hand or taken from the WCAG definition, and it says so at the top: a test that
// only records current output cannot fail for a good reason. This file is not
// that test and does not replace it. It answers a different question — whether
// this implementation still matches the copy inside aledtr77/codedge, published
// as the same tool at a different URL. For "are these two the same", recorded
// output is exactly the right instrument; it is only the wrong one for "is this
// correct".
//
// When one of these fails, the question to answer first is whether the number
// was supposed to change. If it was, regenerate the fixture — and copy it to
// the other repo in the same commit, or the two tools go on giving different
// answers under the same name.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as impl from '../src/color.js';
import { cases, closeEnough, TOLERANCE } from '../scripts/colour-contract.mjs';

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/colour-contract.json', import.meta.url)), 'utf8'),
);

describe('the colour contract shared with aledtr77/codedge', () => {
  it('has a fixture that still covers every case the generator produces', () => {
    // Names and arity only. The arguments of labDistance and hueDistance are
    // themselves computed by the implementation, so comparing them literally
    // would compare the last bit of a float across two engines — which is what
    // broke this check the first time it ran on CI.
    const shape = (list) => list.map(({ fn, args }) => `${fn}/${args.length}`);
    expect(shape(fixture.cases)).toEqual(shape(cases(impl)));
  });

  it.each(fixture.cases.map((c, i) => [i, c]))('case %i — %o', (_i, { fn, args, out }) => {
    expect(typeof impl[fn]).toBe('function');
    const actual = impl[fn](...args);
    // Not toEqual: see TOLERANCE in scripts/colour-contract.mjs. The message
    // carries both values, because a failure here has to say which way it moved.
    expect(
      closeEnough(actual, out),
      `${fn} returned ${JSON.stringify(actual)}, the contract says ${JSON.stringify(out)}`,
    ).toBe(true);
  });
});

describe('the tolerance the cases are compared with', () => {
  it('lets through the last-bit difference between two engines', () => {
    expect(closeEnough(0.006048833022857055, 0.006048833022857054)).toBe(true);
    expect(closeEnough(0.19412542326058316, 0.19412542326058319)).toBe(true);
  });

  it('lets it through inside an object as well, which is where Lab lives', () => {
    expect(closeEnough(
      { l: 5.463863025268843, a: -0.0000023551131461685415, b: 9.420452584674166e-7 },
      { l: 5.463863025268839, a: -0.0000023551131322907537, b: 9.420452529163015e-7 },
    )).toBe(true);
  });

  it('still catches a change to the maths', () => {
    // What 0.2126 -> 0.2127 in the luminance does to rgb(18,18,18): five orders
    // of magnitude above the noise the tolerance is there to absorb.
    expect(closeEnough(0.0060536, 0.006048833022857054)).toBe(false);
    expect(closeEnough(21, 20.999)).toBe(false);
  });

  it('does not quietly accept a different shape', () => {
    expect(closeEnough({ r: 1, g: 2 }, { r: 1, g: 2, b: 3 })).toBe(false);
    expect(closeEnough('#000000', '#000001')).toBe(false);
    expect(closeEnough(NaN, 1)).toBe(false);
  });

  it('is tight enough to be worth calling a contract', () => {
    expect(TOLERANCE).toBeLessThanOrEqual(1e-12);
  });
});
