/**
 * Interactive sprite-labeling tool — build an IN-DOMAIN training set for the
 * Phase 2 classifier by cropping sprite tiles from real Pokémon Champions
 * screenshots and labeling each crop with a pokemon.id.
 *
 * Usage (macOS):
 *   1. Put screenshots in:  training/screenshots/
 *      Supported inputs: png, jpg/jpeg, heic/heif, tif/tiff, bmp, gif, webp.
 *      Non-PNG files are converted with macOS sips into training/.converted-screenshots/.
 *   2. Run one of:
 *      - Auto-detect screen type:      npx tsx scripts/label-sprites.ts
 *      - Pre-battle/team-select only:  npx tsx scripts/label-sprites.ts team
 *      - In-battle HP-bar icons only:  npx tsx scripts/label-sprites.ts battle
 *   3. ACTIVE LEARNING: each crop is pre-labeled with the descriptor matcher's
 *      top-3 guesses and crops are presented least-confident FIRST. At the prompt:
 *        Enter        accept the top suggestion
 *        a / b / c    pick suggestion 1/2/3 (tags may follow, e.g. "a shiny")
 *        <id> [tags]  type the correct national-dex id (forms are >= 10000)
 *        s            skip this crop        q  quit
 *      Corrections (typed ids) are the highest-value training data — they're the
 *      cases the current recognizer got wrong.
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
import Database from 'better-sqlite3';
import { cropImage } from '../src/features/scan/segmentation';
import { computeDescriptor } from '../src/features/scan/fingerprint';
import { matchTile } from '../src/features/scan/match';
import { parseReferenceMap } from '../src/features/scan/referenceData';
import { detectLabelCrops } from './label-sprites-core';
import { listSupportedScreenshotNames, resolveScreenshotInput, SUPPORTED_IMAGE_EXTENSIONS } from './image-inputs';
import type { LabelMode, RequestedMode } from './label-sprites-core';
import type { Candidate, ReferenceEntry, RgbaImage } from '../src/features/scan/types';

const SHOTS = path.resolve('training/screenshots');
const OUT = path.resolve('public/images/pokemon/menu-sprites');

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

function sanitizeTag(tag: string): string {
  return tag.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

// --- Active-learning helpers: suggest labels with the current descriptor matcher ---

const LOW_CONFIDENCE = 0.8; // descriptor scores below this get a ⚠ marker

function loadReferences(): ReferenceEntry[] {
  try {
    const raw = fs.readFileSync(path.resolve('public/images/pokemon/reference-descriptors.json'), 'utf8');
    return parseReferenceMap(JSON.parse(raw));
  } catch {
    console.log('(no reference-descriptors.json — run generate-sprite-descriptors.ts to enable suggestions)');
    return [];
  }
}

function loadNames(): Map<number, string> {
  const names = new Map<number, string>();
  try {
    const db = new Database(path.resolve('vgc_pokemon.db'), { readonly: true });
    for (const row of db.prepare('SELECT id, name_en FROM pokemon').all() as Array<{ id: number; name_en: string | null }>) {
      if (row.name_en) names.set(row.id, row.name_en);
    }
    db.close();
  } catch {
    // names are a nicety; suggestions still work without the DB
  }
  return names;
}

function formatSuggestions(sugg: Candidate[], names: Map<number, string>): string {
  return sugg
    .map((c, k) => `[${'abc'[k]}] ${c.id} ${names.get(c.id) ?? '?'} ${Math.round(c.score * 100)}%`)
    .join(' · ');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

async function main() {
  if (!fs.existsSync(SHOTS)) {
    fs.mkdirSync(SHOTS, { recursive: true });
    console.log(`Created ${SHOTS}\nPut Champions screenshots there and re-run.`);
    rl.close();
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const processed: Record<LabelMode, Set<string>> = {
    team: loadProcessed(MODE_CONFIG.team.processedFile),
    battle: loadProcessed(MODE_CONFIG.battle.processedFile),
  };
  const all = listSupportedScreenshotNames(fs.readdirSync(SHOTS), []);
  const selected = listSupportedScreenshotNames(all, OPTIONS.fileFilters);
  if (all.length === 0) {
    console.log(`No supported screenshots found in ${SHOTS}.`);
    console.log(`Supported: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}`);
    rl.close();
    return;
  }
  if (selected.length === 0) {
    console.log(`No PNG screenshots matched: ${OPTIONS.fileFilters.join(', ')}`);
    rl.close();
    return;
  }
  console.log(`${selected.length} selected screenshot(s); mode: ${OPTIONS.requestedMode}.`);

  const refs = loadReferences();
  const names = loadNames();

  let saved = 0;
  let skipped = 0;
  let attempted = 0;
  let accepted = 0;
  let corrected = 0;
  outer: for (const f of selected) {
    const input = resolveScreenshotInput(SHOTS, f);
    if (input.converted) {
      console.log(`  Converted ${input.name} -> ${path.relative(process.cwd(), input.pngPath)}`);
    }
    const img = readPng(input.pngPath);
    const { mode, boxes: tiles } = detectLabelCrops(img, OPTIONS.requestedMode);
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
    // Active learning: suggest labels for every crop, then present the LEAST
    // confident crops first — labeling effort goes where the recognizer is weakest.
    const items = tiles.map((box, i) => {
      const crop = cropImage(img, box);
      const sugg: Candidate[] = refs.length > 0 ? matchTile(computeDescriptor(crop), refs, 3) : [];
      return { i, crop, sugg };
    });
    items.sort((a, b) => (a.sugg[0]?.score ?? 0) - (b.sugg[0]?.score ?? 0));

    for (let n = 0; n < items.length; n++) {
      const { i, crop, sugg } = items[n];
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
      const conf = sugg[0]?.score ?? 0;
      const marker = sugg.length > 0 && conf < LOW_CONFIDENCE ? ' ⚠' : '';
      if (sugg.length > 0) console.log(`  ${config.cropLabel} ${n + 1}/${items.length}${marker}  ${formatSuggestions(sugg, names)}`);
      const ans = (await ask(
        sugg.length > 0
          ? '    label (Enter=a, a/b/c, <id> [tags], s=skip, q=quit): '
          : `  ${config.cropLabel} ${n + 1}/${items.length} — pokemon id (tags after a space; s=skip, q=quit): `,
      )).trim();
      if (ans.toLowerCase() === 'q') break outer;
      if (ans.toLowerCase() === 's' || (ans === '' && sugg.length === 0)) continue;

      // Resolve the chosen id: Enter/a/b/c accept a suggestion; digits are an explicit id.
      let id: string;
      let tagParts: string[];
      const parts = ans.split(/\s+/).filter(Boolean);
      const pick = ans === '' ? 0 : parts[0]?.length === 1 ? 'abc'.indexOf(parts[0].toLowerCase()) : -1;
      if (ans === '' || pick >= 0) {
        const chosen = sugg[ans === '' ? 0 : pick];
        if (!chosen) continue;
        id = String(chosen.id);
        tagParts = ans === '' ? [] : parts.slice(1);
        accepted++;
      } else {
        [id, ...tagParts] = parts;
        if (!/^\d+$/.test(id)) continue;
        if (sugg.length > 0 && Number(id) !== sugg[0].id) corrected++;
      }
      console.log(`    → ${id} ${names.get(Number(id)) ?? ''}`);
      // Optional variant tags (e.g. "6 shiny" -> 6_shiny_...). Battle mode
      // automatically adds "battle". The id is still the part before the first
      // underscore, so all variants fold into that id's reference list.
      const tags = [...new Set([...config.autoTags, ...tagParts.map(sanitizeTag)].filter(Boolean))];
      const prefix = tags.length > 0 ? `${id}_${tags.join('_')}` : id;
      writePng(crop, path.join(OUT, `${prefix}_${path.basename(f, path.extname(f))}_${i}.png`));
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
  console.log(`\nDone. Saved ${saved} labeled crop(s) to ${OUT} (${accepted} accepted suggestions, ${corrected} corrections).`);
  if (corrected > 0) console.log('Corrections are gold — retrain/regenerate so the recognizer learns them.');
  console.log('Next: npx tsx scripts/generate-sprite-descriptors.ts  (to fold them into the reference set)');
}

main();
