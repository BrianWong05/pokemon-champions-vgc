import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import type { RgbaImage } from './types';
import { detectArrow, readStatCell } from './statDigits';
import { detectPlayerPanels } from './playerPanels';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = (yy * img.width + xx) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
  }
}

describe('detectArrow', () => {
  it('red cluster on the right of the label = up', () => {
    const img = blank(100, 20);
    fillRect(img, 80, 5, 10, 10, [230, 60, 60]);
    expect(detectArrow(img, { x: 0, y: 0, w: 100, h: 20 })).toBe('up');
  });
  it('blue cluster = down', () => {
    const img = blank(100, 20);
    fillRect(img, 80, 5, 10, 10, [70, 110, 235]);
    expect(detectArrow(img, { x: 0, y: 0, w: 100, h: 20 })).toBe('down');
  });
  it('no saturated cluster = null', () => {
    const img = blank(100, 20);
    fillRect(img, 10, 5, 60, 10, [245, 245, 245]); // white label text
    expect(detectArrow(img, { x: 0, y: 0, w: 100, h: 20 })).toBe(null);
  });
});

const GOLDEN_DIR = 'training/player-screens';

// Nature-derived arrow ground truth, canonical stat order [hp,atk,def,spa,spd,spe].
// hp is never boosted/lowered. Verified against training/player-golden.json's
// "nature" field per team slot.
const NATURE_ARROWS: Record<string, (('up' | 'down' | null)[])[]> = {
  'en-rental': [
    [null, 'down', null, null, 'up', null],   // Grimmsnarl, Calm
    [null, 'up', null, 'down', null, null],   // Swampert, Adamant
    [null, 'down', null, 'up', null, null],   // Pelipper, Modest
    [null, 'down', null, 'up', null, null],   // Archaludon, Modest
    [null, null, 'up', null, null, 'down'],   // Sinistcha, Relaxed
    [null, null, null, 'down', null, 'up'],   // Metagross, Jolly
  ],
};

describe.skipIf(!fs.existsSync(GOLDEN_DIR))('golden stats reads', () => {
  const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'));
  for (const [key, pair] of Object.entries<any>(golden)) {
    if (key.startsWith('_') || !pair.statsImage) continue;
    it(`${key}: all 36 stat and 36 sp values exact`, async () => {
      const { loadPng } = await import('../../../scripts/hp-accuracy-core');
      const img = loadPng(`${GOLDEN_DIR}/${pair.statsImage}`);
      const det = detectPlayerPanels(img);
      expect(det?.kind).toBe('stats');
      const arrows = NATURE_ARROWS[key];
      det!.panels.forEach((panel, slot) => {
        const reads = panel.statCells!.map(c => readStatCell(img, c));
        expect(reads.map(r => r.stat)).toEqual(pair.team[slot].stats);
        expect(reads.map(r => r.sp)).toEqual(pair.team[slot].sp);
        if (arrows) expect(reads.map(r => r.arrow)).toEqual(arrows[slot]);
      });
    }, 300_000);
  }
});
