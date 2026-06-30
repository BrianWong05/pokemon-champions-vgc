/**
 * Interactive sprite-labeling tool — build an IN-DOMAIN training set for the
 * Phase 2 classifier by cropping sprite tiles from real Pokémon Champions
 * screenshots and labeling each crop with a pokemon.id.
 *
 * Usage (macOS):
 *   1. Put screenshots in:  training/screenshots/*.png
 *   2. Run one of:
 *      - Auto-detect screen type:      npx tsx scripts/label-sprites.ts
 *      - Pre-battle/team-select only:  npx tsx scripts/label-sprites.ts team
 *      - In-battle HP-bar icons only:  npx tsx scripts/label-sprites.ts battle
 *   3. For each cropped tile it opens a Preview window and asks for the id.
 *      Type the national-dex id (forms are >= 10000), Enter to skip, q to quit.
 *
 * Output: public/images/pokemon/menu-sprites/<id>_<screenshot>_<n>.png — these
 * fold into that id's reference list (multi-image-per-id). After labeling, run
 *   npx tsx scripts/generate-sprite-descriptors.ts
 * to rebuild reference-descriptors.json so the scan uses the new references.
 *
 * Reuses the app's own segmentation so the crops match what inference sees.
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import { connectedComponents, cropImage, detectOpponentTiles } from '../src/features/scan/segmentation';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

const SHOTS = path.resolve('training/screenshots');
const OUT = path.resolve('public/images/pokemon/menu-sprites');

type LabelMode = 'team' | 'battle';
type RequestedMode = 'auto' | LabelMode;

interface RunOptions {
  requestedMode: RequestedMode;
  fileFilters: string[];
}

function parseArgs(): RunOptions {
  let requestedMode: RequestedMode = 'auto';
  const fileFilters: string[] = [];

  for (const arg of process.argv.slice(2)) {
    const normalized = arg.replace(/^--/, '').toLowerCase();
    if (['auto', 'detect', 'mode=auto'].includes(normalized)) {
      requestedMode = 'auto';
      continue;
    }
    if (['battle', 'in-battle', 'inbattle', 'mode=battle'].includes(normalized)) {
      requestedMode = 'battle';
      continue;
    }
    if (['team', 'pre-battle', 'prebattle', 'selection', 'mode=team'].includes(normalized)) {
      requestedMode = 'team';
      continue;
    }
    fileFilters.push(arg);
  }

  return { requestedMode, fileFilters };
}

const OPTIONS = parseArgs();

const MODE_CONFIG: Record<LabelMode, {
  previewFile: string;
  processedFile: string;
  autoTags: string[];
  cropLabel: string;
}> = {
  team: {
    previewFile: path.resolve('training/.preview.png'),
    processedFile: path.resolve('training/.processed.json'),
    autoTags: [],
    cropLabel: 'tile',
  },
  battle: {
    previewFile: path.resolve('training/.preview.battle.png'),
    processedFile: path.resolve('training/.processed.battle.json'),
    autoTags: ['battle'],
    cropLabel: 'battle icon',
  },
};

function readPng(file: string): RgbaImage {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

function writePng(img: RgbaImage, file: string): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

// Track which screenshots have been fully labeled so re-runs only handle new ones.
function loadProcessed(file: string): Set<string> {
  try {
    return new Set<string>(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return new Set();
  }
}
function saveProcessed(file: string, done: Set<string>): void {
  fs.writeFileSync(file, JSON.stringify([...done], null, 2));
}

function detectTiles(img: RgbaImage): TileBox[] {
  return detectOpponentTiles(img);
}

function battleHpMask(img: RgbaImage): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  const minX = Math.floor(img.width * 0.45);
  const maxY = Math.floor(img.height * 0.25);

  for (let y = 0; y < maxY; y++) {
    for (let x = minX; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      if (g > 150 && r < 140 && b < 140 && g > r + 50 && g > b + 40) {
        mask[y * img.width + x] = 1;
      }
    }
  }

  return mask;
}

function clampBox(box: TileBox, img: RgbaImage): TileBox {
  const x = Math.max(0, Math.min(img.width - 1, box.x));
  const y = Math.max(0, Math.min(img.height - 1, box.y));
  return {
    x,
    y,
    w: Math.max(1, Math.min(box.w, img.width - x)),
    h: Math.max(1, Math.min(box.h, img.height - y)),
  };
}

function battleIconFromHpBar(bar: TileBox, img: RgbaImage): TileBox {
  const iconW = Math.round(bar.w * 0.6);
  const iconH = Math.round(bar.w * 0.54);
  const gap = Math.round(bar.w * 0.02);
  return clampBox({
    x: bar.x - iconW - gap,
    y: bar.y - Math.round(iconH * 0.7),
    w: iconW,
    h: iconH,
  }, img);
}

function detectBattleIcons(img: RgbaImage): TileBox[] {
  const minArea = Math.max(80, Math.floor(img.width * img.height * 0.00035));
  const hpBars = connectedComponents(battleHpMask(img), img.width, img.height, minArea)
    .filter((b) =>
      b.x > img.width * 0.45 &&
      b.y < img.height * 0.25 &&
      b.w > img.width * 0.06 &&
      b.w < img.width * 0.2 &&
      b.h > img.height * 0.005 &&
      b.h < img.height * 0.04 &&
      b.w / b.h > 7
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 2);

  return hpBars.map((bar) => battleIconFromHpBar(bar, img));
}

function detectCrops(img: RgbaImage): { mode: LabelMode; boxes: TileBox[] } {
  if (OPTIONS.requestedMode === 'team') return { mode: 'team', boxes: detectTiles(img) };
  if (OPTIONS.requestedMode === 'battle') return { mode: 'battle', boxes: detectBattleIcons(img) };

  const teamBoxes = detectTiles(img);
  if (teamBoxes.length > 0) return { mode: 'team', boxes: teamBoxes };
  return { mode: 'battle', boxes: detectBattleIcons(img) };
}

function sanitizeTag(tag: string): string {
  return tag.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

async function main() {
  if (!fs.existsSync(SHOTS)) {
    fs.mkdirSync(SHOTS, { recursive: true });
    console.log(`Created ${SHOTS}\nPut Champions screenshots there (*.png) and re-run.`);
    rl.close();
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const processed: Record<LabelMode, Set<string>> = {
    team: loadProcessed(MODE_CONFIG.team.processedFile),
    battle: loadProcessed(MODE_CONFIG.battle.processedFile),
  };
  const all = fs.readdirSync(SHOTS).filter((f) => /\.png$/i.test(f));
  const selected = OPTIONS.fileFilters.length === 0
    ? all
    : all.filter((f) => OPTIONS.fileFilters.some((filter) => f.includes(filter)));
  if (all.length === 0) {
    console.log(`No PNG screenshots found in ${SHOTS}.`);
    rl.close();
    return;
  }
  if (selected.length === 0) {
    console.log(`No PNG screenshots matched: ${OPTIONS.fileFilters.join(', ')}`);
    rl.close();
    return;
  }
  console.log(`${selected.length} selected screenshot(s); mode: ${OPTIONS.requestedMode}.`);

  let saved = 0;
  let skipped = 0;
  let attempted = 0;
  outer: for (const f of selected) {
    const img = readPng(path.join(SHOTS, f));
    const { mode, boxes: tiles } = detectCrops(img);
    const config = MODE_CONFIG[mode];
    const done = processed[mode];

    if (done.has(f)) {
      skipped++;
      continue;
    }

    attempted++;
    console.log(`\n=== ${f}: ${mode} mode, detected ${tiles.length} ${config.cropLabel}(s) ===`);
    if (tiles.length === 0) {
      if (OPTIONS.requestedMode === 'battle' || mode === 'battle') {
        console.log('  No top-right in-battle HP-bar icons found.');
      } else {
        console.log('  No pre-battle red tiles found.');
      }
      continue;
    }
    for (let i = 0; i < tiles.length; i++) {
      const crop = cropImage(img, tiles[i]);
      writePng(crop, config.previewFile);
      if (process.env.LABEL_SPRITES_NO_OPEN === '1') {
        console.log(`  (preview written to ${config.previewFile})`);
      } else {
        try {
          execSync(`open "${config.previewFile}"`); // macOS Preview; on other OSes open the file manually
        } catch {
          console.log(`  (open ${config.previewFile} to view the crop)`);
        }
      }
      const ans = (await ask(`  ${config.cropLabel} ${i + 1}/${tiles.length} — pokemon id (add 'shiny' or a tag after a space; Enter=skip, q=quit): `)).trim();
      if (ans.toLowerCase() === 'q') break outer;
      const [id, ...tagParts] = ans.split(/\s+/);
      if (!/^\d+$/.test(id)) continue;
      // Optional variant tags (e.g. "6 shiny" -> 6_shiny_...). Battle mode
      // automatically adds "battle". The id is still the part before the first
      // underscore, so all variants fold into that id's reference list.
      const tags = [...new Set([...config.autoTags, ...tagParts.map(sanitizeTag)].filter(Boolean))];
      const prefix = tags.length > 0 ? `${id}_${tags.join('_')}` : id;
      writePng(crop, path.join(OUT, `${prefix}_${path.basename(f, '.png')}_${i}.png`));
      saved++;
    }
    // Mark this screenshot done only after its tiles are fully handled (a mid-run
    // quit leaves it unmarked so it's picked up next time).
    done.add(f);
    saveProcessed(config.processedFile, done);
  }

  for (const config of Object.values(MODE_CONFIG)) {
    if (fs.existsSync(config.previewFile)) fs.rmSync(config.previewFile);
  }
  rl.close();
  if (attempted === 0) {
    console.log(`No new screenshots to label — ${skipped} selected file(s) already labeled for their detected mode.`);
    console.log(`Delete ${MODE_CONFIG.team.processedFile} or ${MODE_CONFIG.battle.processedFile} to redo them.`);
  }
  console.log(`\nDone. Saved ${saved} labeled crop(s) to ${OUT}.`);
  console.log('Next: npx tsx scripts/generate-sprite-descriptors.ts  (to fold them into the reference set)');
}

main();
