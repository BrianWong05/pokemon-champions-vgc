// scripts/generate-sprite-descriptors.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { generateDescriptors } from './generate-sprite-descriptors';

describe('generateDescriptors', () => {
  it('produces a 4-channel descriptor per numeric-id PNG', () => {
    const out = generateDescriptors(path.resolve('scripts/__fixtures__/menu-sprites'));
    expect(Object.keys(out).sort()).toEqual(['25', '6']);
    expect(Array.isArray(out['25'])).toBe(true);
    expect(out['25'][0].dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(out['25'][0].rgb16.length).toBe(768);
    expect(out['25'][0].sil8.length).toBe(64);
    expect(out['25'][0].edge8.length).toBe(64);
  });

  it('groups multiple files under the same id (e.g. normal + shiny)', () => {
    const out = generateDescriptors(path.resolve('scripts/__fixtures__/menu-sprites'));
    expect(out['6'].length).toBe(2);
  });
});
