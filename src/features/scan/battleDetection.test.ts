import { describe, it, expect } from 'vitest';
import { detectBattlePanels, detectBattleIcons } from './battleDetection';
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

describe('detectBattlePanels', () => {
  it('finds two magenta opponent panels top-right', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    const panels = detectBattlePanels(img, 'opponent');
    expect(panels.length).toBe(2);
    expect(panels[0].x).toBeLessThan(panels[1].x);
  });

  it('finds two purple player panels bottom-left', () => {
    const img = blank(1250, 700);
    fillRect(img, 40, 600, 160, 40, 80, 60, 190);
    fillRect(img, 300, 600, 160, 40, 80, 60, 190);
    expect(detectBattlePanels(img, 'player').length).toBe(2);
  });

  it('does not cross sides', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120); // opponent-colored, opponent region
    expect(detectBattlePanels(img, 'player').length).toBe(0);
  });
});

describe('detectBattleIcons', () => {
  it('returns one square-ish icon crop per panel, left of the panel', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    const icons = detectBattleIcons(img, 'opponent');
    expect(icons.length).toBe(2);
    expect(icons[0].x).toBeLessThan(720);
  });
});
