// Vendor the ONNX Runtime Web WASM assets into public/ort so the app can serve
// them locally (classifier.ts points ort.env.wasm.wasmPaths at /ort/). These
// files are ~40MB, reproducible from node_modules, and therefore gitignored —
// run `npm run vendor:ort` after install (wired into predev/prebuild) instead
// of committing them.
import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dest = join(root, 'public', 'ort');

// The exact runtime set the app loads (single-threaded SIMD build + jsep).
const FILES = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
];

if (!existsSync(src)) {
  console.error(`onnxruntime-web not installed at ${src} — run npm install first.`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
let copied = 0;
for (const f of FILES) {
  const from = join(src, f);
  if (!existsSync(from)) {
    console.error(`missing ${f} in onnxruntime-web/dist — version mismatch?`);
    process.exit(1);
  }
  const to = join(dest, f);
  // Skip unchanged files so predev/prebuild stays fast.
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
  copied++;
}
console.log(`vendor:ort -> public/ort (${copied} file(s) updated, ${FILES.length} total)`);
