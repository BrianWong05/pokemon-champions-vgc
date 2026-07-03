import { describe, expect, it } from 'vitest';
import {
  classNameForChar,
  charsForExpectedText,
  glyphInkDensity,
  hasEnoughGlyphInk,
  normalizeBoxToImage,
  samplesFromPanel,
  selectGlyphBoxes,
  trimBoxVertically,
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

function fillMaskBox(m: BinMask, box: TileBox): void {
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      if (x >= 0 && x < m.w && y >= 0 && y < m.h) m.bits[y * m.w + x] = 1;
    }
  }
}

function maskWithBoxes(w: number, h: number, boxes: TileBox[]): BinMask {
  const m = mask(w, h);
  boxes.forEach((box) => fillMaskBox(m, box));
  return m;
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
    ];
    const selected = selectGlyphBoxes(maskWithBoxes(32, 16, boxes), [boxes], '43%');
    expect(selected).not.toBeNull();
    expect(selected?.length).toBe(3);
    expect(selected?.[2]).toEqual({ x: 18, y: 0, w: 6, h: 12 });
  });

  it('rejects a percent candidate when the extra split is on a preceding digit', () => {
    const boxes: TileBox[] = [
      { x: 0, y: 0, w: 2, h: 12 },
      { x: 2, y: 0, w: 3, h: 12 },
      { x: 10, y: 0, w: 5, h: 12 },
      { x: 18, y: 1, w: 5, h: 6 },
    ];
    const selected = selectGlyphBoxes(maskWithBoxes(32, 16, boxes), [boxes], '43%');
    expect(selected).toBeNull();
  });

  it('does not force-split percentage reads when the percent glyph is absent', () => {
    const boxes: TileBox[] = [
      { x: 0, y: 0, w: 14, h: 18 },
      { x: 18, y: 0, w: 13, h: 18 },
    ];
    const selected = selectGlyphBoxes(maskWithBoxes(36, 24, boxes), [boxes], '87%');
    expect(selected).toBeNull();
  });

  it('does not concatenate separated clusters to satisfy a percentage label', () => {
    const clusters: TileBox[][] = [
      [{ x: 0, y: 0, w: 8, h: 16 }],
      [
        { x: 120, y: 0, w: 14, h: 18 },
        { x: 138, y: 0, w: 13, h: 18 },
      ],
    ];
    const selected = selectGlyphBoxes(maskWithBoxes(160, 24, clusters.flat()), clusters, '87%');
    expect(selected).toBeNull();
  });

  it('prefers a split percent cluster over an oversized exact-count noise cluster', () => {
    const noisyExact: TileBox[] = [
      { x: 44, y: 7, w: 28, h: 60 },
      { x: 72, y: 7, w: 39, h: 60 },
      { x: 111, y: 7, w: 55, h: 60 },
      { x: 166, y: 7, w: 36, h: 60 },
    ];
    const validSplitPercent: TileBox[] = [
      { x: 136, y: 24, w: 10, h: 19 },
      { x: 151, y: 24, w: 15, h: 19 },
      { x: 168, y: 24, w: 15, h: 19 },
      { x: 189, y: 32, w: 6, h: 11 },
      { x: 195, y: 32, w: 7, h: 11 },
    ];

    const selected = selectGlyphBoxes(maskWithBoxes(220, 87, validSplitPercent), [noisyExact, validSplitPercent], '100%');

    expect(selected).toEqual([
      { x: 136, y: 24, w: 10, h: 19 },
      { x: 151, y: 24, w: 15, h: 19 },
      { x: 168, y: 24, w: 15, h: 19 },
      { x: 189, y: 32, w: 13, h: 11 },
    ]);
  });

  it('sheds an isolated left blob and keeps the rightmost N (right-aligned text)', () => {
    // 3 boxes for a 2-char label: the box at x=0 sits far from the digits, so
    // drop it (the icon/plate-edge blob) and keep the rightmost two.
    const boxes: TileBox[] = [
      { x: 0, y: 0, w: 10, h: 20 },
      { x: 60, y: 0, w: 12, h: 20 },
      { x: 74, y: 0, w: 12, h: 20 },
    ];
    expect(selectGlyphBoxes(maskWithBoxes(100, 24, boxes), [boxes], '43')?.map((b) => b.x)).toEqual([60, 74]);
  });

  it('does not shed when no box is clearly the isolated left blob', () => {
    // evenly-spaced boxes: the drop gap is not larger than the internal gap, so
    // we must not guess which to drop.
    const boxes: TileBox[] = [
      { x: 0, y: 0, w: 12, h: 20 },
      { x: 20, y: 0, w: 12, h: 20 },
      { x: 40, y: 0, w: 12, h: 20 },
    ];
    expect(selectGlyphBoxes(maskWithBoxes(100, 24, boxes), [boxes], '43')).toBeNull();
  });
});

describe('trimBoxVertically', () => {
  it('trims to the dense ink band, dropping a stray noise row above the glyph', () => {
    const w = 8;
    const h = 32;
    const bits = new Uint8Array(w * h);
    bits[2 * w + 3] = 1; // one noise pixel high in a column (inflates the box to y=2)
    for (let y = 10; y <= 25; y++) for (let x = 1; x < 7; x++) bits[y * w + x] = 1; // the glyph body
    const trimmed = trimBoxVertically({ bits, w, h }, { x: 0, y: 2, w, h: 29 });
    expect(trimmed).toEqual({ x: 0, y: 10, w, h: 16 });
  });

  it('leaves an already-tight box unchanged', () => {
    const w = 8;
    const h = 20;
    const bits = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 1; x < 7; x++) bits[y * w + x] = 1;
    expect(trimBoxVertically({ bits, w, h }, { x: 0, y: 0, w, h })).toEqual({ x: 0, y: 0, w, h });
  });
});

describe('glyph ink density', () => {
  it('rejects sparse frame-like boxes before they become training samples', () => {
    const m = mask(20, 20);
    const sparse = { x: 2, y: 2, w: 10, h: 10 };
    m.bits[2 * m.w + 2] = 1;
    m.bits[11 * m.w + 11] = 1;

    expect(glyphInkDensity(m, sparse)).toBeCloseTo(0.02);
    expect(hasEnoughGlyphInk(m, [sparse])).toBe(false);

    fillMaskBox(m, { x: 4, y: 4, w: 4, h: 8 });
    expect(hasEnoughGlyphInk(m, [{ x: 4, y: 4, w: 4, h: 8 }])).toBe(true);
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
    const pixels = Array.from({ length: img.data.length / 4 }, (_, index) => img.data.slice(index * 4, index * 4 + 4));
    expect(pixels.some(([r, g, b, a]) => a === 255 && r === 255 && g === 255 && b === 255)).toBe(true);
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
