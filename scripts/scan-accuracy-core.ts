// scripts/scan-accuracy-core.ts
// Shared by the scan-mode CLI and the floor test — mirrors hp-accuracy-core's
// split so the two never drift.
import { detectScanTargets } from '../src/features/scan/scanTargets';
import type { RgbaImage } from '../src/features/scan/types';

export interface ScanGoldenEntry {
  file: string;
  mode: 'battle' | 'team';
  opponentPlates: number;
  playerPlates: number;
  /** Reason string. Excluded from the zero-wrong-modes floor, still reported. */
  knownMiss?: string;
}
export interface ScanGoldenFile { entries: ScanGoldenEntry[] }

export interface ScanSweepRow {
  file: string;
  expectedMode: string; mode: string; modeOk: boolean;
  expectedOpp: number; opp: number;
  expectedPlayer: number; player: number;
  platesOk: boolean;
  knownMiss: boolean;
}

export function scanSweep(golden: ScanGoldenFile, load: (file: string) => RgbaImage): ScanSweepRow[] {
  return golden.entries.map((e) => {
    const det = detectScanTargets(load(e.file));
    const opp = det.targets.filter((t) => t.side === 'opponent').length;
    const player = det.targets.filter((t) => t.side === 'player').length;
    return {
      file: e.file,
      expectedMode: e.mode, mode: det.mode, modeOk: det.mode === e.mode,
      expectedOpp: e.opponentPlates, opp,
      expectedPlayer: e.playerPlates, player,
      // plate counts are REPORTED for battle frames, not floor-gated
      platesOk: e.mode !== 'battle' || (opp === e.opponentPlates && player === e.playerPlates),
      knownMiss: e.knownMiss != null,
    };
  });
}
