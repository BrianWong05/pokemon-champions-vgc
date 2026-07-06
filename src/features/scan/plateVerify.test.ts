import { describe, it, expect } from 'vitest';
import { hasHpBarStrip, isBattlePlate } from './plateVerify';
import type { RgbaImage, TileBox } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

// Magenta plate whose lower band holds an HP bar: green fill for fillFrac of
// the strip, dark track for the rest. Returns the panel box a detector would
// find (the strip splits the blob, so the detected panel is the TOP band —
// mirrors the real "short blob" behavior measureHpBarFill was built for).
function paintPlate(img: RgbaImage, x: number, y: number, w: number, h: number, fillFrac: number): TileBox {
  fillRect(img, x, y, w, h, 220, 40, 120);
  const barY = y + Math.round(h * 0.72);
  const barH = Math.max(3, Math.round(h * 0.15));
  const barX = x + 6;
  const barW = w - 12;
  const fillW = Math.max(2, Math.round(barW * fillFrac));
  fillRect(img, barX, barY, fillW, barH, 60, 200, 80);            // fill (green)
  if (fillW < barW) fillRect(img, barX + fillW, barY, barW - fillW, barH, 35, 35, 40); // track (dark)
  return { x, y, w, h: barY - y }; // top band, like a fragmented blob
}

describe('hasHpBarStrip', () => {
  it('accepts a mid bar, a near-empty (2%) bar, and a full (100%) bar', () => {
    for (const frac of [0.5, 0.02, 1.0]) {
      const img = blank(1250, 700);
      const panel = paintPlate(img, 900, 40, 200, 48, frac);
      expect(hasHpBarStrip(img, panel), `fillFrac ${frac}`).toBe(true);
    }
  });

  it('accepts the same strip at a low source resolution', () => {
    const img = blank(640, 360);
    const panel = paintPlate(img, 440, 20, 110, 26, 0.4);
    expect(hasHpBarStrip(img, panel)).toBe(true);
  });

  it('rejects a plain card-like blob with no strip', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 40, 200, 48, 220, 40, 120);
    expect(hasHpBarStrip(img, { x: 900, y: 40, w: 200, h: 48 })).toBe(false);
  });

  it('rejects misaligned organic runs (card sprite shadow)', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 40, 200, 60, 220, 40, 120);
    // Three long fill-anchored runs at jumping offsets: each passes the span
    // gate (110 >= 200*0.5) and starts with fill, but starts differ by 40px
    // (> max(4, 200*0.05)=10) so the 3-row alignment requirement rejects them.
    for (const [x, y] of [[905, 74], [945, 76], [985, 78]] as const) {
      fillRect(img, x, y, 8, 2, 60, 200, 80);          // fill anchor
      fillRect(img, x + 8, y, 102, 2, 35, 35, 40);     // dark run
    }
    expect(hasHpBarStrip(img, { x: 900, y: 40, w: 200, h: 34 })).toBe(false);
  });

  it('rejects a dark floor band with no fill anchor (track-only rows)', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 40, 200, 30, 220, 40, 120);   // plate top band
    fillRect(img, 880, 80, 240, 20, 30, 30, 34);     // dark arena floor below
    expect(hasHpBarStrip(img, { x: 900, y: 40, w: 200, h: 30 })).toBe(false);
  });
});

describe('isBattlePlate', () => {
  it('bar strip alone is sufficient (no readable HP text needed)', () => {
    const img = blank(1250, 700);
    const panel = paintPlate(img, 900, 40, 200, 48, 0.5);
    expect(isBattlePlate(img, panel, 'percent')).toBe(true);
  });

  it('rejects a bare magenta banner', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 20, 200, 40, 210, 45, 120);
    expect(isBattlePlate(img, { x: 900, y: 20, w: 200, h: 40 }, 'percent')).toBe(false);
  });
});
