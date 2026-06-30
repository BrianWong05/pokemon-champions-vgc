// src/features/scan/scanImage.ts
import { detectOpponentTiles, cropImage } from './segmentation';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

export function scanTeamImage(img: RgbaImage, refs: ReferenceEntry[], topN = 3): SlotResult[] {
  return detectOpponentTiles(img).map((box) => ({
    box,
    candidates: matchTile(computeDescriptor(cropImage(img, box)), refs, topN),
  }));
}
