// The half of the contract this repo can enforce.
//
// color.test.js checks that the maths is *right*, against values worked out by
// hand or taken from the WCAG definition, and it says so at the top: a test that
// only records current output cannot fail for a good reason. This file is not
// that test and does not replace it. It answers a different question — whether
// this implementation still matches the copy inside aledtr77/codedge, which is
// published as the same tool at a different URL. For "are these two the same",
// recorded output is exactly the right instrument; it is only the wrong one for
// "is this correct".
//
// See scripts/colour-contract.mjs for the rest. When one of these fails, decide
// first whether the number was supposed to change. If it was, regenerate the
// fixture and copy it to the other repo in the same commit, or the two tools go
// on giving different answers under one name.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as impl from '../src/color.js';
import { cases } from '../scripts/colour-contract.mjs';

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/colour-contract.json', import.meta.url)), 'utf8'),
);

describe('the colour contract shared with aledtr77/codedge', () => {
  it('has a fixture that still covers every case the generator produces', () => {
    // A case added to the generator and never written to the fixture would be
    // silently untested, which is the failure mode this whole file is about.
    const generated = cases(impl).map(({ fn, args }) => `${fn}(${JSON.stringify(args)})`);
    const recorded = fixture.cases.map(({ fn, args }) => `${fn}(${JSON.stringify(args)})`);
    expect(recorded).toEqual(generated);
  });

  it.each(fixture.cases.map((c, i) => [i, c]))('case %i — %o', (_i, { fn, args, out }) => {
    expect(typeof impl[fn]).toBe('function');
    expect(impl[fn](...args)).toEqual(out);
  });
});
