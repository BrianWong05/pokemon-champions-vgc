import { describe, it, expect } from 'vitest';
import { detectScanTargets } from './scanTargets';
import { inferGameRect } from './gameRect';
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

// Paint a team-select layout into a game area at (gx, gy) sized gw x gh.
function paintTeamSelect(img: RgbaImage, gx: number, gy: number, gw: number, gh: number) {
  // opponent cards at the measured OPP_COLUMN fractions (x 0.784..0.977)
  const cardX = gx + Math.round(gw * 0.784);
  const cardW = Math.round(gw * 0.19);
  const cardH = Math.round(gh * 0.1);
  for (let k = 0; k < 6; k++) {
    fillRect(img, cardX, gy + Math.round(gh * (0.14 + k * 0.12)), cardW, cardH, 200, 40, 110);
  }
  // player cards on the left
  for (let k = 0; k < 6; k++) {
    fillRect(img, gx + Math.round(gw * 0.03), gy + Math.round(gh * (0.14 + k * 0.12)), cardW, cardH, 90, 60, 200);
  }
}

describe('detectScanTargets', () => {
  it('team screenshot -> team mode with both sides', () => {
    const img = blank(1280, 720);
    paintTeamSelect(img, 0, 0, 1280, 720);
    const { mode, targets, gameRect } = detectScanTargets(img);
    expect(mode).toBe('team');
    expect(gameRect).toBeNull();
    expect(targets.filter((t) => t.side === 'opponent').length).toBe(6);
    expect(targets.filter((t) => t.side === 'player').length).toBe(6);
  });

  it('battle screenshot -> battle mode with both sides', () => {
    const img = blank(1250, 700);
    fillRect(img, 720, 30, 160, 40, 220, 40, 120);
    fillRect(img, 960, 30, 160, 40, 220, 40, 120);
    fillRect(img, 40, 600, 160, 40, 80, 60, 190);
    fillRect(img, 300, 600, 160, 40, 80, 60, 190);
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.filter((t) => t.side === 'opponent').length).toBe(2);
    expect(targets.filter((t) => t.side === 'player').length).toBe(2);
  });

  it('a single plate-like blob does not flip a team screenshot to battle', () => {
    const img = blank(1280, 720);
    paintTeamSelect(img, 0, 0, 1280, 720);
    // one extra magenta banner top-right (like the opponent name banner)
    fillRect(img, 900, 20, 200, 40, 210, 45, 120);
    expect(detectScanTargets(img).mode).toBe('team');
  });
});

describe('game-rect inference (margins)', () => {
  it('recovers the game rect and targets from a framed screenshot', () => {
    const img = blank(1600, 1200);
    const game = { x: 200, y: 150, w: 1200, h: 675 };
    paintTeamSelect(img, game.x, game.y, game.w, game.h);

    const rect = inferGameRect(img);
    expect(rect).not.toBeNull();
    expect(Math.abs(rect!.x - game.x)).toBeLessThan(game.w * 0.08);
    expect(Math.abs(rect!.w - game.w)).toBeLessThan(game.w * 0.08);

    // The fast path may succeed on framed images (embedded-column finder) or
    // fall back to the inferred rect — either way targets must land on the
    // game area in source coordinates.
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('team');
    const opp = targets.filter((t) => t.side === 'opponent');
    expect(opp.length).toBe(6);
    // boxes are in SOURCE coordinates: inside the game area
    for (const t of opp) {
      expect(t.box.x).toBeGreaterThan(game.x + game.w * 0.5);
      expect(t.box.y).toBeGreaterThan(game.y);
      expect(t.box.y + t.box.h).toBeLessThan(game.y + game.h + 10);
    }
  });

  it('returns the fast result when no anchor exists', () => {
    const img = blank(800, 600); // empty image
    const { mode, targets, gameRect } = detectScanTargets(img);
    expect(mode).toBe('team');
    expect(targets.length).toBe(0);
    expect(gameRect).toBeNull();
  });
});
