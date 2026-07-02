import { describe, expect, it } from 'vitest';
import { glyphTemplatesFromPanel, mergeTemplates } from './build-hp-glyph-templates';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, v: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
}

describe('build HP glyph templates', () => {
  it('extracts templates for the expected text from a panel region', () => {
    const img = blank(80, 40);
    const panel: TileBox = { x: 10, y: 5, w: 60, h: 10 };
    fillRect(img, 12, 12, 4, 11, 255);
    fillRect(img, 22, 12, 7, 11, 255);

    const templates = glyphTemplatesFromPanel(img, panel, '12');

    expect(templates.map((t) => t.char)).toEqual(['1', '2']);
    expect(templates.every((t) => t.bits.length === 256)).toBe(true);
  });

  it('deduplicates identical char/template pairs while preserving variants', () => {
    const a = { char: '1', bits: '0'.repeat(256) };
    const b = { char: '1', bits: '1'.repeat(256) };

    expect(mergeTemplates([a], [a, b])).toEqual([a, b]);
  });
});
