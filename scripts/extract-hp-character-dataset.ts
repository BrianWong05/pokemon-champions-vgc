import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import type { RgbaImage, ScanSide } from '../src/features/scan/types';
import { battleView, loadPng, type GoldenFile } from './hp-accuracy-core';
import {
  HP_DATASET_CLASSES,
  samplesFromPanel,
  type ExtractedHpCharacterSample,
} from './hp-character-dataset-core';

export interface ExtractDatasetOptions {
  goldenPath: string;
  sourceDirs: string[];
  outDir: string;
  classesPath: string;
  clean: boolean;
}

export interface ExtractDatasetSummary {
  readablePlates: number;
  written: number;
  skipped: number;
  skipReasons: string[];
}

const DEFAULT_OPTIONS: ExtractDatasetOptions = {
  goldenPath: 'training/hp-golden.json',
  sourceDirs: ['training/screenshots', 'training/hp-fixtures'],
  outDir: 'hp-reader/dataset',
  classesPath: 'hp-reader/models/classes.json',
  clean: false,
};

function safeStem(name: string): string {
  return path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9_-]+/g, '_');
}

export function sampleFilename(
  screenshot: string,
  sourceName: string,
  side: ScanSide,
  plateIndex: number,
  sample: ExtractedHpCharacterSample,
): string {
  const index = String(sample.charIndex).padStart(2, '0');
  return `${safeStem(screenshot)}__${safeStem(sourceName)}__${side}${plateIndex + 1}__${index}__${sample.className}.png`;
}

export function writeRgbaPng(img: RgbaImage, file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

export function writeClassesJson(file = DEFAULT_OPTIONS.classesPath): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(HP_DATASET_CLASSES.map((entry) => entry.char), null, 2)}\n`);
}

function ensureClassDirs(outDir: string): void {
  for (const entry of HP_DATASET_CLASSES) {
    fs.mkdirSync(path.join(outDir, entry.className), { recursive: true });
  }
}

export function extractDataset(options: Partial<ExtractDatasetOptions> = {}): ExtractDatasetSummary {
  const resolved: ExtractDatasetOptions = { ...DEFAULT_OPTIONS, ...options };
  const golden: GoldenFile = JSON.parse(fs.readFileSync(resolved.goldenPath, 'utf8'));
  const sourceDirs = resolved.sourceDirs.filter((dir) => fs.existsSync(dir));
  const summary: ExtractDatasetSummary = { readablePlates: 0, written: 0, skipped: 0, skipReasons: [] };

  if (resolved.clean) fs.rmSync(resolved.outDir, { recursive: true, force: true });
  ensureClassDirs(resolved.outDir);
  writeClassesJson(resolved.classesPath);

  for (const sourceDir of sourceDirs) {
    const sourceName = path.basename(sourceDir);
    for (const [screenshot, entry] of Object.entries(golden)) {
      const file = path.join(sourceDir, screenshot);
      if (!fs.existsSync(file)) continue;
      const img = battleView(loadPng(file));

      for (const side of ['opponent', 'player'] as const) {
        const panels = detectBattlePanels(img, side);
        entry[side].forEach((expected, plateIndex) => {
          if (expected == null) return;
          summary.readablePlates++;
          const panel = panels[plateIndex];
          if (!panel) {
            summary.skipped++;
            summary.skipReasons.push(`${sourceName}/${screenshot} ${side}${plateIndex + 1}: panel not detected`);
            return;
          }

          const result = samplesFromPanel(img, panel, expected);
          if (result.skipped || result.samples.length === 0) {
            summary.skipped++;
            summary.skipReasons.push(
              `${sourceName}/${screenshot} ${side}${plateIndex + 1} "${expected}": ${result.reason ?? 'no samples'}`,
            );
            return;
          }

          for (const sample of result.samples) {
            const fileName = sampleFilename(screenshot, sourceName, side, plateIndex, sample);
            writeRgbaPng(sample.image, path.join(resolved.outDir, sample.className, fileName));
            summary.written++;
          }
        });
      }
    }
  }

  return summary;
}

export function parseArgs(argv: string[]): ExtractDatasetOptions {
  const parsed: ExtractDatasetOptions = { ...DEFAULT_OPTIONS, sourceDirs: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--clean') {
      parsed.clean = true;
    } else if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory');
      parsed.outDir = value;
    } else if (arg === '--golden') {
      const value = argv[++i];
      if (!value) throw new Error('--golden requires a JSON path');
      parsed.goldenPath = value;
    } else if (arg === '--classes') {
      const value = argv[++i];
      if (!value) throw new Error('--classes requires a JSON path');
      parsed.classesPath = value;
    } else {
      parsed.sourceDirs.push(arg);
    }
  }
  if (parsed.sourceDirs.length === 0) parsed.sourceDirs = [...DEFAULT_OPTIONS.sourceDirs];
  return parsed;
}

if (require.main === module) {
  const summary = extractDataset(parseArgs(process.argv.slice(2)));
  console.log(
    `HP character dataset: ${summary.written} sample(s) from ${summary.readablePlates} readable plate(s); skipped ${summary.skipped}.`,
  );
  for (const reason of summary.skipReasons.slice(0, 30)) console.log(`  skip ${reason}`);
  if (summary.skipReasons.length > 30) console.log(`  ... ${summary.skipReasons.length - 30} more skip(s)`);
}
