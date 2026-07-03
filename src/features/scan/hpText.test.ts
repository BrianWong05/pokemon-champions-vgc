import { describe, expect, it } from 'vitest';
import {
  decodeWindow,
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
    const full = { char: '8', bits: '9'.repeat(256), hFrac: 1 };
    expect(matchGlyph(empty, 1, [full])).toBeNull();
  });

  it('rejects templates from a different relative height (a % circle is not a 0)', () => {
    const mask = maskOf(['####', '#..#', '#..#', '####']);
    const bits = normalizeGlyph(mask, { x: 0, y: 0, w: 4, h: 4 });
    const template = { char: '0', bits: Array.from(bits).join(''), hFrac: 1 };
    expect(matchGlyph(bits, 0.35, [template])).toBeNull();
  });
});

describe('normalizeGlyph quantization', () => {
  it('reports partial cell coverage as intermediate levels', () => {
    // 24x24 checkerboard onto a 16x16 grid (1.5px cells): every cell straddles
    // on/off pixels, so coverage lands between empty and full instead of 0/1.
    const rows = Array.from({ length: 24 }, (_, y) =>
      Array.from({ length: 24 }, (_, x) => ((x + y) % 2 ? '#' : '.')).join(''),
    );
    const mask = maskOf(rows);
    const levels = normalizeGlyph(mask, { x: 0, y: 0, w: 24, h: 24 });
    expect(Math.max(...levels)).toBeLessThanOrEqual(9);
    expect(levels.some((v) => v > 0 && v < 9)).toBe(true);
  });
});

describe('matchGlyph margin rule', () => {
  const glyph = (fill: number) => new Uint8Array(256).fill(fill);
  const tpl = (char: string, fill: number) => ({ char, bits: Array.from(glyph(fill)).join(''), hFrac: 1 });

  it('accepts a clear winner', () => {
    expect(matchGlyph(glyph(9), 1, [tpl('8', 9), tpl('1', 0)])).toBe('8');
  });

  it('rejects when two different chars are nearly equally close', () => {
    // glyph fill 5 sits between templates '1' (4) and '7' (6): margin too thin.
    expect(matchGlyph(glyph(5), 1, [tpl('1', 4), tpl('7', 6)])).toBeNull();
  });

  it('is not blocked by near-duplicate templates of the SAME char', () => {
    expect(matchGlyph(glyph(9), 1, [tpl('8', 9), tpl('8', 8), tpl('1', 0)])).toBe('8');
  });
});

describe('whiteMask threshold factor', () => {
  it('lower factor admits dimmer pixels', () => {
    const img: RgbaImage = { data: new Uint8ClampedArray(4 * 4 * 4), width: 4, height: 4 };
    const set = (i: number, v: number) => {
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    };
    set(0, 255); set(1, 190); // peak 255; 190 < 0.8*255 but > 0.72*255
    const strict = whiteMask(img, { x: 0, y: 0, w: 4, h: 4 }, 0.8);
    const loose = whiteMask(img, { x: 0, y: 0, w: 4, h: 4 }, 0.72);
    expect(strict.bits[1]).toBe(0);
    expect(loose.bits[1]).toBe(1);
  });
});

describe('readHpFromPanel', () => {
  it('returns null with empty templates', () => {
    const img: RgbaImage = { data: new Uint8ClampedArray(100 * 100 * 4), width: 100, height: 100 };
    expect(readHpFromPanel(img, { x: 10, y: 10, w: 60, h: 12 }, [])).toBeNull();
  });
});

describe('decodeWindow', () => {
  const glyph = (chars: Array<[string, number]>): import('./hpText').GlyphCosts => ({
    box: { x: 0, y: 0, w: 8, h: 16 },
    dists: new Map(chars),
  });

  it('resolves an ambiguous glyph by phrase validity', () => {
    // First glyph: '7' is marginally cheaper than '1', but "700%" is not a
    // valid HP phrase — the decode must settle on "100%".
    const window = [
      glyph([['7', 0.02], ['1', 0.025]]),
      glyph([['0', 0.01]]),
      glyph([['0', 0.01]]),
      glyph([['%', 0.01]]),
    ];
    const cands = decodeWindow(window);
    expect(cands.map((c) => c.value)).toContain('100%');
    expect(cands.map((c) => c.value)).not.toContain('700%');
  });

  it('returns nothing when a position has no plausible characters', () => {
    const window = [glyph([['1', 0.01]]), glyph([]), glyph([['%', 0.01]])];
    expect(decodeWindow(window)).toEqual([]);
  });

  it('rejects fraction phrases with implausible max HP', () => {
    const window = [
      glyph([['9', 0.01]]),
      glyph([['/', 0.01]]),
      glyph([['9', 0.01]]),
    ];
    // 9/9 parses, but max 9 is not a plausible Pokemon HP.
    expect(decodeWindow(window).map((c) => c.value)).not.toContain('9/9');
  });
});
