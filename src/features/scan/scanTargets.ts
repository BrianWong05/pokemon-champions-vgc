// src/features/scan/scanTargets.ts
// Decides what a screenshot is (team preview vs in-battle) and where the
// classifiable sprites are. A screenshot is EITHER battle OR team select,
// never both: battle iff BOTH opponent plates are found (the top card of a
// team-preview opponent column is also magenta and would false-positive a
// single-panel rule). When the fast path comes up empty or clearly short, the
// game rectangle is inferred from color anchors (browser chrome, video
// frames, photo margins) and detection re-runs inside it.
import {
  cropImage,
  detectOpponentSpriteBoxes,
  detectPlayerSpriteBoxes,
} from './segmentation';
import { detectBattleIcons, detectBattlePanels } from './battleDetection';
import { inferGameRect } from './gameRect';
import type { RgbaImage, ScanSide, TileBox } from './types';

export type ScanMode = 'team' | 'battle';

export interface ScanTarget {
  box: TileBox;
  side: ScanSide;
  /** Battle mode only; filled in by the HP reader (null until it lands / when unreadable). */
  hpPercent: number | null;
}

export interface ScanDetection {
  mode: ScanMode;
  targets: ScanTarget[];
  /** Set when detection ran inside an inferred game rectangle. */
  gameRect: TileBox | null;
}

function battleTargets(img: RgbaImage, side: ScanSide): ScanTarget[] {
  return detectBattleIcons(img, side).map((box) => ({ box, side, hpPercent: null }));
}

function teamTargets(img: RgbaImage): ScanTarget[] {
  return [
    ...detectOpponentSpriteBoxes(img).map((box) => ({ box, side: 'opponent' as const, hpPercent: null })),
    ...detectPlayerSpriteBoxes(img).map((box) => ({ box, side: 'player' as const, hpPercent: null })),
  ];
}

// Real battle plates sit side by side on one row; a name banner plus a
// clipped top team-card can also count 2 blobs, but stacked vertically.
function isPlatePairRow(panels: TileBox[]): boolean {
  if (panels.length !== 2) return false;
  const [a, b] = panels;
  return b.x >= a.x + a.w && Math.abs(a.y - b.y) < Math.max(a.h, b.h) * 1.5;
}

function detect(img: RgbaImage): { mode: ScanMode; targets: ScanTarget[] } {
  if (isPlatePairRow(detectBattlePanels(img, 'opponent'))) {
    return { mode: 'battle', targets: [...battleTargets(img, 'opponent'), ...battleTargets(img, 'player')] };
  }
  return { mode: 'team', targets: teamTargets(img) };
}

// Full-frame team screenshots find >=4 opponent cards; battle frames find 2
// plates. Anything below that means the game likely does not fill the frame.
function isConfident(result: { mode: ScanMode; targets: ScanTarget[] }): boolean {
  if (result.mode === 'battle') return true;
  return result.targets.filter((t) => t.side === 'opponent').length >= 4;
}

export function detectScanTargets(img: RgbaImage, allowInfer = true): ScanDetection {
  const fast = detect(img);
  if (isConfident(fast) || !allowInfer) return { ...fast, gameRect: null };

  const rect = inferGameRect(img);
  if (!rect) return { ...fast, gameRect: null };

  const inner = detect(cropImage(img, rect));
  // A confident inner result (verified plate pair / full card column) beats the
  // unconfident fast result even with fewer raw targets — the fast targets are
  // junk from mis-scaled priors. Otherwise fall back to whichever found more.
  if (!isConfident(inner) && inner.targets.length <= fast.targets.length) return { ...fast, gameRect: null };
  return {
    mode: inner.mode,
    gameRect: rect,
    targets: inner.targets.map((t) => ({
      ...t,
      box: { ...t.box, x: t.box.x + rect.x, y: t.box.y + rect.y },
    })),
  };
}
