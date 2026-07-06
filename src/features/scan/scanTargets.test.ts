import { describe, it, expect } from 'vitest';
import { detectScanTargets } from './scanTargets';
import { inferGameRect, PLATE_SLOTS } from './gameRect';
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

  it('scattered magenta blobs (arena/facecam noise) do not fake a team column', () => {
    // A real battle frame: one verified opponent plate top-right, plus 5 small
    // magenta blobs scattered across the arena (shiny models, facecam, tint).
    // These reach the >=4 opponent-card count but are NOT column-aligned, so
    // the card-stack guard must not fire and steal battle mode.
    const img = blank(1250, 700);
    paintBattlePlate(img, 960, 30, 160, 40, 'opponent', 0.5);
    fillRect(img, 100, 120, 50, 50, 210, 45, 120);
    fillRect(img, 400, 260, 50, 50, 210, 45, 120);
    fillRect(img, 250, 380, 50, 50, 210, 45, 120);
    fillRect(img, 600, 300, 50, 50, 210, 45, 120);
    fillRect(img, 500, 500, 50, 50, 210, 45, 120);
    expect(detectScanTargets(img).mode).toBe('battle');
  });
});

// Battle plate WITH an HP bar strip (fill-anchored, dark remainder) so the
// single-plate verifier rung can accept it. Colors match the existing tests'
// plate colors (opponent magenta 220/40/120, player indigo 80/60/190).
function paintBattlePlate(
  img: RgbaImage, x: number, y: number, w: number, h: number,
  side: 'opponent' | 'player', fillFrac = 0.5,
) {
  const [r, g, b] = side === 'opponent' ? [220, 40, 120] : [80, 60, 190];
  fillRect(img, x, y, w, h, r, g, b);
  const barY = y + Math.round(h * 0.72);
  const barH = Math.max(3, Math.round(h * 0.15));
  const fillW = Math.max(2, Math.round((w - 12) * fillFrac));
  fillRect(img, x + 6, barY, fillW, barH, 60, 200, 80);
  if (fillW < w - 12) fillRect(img, x + 6 + fillW, barY, w - 12 - fillW, barH, 35, 35, 40);
}

describe('single-plate battle detection (mode-vote rung 3)', () => {
  // Slot x-positions inside a full 1250x700 frame, per the pair geometry the
  // existing pair test uses (left plate at 720, right at 960).
  const OPP = { left: 720, right: 960, y: 30, w: 160, h: 40 };
  const PLAYER = { left: 40, right: 300, y: 600, w: 160, h: 40 };

  it('1 opponent plate + 2 player plates -> battle', () => {
    const img = blank(1250, 700);
    paintBattlePlate(img, OPP.right, OPP.y, OPP.w, OPP.h, 'opponent', 0.02); // near-empty bar
    paintBattlePlate(img, PLAYER.left, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
    paintBattlePlate(img, PLAYER.right, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.filter((t) => t.side === 'opponent').length).toBe(1);
    expect(targets.filter((t) => t.side === 'player').length).toBe(2);
  });

  it('1v1 -> battle, at every slot combination on both sides', () => {
    for (const oppX of [OPP.left, OPP.right]) for (const playerX of [PLAYER.left, PLAYER.right]) {
      const img = blank(1250, 700);
      paintBattlePlate(img, oppX, OPP.y, OPP.w, OPP.h, 'opponent');
      paintBattlePlate(img, playerX, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
      const { mode, targets } = detectScanTargets(img);
      expect(mode, `opp@${oppX} player@${playerX}`).toBe('battle');
      expect(targets.length, `opp@${oppX} player@${playerX}`).toBe(2);
    }
  });

  it('1 opponent plate + 0 player plates -> battle', () => {
    const img = blank(1250, 700);
    paintBattlePlate(img, OPP.right, OPP.y, OPP.w, OPP.h, 'opponent', 1.0); // full bar
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.length).toBe(1);
  });

  it('0 opponent + 1 verified player plate -> battle (either-side evidence)', () => {
    const img = blank(1250, 700);
    paintBattlePlate(img, PLAYER.left, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.filter((t) => t.side === 'player').length).toBe(1);
  });

  it('a bare magenta banner (no bar strip) on an empty frame stays team', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 20, 200, 40, 210, 45, 120);
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('team');
    expect(targets.length).toBe(0);
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

describe('single-plate game-rect inference', () => {
  // Paint one opponent plate + one player plate INSIDE a game sub-rectangle,
  // at the exported slot fractions so constant refinements keep tests true.
  // The game is deliberately SMALL (640 wide in a 1600 frame): the plate is
  // then ~6.4% of frame width, UNDER detectBattlePanels' 7% floor, so the
  // fast path finds nothing and the rescue loop is genuinely exercised
  // (with a larger game the fast path's rung 3 would already succeed and
  // gameRect would legitimately stay null).
  function paintLetterboxed(slot: { x0: number; x1: number; y0: number }) {
    const img = blank(1600, 1200);
    const game = { x: 480, y: 300, w: 640, h: 360 };
    const px = game.x + Math.round(game.w * slot.x0);
    const pw = Math.round(game.w * (slot.x1 - slot.x0));
    const py = game.y + Math.round(game.h * slot.y0);
    const ph = Math.round(game.h * 0.06);
    paintBattlePlate(img, px, py, pw, ph, 'opponent');
    paintBattlePlate(img, game.x + 40, game.y + Math.round(game.h * 0.88), pw, ph, 'player');
    return { img, game };
  }

  it('recovers the rect from a single plate at the RIGHT slot', () => {
    const { img, game } = paintLetterboxed(PLATE_SLOTS.right);
    const { mode, gameRect } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(gameRect).not.toBeNull();
    expect(Math.abs(gameRect!.x - game.x)).toBeLessThan(game.w * 0.08);
    expect(Math.abs(gameRect!.w - game.w)).toBeLessThan(game.w * 0.08);
  });

  it('recovers detection from a single plate at the LEFT slot (rect may be slot-shifted)', () => {
    const { img, game } = paintLetterboxed(PLATE_SLOTS.left);
    const { mode, gameRect, targets } = detectScanTargets(img);
    // Slot ambiguity: an isolated plate also validates under the right-slot
    // hypothesis (tried first), so the accepted rect can sit left of the true
    // game rect by the slot offset. The design guarantees BEHAVIOR, not slot-
    // exact rects: battle mode, and targets landing on the real plates in
    // source coordinates (boxes are computed from real pixels in the crop and
    // shifted back, so a shifted rect cannot displace them).
    expect(mode).toBe('battle');
    expect(gameRect).not.toBeNull();
    const opp = targets.filter((t) => t.side === 'opponent');
    expect(opp.length).toBe(1);
    const px = game.x + Math.round(game.w * PLATE_SLOTS.left.x0);
    const py = game.y + Math.round(game.h * PLATE_SLOTS.left.y0);
    // The opponent icon box derives from the plate's badge area: it must sit
    // on the plate's row band, near the plate's x-range, in SOURCE coords.
    expect(opp[0].box.x).toBeGreaterThan(px - 150);
    expect(opp[0].box.x).toBeLessThan(px + Math.round(game.w * 0.2));
    expect(opp[0].box.y).toBeGreaterThan(game.y - 30);
    expect(opp[0].box.y).toBeLessThan(py + Math.round(game.h * 0.25));
    expect(targets.filter((t) => t.side === 'player').length).toBe(1);
  });

  it('a plate-shaped junk blob does not hijack the rect (validation wins)', () => {
    const { img, game } = paintLetterboxed(PLATE_SLOTS.right);
    // Shiny-model fragment: plate-aspect magenta blob, LARGER than the real
    // plate so its hypotheses are tried FIRST. Its solved rects sit far below
    // the game area (y anchor ~0.037 puts the crop at ~y 770), so re-detection
    // inside them finds nothing and the loop falls through to the real plate.
    fillRect(img, 700, 800, 220, 70, 235, 45, 130);
    const { mode, gameRect } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(gameRect).not.toBeNull();
    expect(Math.abs(gameRect!.x - game.x)).toBeLessThan(game.w * 0.08);
  });
});
