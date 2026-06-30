// scripts/generate-sprite-descriptors.ts
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import type { Descriptor, RgbaImage } from '../src/features/scan/types';

export function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

// Reference sprite files follow `<id>[_<variant>].png` (e.g. `25.png`, `25_shiny.png`,
// `25_battle1.png`). The id is the part of the filename before the first underscore.
// Multiple files may share an id (normal + shiny + extra captures); their descriptors
// are grouped into an array under that id.
export function generateDescriptors(srcDir: string): Record<string, Descriptor[]> {
  const out: Record<string, Descriptor[]> = {};
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.endsWith('.png')) continue;
    const id = path.basename(f, '.png').split('_')[0];
    if (!/^\d+$/.test(id)) continue;
    try {
      const descriptor = computeDescriptor(readPng(path.join(srcDir, f)));
      (out[id] ??= []).push(descriptor);
    }
    catch (e) { console.warn(`skip ${f}: ${(e as Error).message}`); }
  }
  return out;
}

// CLI: npx tsx scripts/generate-sprite-descriptors.ts
if (process.argv[1] && process.argv[1].endsWith('generate-sprite-descriptors.ts')) {
  const src = path.resolve('public/images/pokemon/menu-sprites');
  const outFile = path.resolve('public/images/pokemon/reference-descriptors.json');
  const out = generateDescriptors(src);
  fs.writeFileSync(outFile, JSON.stringify(out));
  const idCount = Object.keys(out).length;
  const descriptorCount = Object.values(out).reduce((sum, ds) => sum + ds.length, 0);
  console.log(`Wrote ${descriptorCount} descriptors for ${idCount} ids to ${outFile}`);
}
