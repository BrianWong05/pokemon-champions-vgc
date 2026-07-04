// Usage: npx tsx scripts/hp-accuracy.ts            (Node/pngjs pixels)
//        npx tsx scripts/hp-accuracy.ts --browser  (canvas-decoded fixtures)
import * as fs from 'fs';
import * as path from 'path';
import { sweep, loadPng, resolveGoldenPng, type GoldenFile } from './hp-accuracy-core';

const browser = process.argv.includes('--browser');
const dir = path.resolve(browser ? 'training/hp-fixtures' : 'training/screenshots');
if (browser && !fs.existsSync(dir)) {
  console.error('No fixtures — run: python3 scripts/capture-browser-fixtures.py');
  process.exit(2);
}
const golden: GoldenFile = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8'));
// Browser fixtures are captured on demand and lag the golden set, so scope the
// browser run to screenshots that actually have one (mirrors the floor test)
// instead of crashing on the first missing capture.
const scoped: GoldenFile = browser
  ? Object.fromEntries(Object.entries(golden).filter(([n]) => fs.existsSync(path.join(dir, n))))
  : golden;
const skipped = Object.keys(golden).length - Object.keys(scoped).length;
const summary = sweep(scoped, (n) =>
  // browser: captured canvas pixels; node: native PNGs load directly, jpg/heic keys reconvert from the tracked raw source.
  browser ? loadPng(path.join(dir, n)) : loadPng(resolveGoldenPng(n, dir)),
);

for (const r of summary.results) {
  const mark = r.expected == null ? '·' : r.got === r.expected ? '✓' : r.got == null ? '✗ miss' : '!! WRONG';
  console.log(`${mark}  ${r.screenshot} ${r.side}[${r.index}]  expected=${r.expected ?? '(unreadable)'} got=${r.got ?? '-'}`);
}
const pct = summary.readable ? Math.round((summary.read / summary.readable) * 100) : 0;
console.log(`\n[${browser ? 'browser' : 'node'}] recall ${summary.read}/${summary.readable} (${pct}%) · wrong ${summary.wrong}`);
if (browser && skipped > 0) {
  console.log(`(skipped ${skipped} screenshot(s) with no captured fixture — run: python3 scripts/capture-browser-fixtures.py)`);
}
process.exit(summary.wrong > 0 ? 1 : 0);
