// src/features/scan/segmentation.test.ts
import { describe, it, expect } from 'vitest';
import {
  isRedPixel,
  connectedComponents,
  detectOpponentTiles,
  detectPlayerTiles,
  detectOpponentSpriteBoxes,
  detectPlayerSpriteBoxes,
  cropImage,
} from './segmentation';
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

  it('prefers the narrower right opponent column over wider left player panels', () => {
    const img = blank(1254, 700);
    for (let k = 0; k < 6; k++) {
      const y = 110 + k * 80;
      fillRect(img, 60, y, 410, 60, 118, 62, 205); // player panels on the left
      fillRect(img, 1005, y, 190, 58, 175, 12, 82); // opponent panels on the right
      fillRect(img, 1125, y + 8, 48, 36, 60, 170, 220); // type icons
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    boxes.forEach((box) => {
      expect(box.x).toBeGreaterThan(950);
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
      fillRect(img, 372, y + 22, 40, 70, 180, 50, 210); // right-side type icon strip
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    boxes.forEach((box) => {
      expect(box.x).toBeLessThan(80);
      expect(box.w).toBeGreaterThan(320);
    });
    expect(boxes[0].y).toBeGreaterThanOrEqual(96);
    expect(boxes[5].y).toBeGreaterThanOrEqual(855);
  });

  it('does not treat lower-right battle move buttons as opponent selection tiles', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 4; k++) {
      fillRect(img, 870, 360 + k * 80, 300, 55, 120, 24, 190);
      fillRect(img, 1080, 368 + k * 80, 72, 40, 35, 20, 55);
    }

    expect(detectOpponentTiles(img)).toEqual([]);
  });

  it('detects opponent tiles inside a larger browser screenshot', () => {
    const img = blank(3200, 2100);
    fillRect(img, 0, 0, 3200, 260, 16, 16, 16); // browser chrome
    fillRect(img, 2360, 490, 360, 70, 210, 45, 120); // opponent name banner
    for (let k = 0; k < 6; k++) {
      const y = 565 + k * 160;
      fillRect(img, 2380, y, 260, 145, 165, 12, 78);
      fillRect(img, 2455, y + 26, 95, 92, 20, 20, 20);
      fillRect(img, 2660, y + 24, 70, 70, 180, 50, 210);
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    expect(boxes[0].x).toBeLessThanOrEqual(2380);
    expect(boxes[0].x + boxes[0].w).toBeGreaterThanOrEqual(2635);
    expect(boxes[0].y).toBeGreaterThanOrEqual(560);
    expect(boxes[5].y).toBeGreaterThanOrEqual(1360);
  });
});

describe('detectPlayerTiles', () => {
  it('detects 6 purple tiles stacked on the left side', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    const boxes = detectPlayerTiles(img);
    expect(boxes.length).toBe(6);
    for (let k = 1; k < boxes.length; k++) expect(boxes[k].y).toBeGreaterThan(boxes[k - 1].y);
  });

  it('ignores red opponent tiles on the right', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    expect(detectPlayerTiles(img).length).toBe(0);
  });
});

describe('sprite box helpers', () => {
  it('opponent sprite boxes are square and left-anchored on the tile', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    const boxes = detectOpponentSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    for (const b of boxes) expect(Math.abs(b.w - b.h)).toBeLessThanOrEqual(1);
  });

  it('player sprite boxes are square and right-anchored on the tile', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    const boxes = detectPlayerSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    // right-anchored: box right edge near the tile right edge (x=300)
    for (const b of boxes) expect(b.x + b.w).toBeGreaterThan(280);
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
