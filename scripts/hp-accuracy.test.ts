import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, type GoldenFile } from './hp-accuracy-core';

// Raise the floor as accuracy improves; never lower it to make a change pass.
// (Spec target is 0.8 — current tuned state reads 50%/53% node/browser with
// zero wrong; the floor documents reality, the target stays the goal.)
const RECALL_FLOOR = 0.45;

const golden: GoldenFile = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8'));
const run = (dir: string) => sweep(golden, (n) => loadPng(path.join(dir, n)));

describe('HP reader golden floor', () => {
  it('node pixels: zero wrong reads, recall above floor', () => {
    const s = run('training/screenshots');
    expect(s.wrong).toBe(0);
    expect(s.read / s.readable).toBeGreaterThanOrEqual(RECALL_FLOOR);
  }, 600_000);

  it.skipIf(!fs.existsSync('training/hp-fixtures'))('browser pixels: zero wrong reads, recall above floor', () => {
    const s = run('training/hp-fixtures');
    expect(s.wrong).toBe(0);
    expect(s.read / s.readable).toBeGreaterThanOrEqual(RECALL_FLOOR);
  }, 600_000);
});
