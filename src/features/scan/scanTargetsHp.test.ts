import { describe, expect, it, vi } from 'vitest';
import type { RgbaImage } from './types';

vi.mock('./hpText', () => ({
  readHpFromPanel: () => ({ percent: 63 }),
}));

import { detectScanTargets } from './scanTargets';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
}

describe('detectScanTargets HP wiring', () => {
  it('attaches read HP percent to battle targets', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    fillRect(img, 40, 600, 160, 40, 80, 60, 190);
    fillRect(img, 300, 600, 160, 40, 80, 60, 190);

    const { mode, targets } = detectScanTargets(img);

    expect(mode).toBe('battle');
    expect(targets).toHaveLength(4);
    expect(targets.every((target) => target.hpPercent === 63)).toBe(true);
  });
});
