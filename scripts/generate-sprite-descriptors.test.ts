// scripts/generate-sprite-descriptors.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { generateDescriptors } from './generate-sprite-descriptors';

describe('generateDescriptors', () => {
  it('produces a 4-channel descriptor per numeric-id PNG', () => {
    const out = generateDescriptors(path.resolve('scripts/__fixtures__/menu-sprites'));
    expect(Object.keys(out).sort()).toEqual(['25', '6']);
    expect(out['25'].dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(out['25'].rgb16.length).toBe(768);
    expect(out['25'].sil8.length).toBe(64);
    expect(out['25'].edge8.length).toBe(64);
  });
});
