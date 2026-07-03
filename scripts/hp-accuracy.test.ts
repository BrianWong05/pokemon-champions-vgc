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
const RECALL_FLOOR = 0.35;

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
