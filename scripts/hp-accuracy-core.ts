// Golden-set sweep for the HP reader: runs the FULL production path
// (panel detection + game-rect fallback + readHpFromPanel) over ground-truth
// plates and reports recall / wrong-reads. The injectable loader lets the
// same sweep run over training/screenshots (pngjs pixels) or
// training/hp-fixtures (browser canvas pixels re-encoded losslessly as PNG).
import * as fs from 'fs';
import { PNG } from 'pngjs';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import { inferGameRect } from '../src/features/scan/gameRect';
import { cropImage } from '../src/features/scan/segmentation';
import { readHpFromPanel, type HpReading } from '../src/features/scan/hpText';
import type { RgbaImage } from '../src/features/scan/types';

export type GoldenFile = Record<string, { opponent: (string | null)[]; player: (string | null)[] }>;

export interface PlateResult {
  screenshot: string;
  side: 'opponent' | 'player';
  index: number;
  expected: string | null;
  got: string | null;
}

export interface SweepSummary {
  results: PlateResult[];
  readable: number;
  read: number;
  wrong: number;
}

export function loadPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

export function readingToString(r: HpReading | null): string | null {
  if (!r) return null;
  return r.current != null && r.max != null ? `${r.current}/${r.max}` : `${r.percent}%`;
}

// Framed captures (browser/video frames) need the inferred game rect before
// panel detection works — mirror of the app pipeline's fallback.
export function battleView(img: RgbaImage): RgbaImage {
  if (detectBattlePanels(img, 'opponent').length === 2) return img;
  const rect = inferGameRect(img);
  if (!rect) return img;
  const sub = cropImage(img, rect);
  return detectBattlePanels(sub, 'opponent').length === 2 ? sub : img;
}

export function sweep(golden: GoldenFile, load: (name: string) => RgbaImage): SweepSummary {
  const results: PlateResult[] = [];
  for (const [name, entry] of Object.entries(golden)) {
    const img = battleView(load(name));
    for (const side of ['opponent', 'player'] as const) {
      const expected = entry[side];
      const panels = detectBattlePanels(img, side);
      if (panels.length !== expected.length) {
        throw new Error(
          `${name} ${side}: detected ${panels.length} panels but golden lists ${expected.length} — update training/hp-golden.json`,
        );
      }
      panels.forEach((panel, i) => {
        results.push({
          screenshot: name,
          side,
          index: i,
          expected: expected[i],
          got: readingToString(readHpFromPanel(img, panel)),
        });
      });
    }
  }
  const readable = results.filter((r) => r.expected != null);
  return {
    results,
    readable: readable.length,
    read: readable.filter((r) => r.got === r.expected).length,
    wrong: readable.filter((r) => r.got != null && r.got !== r.expected).length,
  };
}
