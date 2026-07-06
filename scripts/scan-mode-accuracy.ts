// scripts/scan-mode-accuracy.ts
// Golden sweep for scan-mode detection. Run: npx tsx scripts/scan-mode-accuracy.ts
import * as fs from 'fs';
import { loadPng, resolveGoldenPng } from './hp-accuracy-core';
import { scanSweep, type ScanGoldenFile } from './scan-accuracy-core';

const golden: ScanGoldenFile = JSON.parse(fs.readFileSync('training/scan-golden.json', 'utf8'));
const rows = scanSweep(golden, (f) => loadPng(resolveGoldenPng(f, 'training/screenshots')));

for (const r of rows) {
  const flag = r.modeOk ? (r.platesOk ? 'ok    ' : 'PLATES') : r.knownMiss ? 'MISS* ' : 'WRONG ';
  console.log(`${flag} ${r.file}  mode ${r.mode}/${r.expectedMode}  opp ${r.opp}/${r.expectedOpp}  player ${r.player}/${r.expectedPlayer}`);
}
const wrong = rows.filter((r) => !r.modeOk && !r.knownMiss);
const missed = rows.filter((r) => !r.modeOk && r.knownMiss);
const plates = rows.filter((r) => r.modeOk && !r.platesOk);
console.log(`\n${rows.length} frames — wrong modes ${wrong.length}, knownMiss ${missed.length}, plate mismatches ${plates.length}`);
process.exitCode = wrong.length ? 1 : 0;
