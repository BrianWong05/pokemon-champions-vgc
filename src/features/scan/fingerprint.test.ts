// src/features/scan/fingerprint.test.ts
import { describe, it, expect } from 'vitest';
import { grayResize, dHash, hamming } from './fingerprint';
import type { RgbaImage } from './types';

// Solid-color 2x2 image helper
function solid(r: number, g: number, b: number, a = 255, w = 2, h = 2): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=a; }
  return { data, width: w, height: h };
}
// Left-half black, right-half white (horizontal gradient)
function leftDark(w = 9, h = 8): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = x < w / 2 ? 0 : 255, i = (y*w+x)*4;
    data[i]=v; data[i+1]=v; data[i+2]=v; data[i+3]=255;
  }
  return { data, width: w, height: h };
}

describe('grayResize', () => {
  it('returns w*h luminance samples', () => {
    const g = grayResize(solid(255, 0, 0), 4, 4);
    expect(g.length).toBe(16);
    expect(Math.round(g[0])).toBe(76); // 0.299*255
  });
});

describe('dHash / hamming', () => {
  it('produces a 16-hex-char hash', () => {
    expect(dHash(leftDark())).toMatch(/^[0-9a-f]{16}$/);
  });
  it('hamming of identical hashes is 0 and is symmetric', () => {
    const h = dHash(leftDark());
    expect(hamming(h, h)).toBe(0);
    expect(hamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hamming('00ff00ff00ff00ff', 'ffffffffffffffff')).toBe(hamming('ffffffffffffffff', '00ff00ff00ff00ff'));
  });
});
