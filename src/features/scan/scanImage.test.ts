// src/features/scan/scanImage.test.ts
import { describe, it, expect } from 'vitest';
import { scanTeamImage } from './scanImage';
import { computeDescriptor } from './fingerprint';
import { cropImage } from './segmentation';
import type { RgbaImage, ReferenceEntry } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

describe('scanTeamImage', () => {
  it('returns one slot per detected tile with ranked candidates', () => {
    const img = blank(400, 600);
    // 6 red tiles, each with a distinct colored inner square (the "sprite")
    const inner = [[0,0,255],[0,255,0],[255,255,0],[255,0,255],[0,255,255],[255,128,0]];
    for (let k = 0; k < 6; k++) {
      fillRect(img, 300, 20 + k * 95, 80, 70, 220, 30, 40);
      fillRect(img, 320, 30 + k * 95, 40, 40, inner[k][0], inner[k][1], inner[k][2]);
    }
    // Build a reference set by fingerprinting each tile's own crop -> ids 101..106
    const refs: ReferenceEntry[] = [];
    for (let k = 0; k < 6; k++) {
      const crop = cropImage(img, { x: 300, y: 20 + k * 95, w: 80, h: 70 });
      refs.push({ id: 101 + k, desc: computeDescriptor(crop) });
    }
    const slots = scanTeamImage(img, refs, 3);
    expect(slots.length).toBe(6);
    // each slot's top candidate should be its own reference id
    slots.forEach((s, k) => expect(s.candidates[0].id).toBe(101 + k));
  });
});
