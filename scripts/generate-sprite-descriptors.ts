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

export function generateDescriptors(srcDir: string): Record<string, Descriptor> {
  const out: Record<string, Descriptor> = {};
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.endsWith('.png')) continue;
    const id = path.basename(f, '.png');
    if (!/^\d+$/.test(id)) continue;
    try { out[id] = computeDescriptor(readPng(path.join(srcDir, f))); }
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
  console.log(`Wrote ${Object.keys(out).length} descriptors to ${outFile}`);
}
