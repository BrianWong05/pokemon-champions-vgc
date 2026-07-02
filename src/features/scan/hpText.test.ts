import { describe, expect, it } from 'vitest';
import {
  clusterGlyphBoxes,
  matchGlyph,
  normalizeGlyph,
  parseHpText,
  readHpFromPanel,
  segmentGlyphs,
  whiteMask,
  type BinMask,
} from './hpText';
import type { RgbaImage, TileBox } from './types';

function maskOf(rows: string[]): BinMask {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const bits = new Uint8Array(w * h);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') bits[y * w + x] = 1;
    });
  });
  return { bits, w, h };
}

describe('parseHpText', () => {
  it('parses percent form', () => {
    expect(parseHpText('100%')).toEqual({ percent: 100 });
    expect(parseHpText('7%')).toEqual({ percent: 7 });
  });

  it('parses fraction form with exact hp', () => {
    expect(parseHpText('157/157')).toEqual({ percent: 100, current: 157, max: 157 });
    expect(parseHpText('40/160')).toEqual({ percent: 25, current: 40, max: 160 });
  });

  it('rejects invalid hp text', () => {
    expect(parseHpText('')).toBeNull();
    expect(parseHpText('101%')).toBeNull();
    expect(parseHpText('200/100')).toBeNull();
    expect(parseHpText('07:00')).toBeNull();
  });
});

describe('whiteMask', () => {
  it('uses a threshold relative to the brightest pixel in the region', () => {
    const img: RgbaImage = { data: new Uint8ClampedArray(4 * 2 * 4), width: 4, height: 2 };
    const set = (x: number, y: number, v: number) => {
      const i = (y * img.width + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    };
    set(0, 0, 40);
    set(1, 0, 160);
    set(2, 0, 210);
    set(3, 0, 255);

    const mask = whiteMask(img, { x: 0, y: 0, w: 4, h: 1 });
    expect(Array.from(mask.bits)).toEqual([0, 0, 1, 1]);
  });
});

describe('segmentGlyphs', () => {
  it('splits glyphs on empty columns and keeps x order', () => {
    const mask = maskOf([
      '.##..#..##.',
      '.##..#..##.',
      '.##..#..##.',
      '.##..#..##.',
      '.##..#..##.',
    ]);
    const boxes = segmentGlyphs(mask);
    expect(boxes.length).toBe(3);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
  });
});

describe('clusterGlyphBoxes', () => {
  it('splits boxes separated by a wide gap into clusters', () => {
    const g = (x: number): TileBox => ({ x, y: 0, w: 4, h: 8 });
    const clusters = clusterGlyphBoxes([g(0), g(6), g(12), g(60), g(66)]);
    expect(clusters.length).toBe(2);
    expect(clusters[0].length).toBe(3);
  });
});

describe('normalizeGlyph and matchGlyph', () => {
  it('recognizes a glyph against a template built from itself', () => {
    const mask = maskOf(['####', '#..#', '#..#', '####']);
    const bits = normalizeGlyph(mask, { x: 0, y: 0, w: 4, h: 4 });
    const template = { char: '0', bits: Array.from(bits).join(''), hFrac: 1 };
    expect(matchGlyph(bits, 1, [template])).toBe('0');
  });

  it('returns null when nothing is close', () => {
    const empty = new Uint8Array(256);
    const full = { char: '8', bits: '1'.repeat(256), hFrac: 1 };
    expect(matchGlyph(empty, 1, [full])).toBeNull();
  });

  it('rejects templates from a different relative height (a % circle is not a 0)', () => {
    const mask = maskOf(['####', '#..#', '#..#', '####']);
    const bits = normalizeGlyph(mask, { x: 0, y: 0, w: 4, h: 4 });
    const template = { char: '0', bits: Array.from(bits).join(''), hFrac: 1 };
    expect(matchGlyph(bits, 0.35, [template])).toBeNull();
  });
});

describe('readHpFromPanel', () => {
  it('returns null with empty templates', () => {
    const img: RgbaImage = { data: new Uint8ClampedArray(100 * 100 * 4), width: 100, height: 100 };
    expect(readHpFromPanel(img, { x: 10, y: 10, w: 60, h: 12 }, [])).toBeNull();
  });
});
