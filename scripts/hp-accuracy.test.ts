import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, resolveGoldenPng, type GoldenFile } from './hp-accuracy-core';

// The floor documents reality; the spec target (0.8) stays the goal. It has
// moved DOWN as the golden set grew with hard compressed-video captures
// (0.45 → 0.40 → 0.35; now 112 plates, node 38%). jpg-derived frames were long
// invisible to BOTH the sweep and the template builder (converted PNGs live
// outside screenshots/); once wired in via resolveGoldenPng they load and mostly
// miss — dilution, not regression. The invariant that never bends is wrong === 0
// — recall dilutes when harder examples are added, but a wrong read is always a
// regression. The CNN reader (see hp-reader/) is the path back above 0.8.
// 2026-07-04: side-aware decoding (opponent=percent, player=fraction) jumped
// node 38%→60% / browser 55% with wrong still 0 — the format constraint replaces
// the bar's fraction-vs-percent guard, so no-bar opponent percents now read.
const RECALL_FLOOR = 0.5;

const golden: GoldenFile = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8'));

// Node run: resolveGoldenPng loads tracked native PNGs directly and reconverts
// jpg/heic keys from their tracked raw source on demand. Browser run: only the
// keys with a captured fixture; browser pixels have no raw-source fallback, so
// uncaptured frames are out of scope.
const runNode = (dir: string) => sweep(golden, (n) => loadPng(resolveGoldenPng(n, dir)));

const runBrowser = (dir: string) => {
  const captured: GoldenFile = Object.fromEntries(
    Object.entries(golden).filter(([n]) => fs.existsSync(path.join(dir, n))),
  );
  return sweep(captured, (n) => loadPng(path.join(dir, n)));
};

describe('HP reader golden floor', () => {
  it.skipIf(!fs.existsSync('training/screenshots/Xnip2026-07-04_05-01-48.jpg'))(
    'reads the July 4 compressed battle frame with visible HP text',
    () => {
      const key = 'Xnip2026-07-04_05-01-48_jpg.png';
      const focused: GoldenFile = {
        [key]: {
          opponent: ['100%', '26%'],
          player: ['177/177', '143/177'],
        },
      };
      const s = sweep(focused, (n) => loadPng(resolveGoldenPng(n, 'training/screenshots')));

      expect(s.results.map((r) => r.got)).toEqual(['100%', '26%', '177/177', '143/177']);
      expect(s.wrong).toBe(0);
    },
    600_000,
  );

  it.skipIf(!fs.existsSync('training/screenshots/Xnip2026-07-04_00-43-26.jpg'))(
    'prefers the fuller read over a leading-digit-drop phantom (73%, not the equally-cheap 3%)',
    () => {
      // opponent1 decodes "73%" and "3%" (leading "7" dropped) at the same cost;
      // the bar (~50%) can't arbitrate. The tie-break must keep the fuller read.
      const key = 'Xnip2026-07-04_00-43-26_jpg.png';
      const focused: GoldenFile = {
        [key]: { opponent: ['73%', '48%'], player: ['34/177', '202/202'] },
      };
      const s = sweep(focused, (n) => loadPng(resolveGoldenPng(n, 'training/screenshots')));
      const opp0 = s.results.find((r) => r.side === 'opponent' && r.index === 0);
      expect(opp0?.got).toBe('73%');
      expect(s.wrong).toBe(0);
    },
    600_000,
  );

  it.skipIf(!fs.existsSync('training/screenshots/Xnip2026-07-04_00-43-26.jpg'))(
    'side constraint reads a bar-less opponent percent (opponent=percent, no bar required)',
    () => {
      // opponent2 (48%) has NO measurable bar, so the old "percent requires a
      // bar" gate blanked it. A known-opponent panel is always a percent, so the
      // format constraint replaces that guard and it reads — without any player
      // fraction being able to masquerade as a percent (wrong stays 0).
      const key = 'Xnip2026-07-04_00-43-26_jpg.png';
      const focused: GoldenFile = {
        [key]: { opponent: ['73%', '48%'], player: ['34/177', '202/202'] },
      };
      const s = sweep(focused, (n) => loadPng(resolveGoldenPng(n, 'training/screenshots')));
      const opp = s.results.filter((r) => r.side === 'opponent').map((r) => r.got);
      expect(opp).toEqual(['73%', '48%']);
      expect(s.wrong).toBe(0);
    },
    600_000,
  );

  it('node pixels: zero wrong reads, recall above floor', () => {
    const s = runNode('training/screenshots');
    expect(s.wrong).toBe(0);
    expect(s.read / s.readable).toBeGreaterThanOrEqual(RECALL_FLOOR);
  }, 600_000);

  it.skipIf(!fs.existsSync('training/hp-fixtures'))('browser pixels: zero wrong reads, recall above floor', () => {
    const s = runBrowser('training/hp-fixtures');
    expect(s.wrong).toBe(0);
    expect(s.read / s.readable).toBeGreaterThanOrEqual(RECALL_FLOOR);
  }, 600_000);
});
