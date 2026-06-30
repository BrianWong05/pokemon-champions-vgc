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

  it('merges fragmented selection panels into full opponent tile crops', () => {
    const img = blank(1200, 700);
    fillRect(img, 980, 40, 180, 35, 210, 45, 120); // opponent name banner
    fillRect(img, 980, 590, 180, 45, 210, 45, 120); // waiting button
    for (let k = 0; k < 6; k++) {
      const y = 80 + k * 82;
      fillRect(img, 960, y, 200, 72, 180, 18, 85);
      fillRect(img, 1010, y + 8, 70, 56, 10, 10, 10); // sprite cuts through panel mask
      fillRect(img, 1105, y + 10, 36, 36, 40, 160, 220); // type icon cuts through panel mask
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    boxes.forEach((box, index) => {
      expect(box.x).toBeLessThanOrEqual(960);
      expect(box.x + box.w).toBeGreaterThanOrEqual(1160);
      expect(box.y).toBeGreaterThanOrEqual(78 + index * 82);
      expect(box.y).toBeLessThanOrEqual(82 + index * 82);
      expect(box.h).toBeGreaterThanOrEqual(70);
    });
  });

  it('handles screenshots cropped to just the opponent column', () => {
    const img = blank(430, 1024);
    fillRect(img, 40, 25, 360, 60, 210, 45, 120); // opponent name banner
    for (let k = 0; k < 6; k++) {
      const y = 100 + k * 152;
      fillRect(img, 40, y, 360, 140, 165, 12, 78);
      fillRect(img, 145, y + 24, 90, 90, 10, 10, 10);
      fillRect(img, 300, y + 22, 70, 70, 30, 170, 220);
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    expect(boxes[0].y).toBeGreaterThanOrEqual(96);
    expect(boxes[5].y).toBeGreaterThanOrEqual(855);
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
