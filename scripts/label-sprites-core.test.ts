import { describe, expect, it } from 'vitest';
import { detectBattleIcons, detectLabelCrops } from './label-sprites-core';
import type { RgbaImage } from '../src/features/scan/types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number): void {
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

function addBattleHpPanel(img: RgbaImage, x: number, y: number): void {
  fillRect(img, x, y, 180, 48, 205, 35, 125);
}

function addSelectionPanels(img: RgbaImage): void {
  for (let k = 0; k < 6; k++) {
    fillRect(img, 720, 150 + k * 68, 230, 50, 170, 18, 82);
  }
}

describe('detectLabelCrops', () => {
  it('expands thin embedded battle panel strips to cover the full icon plate', () => {
    const img = blank(1600, 1000);
    fillRect(img, 900, 100, 380, 45, 205, 35, 125);
    fillRect(img, 1300, 100, 360, 45, 205, 35, 125);
    fillRect(img, 1120, 155, 220, 18, 80, 230, 35);

    const boxes = detectBattleIcons(img);
    expect(boxes).toHaveLength(2);
    expect(boxes[0].w).toBeGreaterThan(175);
    expect(boxes[0].h).toBeGreaterThan(175);
    expect(boxes[0].x).toBeLessThan(810);
    expect(boxes[0].y).toBeLessThanOrEqual(100);
    expect(boxes[1].x).toBeGreaterThan(1160);
  });

  it('uses battle mode when auto sees two top-right battle HP panels', () => {
    const img = blank(1000, 600);
    addBattleHpPanel(img, 520, 28);
    addBattleHpPanel(img, 760, 28);
    addSelectionPanels(img);

    expect(detectLabelCrops(img, 'battle').boxes).toHaveLength(2);
    expect(detectLabelCrops(img, 'team').boxes.length).toBeGreaterThan(0);
    expect(detectLabelCrops(img, 'auto').mode).toBe('battle');
  });

  it('keeps team mode when auto only sees selection panels', () => {
    const img = blank(1000, 600);
    addSelectionPanels(img);

    const result = detectLabelCrops(img, 'auto');
    expect(result.mode).toBe('team');
    expect(result.boxes.length).toBeGreaterThan(0);
  });
});
