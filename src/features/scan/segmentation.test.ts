// src/features/scan/segmentation.test.ts
import { describe, it, expect } from 'vitest';
import { isRedPixel, connectedComponents, detectOpponentTiles, cropImage } from './segmentation';
import type { RgbaImage } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

describe('isRedPixel', () => {
  it('accepts saturated red, rejects blue and gray', () => {
    expect(isRedPixel(220, 30, 40)).toBe(true);
    expect(isRedPixel(30, 40, 220)).toBe(false);
    expect(isRedPixel(120, 120, 120)).toBe(false);
  });
});

describe('connectedComponents', () => {
  it('finds two separate blobs', () => {
    const w = 20, h = 10, mask = new Uint8Array(w * h);
    mask[0] = 1; mask[1] = 1; mask[w] = 1;        // blob A near origin
    mask[15] = 1; mask[16] = 1;                    // blob B
    const boxes = connectedComponents(mask, w, h, 1);
    expect(boxes.length).toBe(2);
  });
});

describe('detectOpponentTiles', () => {
  it('detects 6 red tiles stacked on the right side', () => {
    const img = blank(400, 600);
    for (let k = 0; k < 6; k++) fillRect(img, 300, 20 + k * 95, 80, 70, 220, 30, 40);
    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    // returned top-to-bottom
    for (let k = 1; k < boxes.length; k++) expect(boxes[k].y).toBeGreaterThan(boxes[k - 1].y);
  });
});

describe('cropImage', () => {
  it('extracts the requested sub-rectangle', () => {
    const img = blank(10, 10);
    fillRect(img, 2, 3, 4, 4, 1, 2, 3);
    const c = cropImage(img, { x: 2, y: 3, w: 4, h: 4 });
    expect(c.width).toBe(4); expect(c.height).toBe(4);
    expect([c.data[0], c.data[1], c.data[2]]).toEqual([1, 2, 3]);
  });
});
