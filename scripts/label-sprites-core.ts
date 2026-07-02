import { detectOpponentTiles } from '../src/features/scan/segmentation';
import { detectBattleIcons as detectSideBattleIcons } from '../src/features/scan/battleDetection';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

export type LabelMode = 'team' | 'battle';
export type RequestedMode = 'auto' | LabelMode;

export function detectTiles(img: RgbaImage): TileBox[] {
  return detectOpponentTiles(img);
}

export function detectBattleIcons(img: RgbaImage): TileBox[] {
  return detectSideBattleIcons(img, 'opponent');
}

export function detectLabelCrops(img: RgbaImage, requestedMode: RequestedMode = 'auto'): { mode: LabelMode; boxes: TileBox[] } {
  if (requestedMode === 'team') return { mode: 'team', boxes: detectTiles(img) };
  if (requestedMode === 'battle') return { mode: 'battle', boxes: detectBattleIcons(img) };

  const battleBoxes = detectBattleIcons(img);
  if (battleBoxes.length === 2) return { mode: 'battle', boxes: battleBoxes };

  const teamBoxes = detectTiles(img);
  if (teamBoxes.length > 0) return { mode: 'team', boxes: teamBoxes };

  return { mode: 'battle', boxes: battleBoxes };
}
