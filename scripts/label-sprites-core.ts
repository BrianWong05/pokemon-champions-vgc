import { detectOpponentSpriteBoxes, detectPlayerSpriteBoxes } from '../src/features/scan/segmentation';
import { detectBattleIcons as detectSideBattleIcons } from '../src/features/scan/battleDetection';
import { detectScanTargets } from '../src/features/scan/scanTargets';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

export type LabelMode = 'team' | 'battle';
export type RequestedMode = 'auto' | LabelMode;

export function detectTiles(img: RgbaImage): TileBox[] {
  return [...detectOpponentSpriteBoxes(img), ...detectPlayerSpriteBoxes(img)];
}

export function detectBattleIcons(img: RgbaImage): TileBox[] {
  return [...detectSideBattleIcons(img, 'opponent'), ...detectSideBattleIcons(img, 'player')];
}

export function detectLabelCrops(img: RgbaImage, requestedMode: RequestedMode = 'auto'): { mode: LabelMode; boxes: TileBox[] } {
  if (requestedMode === 'team') return { mode: 'team', boxes: detectTiles(img) };
  if (requestedMode === 'battle') return { mode: 'battle', boxes: detectBattleIcons(img) };

  // Auto mirrors the app pipeline exactly (mode routing, both sides, and
  // game-rect inference for framed/video images), so labeled training crops
  // match what inference will see.
  const { mode, targets } = detectScanTargets(img);
  return { mode, boxes: targets.map((t) => t.box) };
}
