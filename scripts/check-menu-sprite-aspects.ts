// scripts/check-menu-sprite-aspects.ts
// Data guard: every training crop must be square-ish (sprite crops), never a
// whole-card crop. Run after (re)labeling: npx tsx scripts/check-menu-sprite-aspects.ts
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

const dir = path.resolve('training/menu-sprites');
let bad = 0;
let total = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const ar = png.width / png.height;
  total++;
  if (ar > 1.5 || ar < 0.67) {
    console.log(`WIDE: ${f}  ${png.width}x${png.height}`);
    bad++;
  }
}
console.log(bad === 0 ? `OK: all ${total} crops square-ish` : `${bad} bad crop(s) of ${total}`);
process.exit(bad === 0 ? 0 : 1);
