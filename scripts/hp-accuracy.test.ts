import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, type GoldenFile } from './hp-accuracy-core';

// The floor documents reality; the spec target (0.8) stays the goal. It has
// moved DOWN as the golden set grew with hard compressed-video captures
// (0.45 → 0.40 → 0.35; now 56 plates, node 38%). The last drop is honesty, not
// regression: four jpg-derived frames used to CRASH the sweep (converted PNGs
// live outside screenshots/) so they were silently excluded — now they load and
// mostly miss. The invariant that never bends is wrong === 0 — recall dilutes
// when harder examples are added, but a wrong read is always a regression. The
// CNN reader (see hp-reader/) is the path back above 0.8.
const RECALL_FLOOR = 0.35;

const golden: GoldenFile = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8'));
const CONVERTED = 'training/.converted-screenshots';

// Node run: resolve every key from `dir`, falling back to the converted-jpg dir
// (where add:hp-golden writes jpg/heic conversions — they never land in
// screenshots/). Browser run: only the keys with a captured fixture; there is no
// converted fallback for browser pixels, so uncaptured frames are out of scope.
const runNode = (dir: string) =>
  sweep(golden, (n) => {
    const primary = path.join(dir, n);
    return loadPng(fs.existsSync(primary) ? primary : path.join(CONVERTED, n));
  });

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
