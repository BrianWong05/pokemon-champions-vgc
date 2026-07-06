// src/features/scan/scanTargets.ts
// Decides what a screenshot is (team preview vs in-battle) and where the
// classifiable sprites are. A screenshot is EITHER battle OR team select,
// never both: battle iff the opponent plate PAIR is found, or — for one-Pokemon-left and
// singles frames — a panel on either side verifies as a real battle plate
// (HP-bar strip; see plateVerify.ts). A >=4-card stack decides team FIRST,
// so the magenta top card of a team-preview column can't masquerade as a
// single plate. When the fast path comes up empty or clearly short, the
// game rectangle is inferred from color anchors (browser chrome, video
// frames, photo margins) and detection re-runs inside it.
import {
  cropImage,
  detectOpponentSpriteBoxes,
  detectPlayerSpriteBoxes,
} from './segmentation';
import { detectBattleIcons, detectBattlePanels } from './battleDetection';
import { inferGameRectCandidates } from './gameRect';
import { readHpFromPanel } from './hpText';
import { isBattlePlate } from './plateVerify';
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

function battleTargets(
  img: RgbaImage,
  side: ScanSide,
  panels: TileBox[] = detectBattlePanels(img, side),
): ScanTarget[] {
  const icons = detectBattleIcons(img, side, panels);
  return panels.map((panel, i) => ({
    box: icons[i],
    side,
    hpPercent: readHpFromPanel(img, panel, undefined, side === 'opponent' ? 'percent' : 'fraction')?.percent ?? null,
  })).filter((target) => target.box != null);
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

// A genuine team-select opponent column stacks its cards at one x — their
// left-edge span is a small fraction of a card's width (measured 0.25-0.32 on
// real team frames). Battle-frame magenta noise (shiny models, facecam, arena
// tint) also reaches the >=4 count but scatters horizontally (>0.8), so gate
// the card-stack guard on alignment before it can steal battle mode.
function isCardColumn(cards: TileBox[]): boolean {
  if (cards.length < 4) return false;
  const xs = cards.map((c) => c.x);
  const meanW = cards.reduce((s, c) => s + c.w, 0) / cards.length;
  return (Math.max(...xs) - Math.min(...xs)) <= meanW * 0.5;
}

function detect(img: RgbaImage): { mode: ScanMode; targets: ScanTarget[] } {
  // Rung 1: the opponent plate pair — unchanged, zero regression risk.
  const oppPanels = detectBattlePanels(img, 'opponent');
  if (isPlatePairRow(oppPanels)) {
    return { mode: 'battle', targets: [...battleTargets(img, 'opponent', oppPanels), ...battleTargets(img, 'player')] };
  }
  // Rung 2: card-stack guard — a genuine team screen is decided by its
  // strongest structure before single-plate evidence is consulted (the
  // clipped magenta top card can otherwise masquerade as a plate). The >=4
  // opponent cards must form an aligned COLUMN: battle-frame magenta noise
  // also reaches the count but scatters horizontally, so it must not win here.
  const team = teamTargets(img);
  const oppCards = team.filter((t) => t.side === 'opponent').map((t) => t.box);
  if (isCardColumn(oppCards)) {
    return { mode: 'team', targets: team };
  }
  // Rung 3: any panel on EITHER side verified as a real battle plate (HP
  // bar strip / readable HP) wins battle mode. Only verified panels become
  // targets — an unverified magenta blob next to a verified plate stays out.
  const verifiedOpp = oppPanels.filter((p) => isBattlePlate(img, p, 'percent'));
  const verifiedPlayer = detectBattlePanels(img, 'player').filter((p) => isBattlePlate(img, p, 'fraction'));
  if (verifiedOpp.length || verifiedPlayer.length) {
    return {
      mode: 'battle',
      targets: [...battleTargets(img, 'opponent', verifiedOpp), ...battleTargets(img, 'player', verifiedPlayer)],
    };
  }
  // Rung 4: today's fallback.
  return { mode: 'team', targets: team };
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

  // Try candidate game rects strongest-anchor-first; the first one whose
  // re-detection is CONFIDENT wins. Single-plate hypotheses (and junk blobs
  // from plate-colored Pokemon bodies) are validated by this re-detection —
  // a wrong rect yields no verified plates / no card column and is skipped.
  let fallback: ScanDetection | null = null;
  for (const rect of inferGameRectCandidates(img)) {
    const inner = detect(cropImage(img, rect));
    const shifted: ScanDetection = {
      mode: inner.mode,
      gameRect: rect,
      targets: inner.targets.map((t) => ({
        ...t,
        box: { ...t.box, x: t.box.x + rect.x, y: t.box.y + rect.y },
      })),
    };
    if (isConfident(inner)) return shifted;
    if (!fallback && inner.targets.length > fast.targets.length) fallback = shifted;
  }
  return fallback ?? { ...fast, gameRect: null };
}
