// src/features/scan/scanImage.ts
import { cropImage } from './segmentation';
import { detectScanTargets } from './scanTargets';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

// Despite the name (kept for callers), this scans BOTH screen types: team
// preview and in-battle, via the unified target detection.
export function scanTeamImage(img: RgbaImage, refs: ReferenceEntry[], topN = 3): SlotResult[] {
  return detectScanTargets(img).targets.map(({ box, side, hpPercent }) => ({
    box,
    side,
    hpPercent,
    candidates: matchTile(computeDescriptor(cropImage(img, box)), refs, topN),
  }));
}
