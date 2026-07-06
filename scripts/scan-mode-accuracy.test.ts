// scripts/scan-mode-accuracy.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { loadPng, resolveGoldenPng } from './hp-accuracy-core';
import { scanSweep, type ScanGoldenFile } from './scan-accuracy-core';

// The invariant that never bends: zero wrong MODES outside knownMiss.
// (Plate-count recall is reported by the CLI, not gated here — see spec.)
const golden: ScanGoldenFile = JSON.parse(fs.readFileSync('training/scan-golden.json', 'utf8'));

describe('scan-mode golden floor', () => {
  it('zero wrong modes outside knownMiss', () => {
    const rows = scanSweep(golden, (f) => loadPng(resolveGoldenPng(f, 'training/screenshots')));
    const wrong = rows.filter((r) => !r.modeOk && !r.knownMiss);
    expect(wrong.map((r) => `${r.file}: ${r.mode} (expected ${r.expectedMode})`)).toEqual([]);
  }, 600_000);
});
