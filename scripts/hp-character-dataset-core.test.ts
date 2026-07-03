import { describe, expect, it } from 'vitest';
import {
  classNameForChar,
  charsForExpectedText,
  normalizeBoxToImage,
  samplesFromPanel,
  selectGlyphBoxes,
} from './hp-character-dataset-core';
import type { BinMask } from '../src/features/scan/hpText';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

function blankImage(w: number, h: number): RgbaImage {
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

function mask(w: number, h: number): BinMask {
  return { bits: new Uint8Array(w * h), w, h };
}

describe('HP character dataset labels', () => {
  it('maps classifier characters to stable dataset directories', () => {
    expect(classNameForChar('0')).toBe('0');
    expect(classNameForChar('9')).toBe('9');
    expect(classNameForChar('/')).toBe('slash');
    expect(classNameForChar('%')).toBe('percent');
    expect(() => classNameForChar('O')).toThrow(/unsupported/i);
  });

  it('splits expected HP strings into validated character labels', () => {
    expect(charsForExpectedText('43%')).toEqual(['4', '3', '%']);
    expect(charsForExpectedText('177/177')).toEqual(['1', '7', '7', '/', '1', '7', '7']);
    expect(() => charsForExpectedText('10O/177')).toThrow(/unsupported/i);
  });
});

describe('selectGlyphBoxes', () => {
  it('merges a percent sign split into slash and dot components', () => {
    const boxes: TileBox[] = [
      { x: 0, y: 0, w: 5, h: 12 },
      { x: 8, y: 0, w: 5, h: 12 },
      { x: 18, y: 1, w: 3, h: 3 },
      { x: 20, y: 0, w: 4, h: 12 },
      { x: 24, y: 9, w: 3, h: 3 },
    ];
    const selected = selectGlyphBoxes(mask(32, 16), [boxes], '43%');
    expect(selected).not.toBeNull();
    expect(selected?.length).toBe(3);
    expect(selected?.[2]).toEqual({ x: 18, y: 0, w: 9, h: 12 });
  });
});

describe('normalizeBoxToImage', () => {
  it('renders a clean 24 x 32 character sample', () => {
    const m = mask(8, 12);
    for (let y = 2; y < 10; y++) {
      m.bits[y * m.w + 3] = 1;
      m.bits[y * m.w + 4] = 1;
    }
    const img = normalizeBoxToImage(m, { x: 2, y: 2, w: 4, h: 8 });
    expect(img.width).toBe(24);
    expect(img.height).toBe(32);
    expect(img.data.length).toBe(24 * 32 * 4);
    expect(Array.from(img.data).some((v) => v === 255)).toBe(true);
  });
});

describe('samplesFromPanel', () => {
  it('extracts labeled character samples from a synthetic HP text region', () => {
    const img = blankImage(80, 40);
    const panel: TileBox = { x: 10, y: 5, w: 60, h: 10 };
    fillRect(img, 12, 12, 2, 11, 255);
    fillRect(img, 22, 12, 6, 11, 255);

    const result = samplesFromPanel(img, panel, '12');
    expect(result.skipped).toBe(false);
    expect(result.samples.map((s) => s.char)).toEqual(['1', '2']);
    expect(result.samples.map((s) => s.className)).toEqual(['1', '2']);
    expect(result.samples.every((s) => s.image.width === 24 && s.image.height === 32)).toBe(true);
  });
});
