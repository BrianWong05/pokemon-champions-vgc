// src/features/scan/classifier.test.ts
import { describe, it, expect } from 'vitest';
import { softmax, resizeBilinearRgb, topCandidates } from './classifier';
import type { RgbaImage } from './types';

describe('softmax', () => {
  it('sums to 1', () => {
    const out = softmax([1, 2, 3, 4]);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('is monotonic with the input logits', () => {
    const out = softmax([1, 2, 3, 4]);
    for (let i = 1; i < out.length; i++) expect(out[i]).toBeGreaterThan(out[i - 1]);
  });

  it('handles a uniform input as a uniform distribution', () => {
    const out = softmax([5, 5, 5]);
    out.forEach((p) => expect(p).toBeCloseTo(1 / 3, 6));
  });
});

describe('resizeBilinearRgb', () => {
  function solid(r: number, g: number, b: number, w = 10, h = 10): RgbaImage {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255;
    }
    return { data, width: w, height: h };
  }

  it('returns CHW floats of length 3*size*size', () => {
    const out = resizeBilinearRgb(solid(10, 20, 30), 224);
    expect(out.length).toBe(3 * 224 * 224);
  });

  it('produces values in 0..1', () => {
    const out = resizeBilinearRgb(solid(0, 128, 255), 224);
    out.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('gives a uniform channel for a solid-color image', () => {
    const size = 16;
    const out = resizeBilinearRgb(solid(10, 20, 30), size);
    const plane = size * size;
    const rExpected = 10 / 255, gExpected = 20 / 255, bExpected = 30 / 255;
    for (let i = 0; i < plane; i++) {
      expect(out[i]).toBeCloseTo(rExpected, 5);
      expect(out[plane + i]).toBeCloseTo(gExpected, 5);
      expect(out[2 * plane + i]).toBeCloseTo(bExpected, 5);
    }
  });
});

describe('topCandidates', () => {
  it('masks non-legal ids by zeroing their probability', () => {
    const probs = [0.1, 0.7, 0.2];
    const classes = [1, 2, 3];
    const legalIds = new Set([1, 3]);
    const out = topCandidates(probs, classes, legalIds, 3);
    // id 2 has the highest raw prob but is illegal, so it should rank last with score 0
    expect(out.find((c) => c.id === 2)?.score).toBe(0);
  });

  it('orders results by probability descending', () => {
    const probs = [0.1, 0.5, 0.4];
    const classes = [1, 2, 3];
    const legalIds = new Set([1, 2, 3]);
    const out = topCandidates(probs, classes, legalIds, 3);
    expect(out.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it('respects topN', () => {
    const probs = [0.1, 0.5, 0.4, 0.05];
    const classes = [1, 2, 3, 4];
    const legalIds = new Set([1, 2, 3, 4]);
    const out = topCandidates(probs, classes, legalIds, 2);
    expect(out.length).toBe(2);
    expect(out.map((c) => c.id)).toEqual([2, 3]);
  });
});
