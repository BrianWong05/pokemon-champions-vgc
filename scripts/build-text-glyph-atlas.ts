/**
 * Build the text glyph atlas from labeled golden moves-screenshots.
 *
 * Canvas shape-matching (textMatch.ts) has a measured noise floor from the
 * game-font vs render-font mismatch: confusable zh/ja move-name pairs lose
 * by ~0.02 margins (KNOWN_ISSUES in scripts/player-scan-accuracy.test.ts).
 * This builder generalizes the digit-template approach
 * (build-stat-glyph-templates.ts): segment each labeled ability/item/move
 * crop into per-character cells, label them with the known localized string,
 * and store the game's own glyph bitmaps. At scan time candidates are
 * COMPOSED from these glyphs (textMatch.ts's composeAtlasMask), so the
 * comparison is game-font vs game-font — also platform-font independent.
 *
 * EN is deliberately excluded: the proportional Latin font has touching
 * letters that column projection cannot segment reliably, and the EN gate is
 * already green with one approved exception.
 *
 * Usage: npx tsx scripts/build-text-glyph-atlas.ts
 * (reads training/player-golden.json + vgc_pokemon.db; writes
 *  src/features/scan/textGlyphAtlas.ts and prints a validation report used
 *  to calibrate ATLAS_ACCEPT)
 */
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { detectPlayerPanels } from '../src/features/scan/playerPanels';
import { whiteMask, MASK_THRESHOLDS, type BinMask } from '../src/features/scan/hpText';
import {
  stripRuleLines, stripLeadingIcon, inkBounds, segmentCells,
  parseAtlas, makeCellDecoder, matchTextAtlas, ATLAS_LINE_H,
  type AtlasGlyphData, type TextAtlas, type CellBlob,
} from '../src/features/scan/textMatch';
import { Generations } from '@smogon/calc';
import { MEGA_STONES } from '../src/features/pokemon/utils/items';
import type { ScanLang } from '../src/features/scan/playerTypes';
import { readPng } from './build-hp-glyph-templates';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

const GOLDEN_DIR = 'training/player-screens';
const TS_PATH = 'src/features/scan/textGlyphAtlas.ts';
// Must match textShapeAt's crop-side threshold so stroke weights agree.
const THRESHOLD = 0.72;

// Area-average a mask region to the atlas scale (binary: cell on when at
// least half covered).
function scaleRegion(mask: BinMask, box: TileBox, s: number): { w: number; h: number; bits: Uint8Array } {
  const w = Math.max(1, Math.round(box.w * s));
  const h = Math.max(1, Math.round(box.h * s));
  const bits = new Uint8Array(w * h);
  for (let gy = 0; gy < h; gy++) {
    for (let gx = 0; gx < w; gx++) {
      let on = 0, total = 0;
      const sy0 = box.y + (gy / h) * box.h, sy1 = box.y + ((gy + 1) / h) * box.h;
      const sx0 = box.x + (gx / w) * box.w, sx1 = box.x + ((gx + 1) / w) * box.w;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) {
        for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
          total++;
          if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.bits[y * mask.w + x]) on++;
        }
      }
      if (total > 0 && on / total >= 0.5) bits[gy * w + gx] = 1;
    }
  }
  return { w, h, bits };
}

function bitsToHex(bits: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    let nib = 0;
    for (let j = 0; j < 4; j++) nib = (nib << 1) | (i + j < bits.length ? bits[i + j] : 0);
    hex += nib.toString(16);
  }
  return hex;
}

export interface ExtractedGlyph extends AtlasGlyphData {
  nativeH: number;
  /** BUILD_THRESHOLDS index this glyph was masked at (0 = the scan-time 0.72). */
  tIdx: number;
}

// Crop-side matching always masks at THRESHOLD (textShapeAt), but a stroke
// that antialiases two characters together at 0.72 can separate at a stricter
// threshold — sweep like build-stat-glyph-templates.ts does and keep the
// first clean segmentation. The density-binned shape features tolerate the
// small stroke-weight difference.
const BUILD_THRESHOLDS = [THRESHOLD, 0.8, 0.88, 0.65];

export function extractFromCrop(
  img: RgbaImage, box: TileBox, label: string,
): { glyphs: ExtractedGlyph[]; pitch: number } | null {
  for (let i = 0; i < BUILD_THRESHOLDS.length; i++) {
    const res = extractAtThreshold(img, box, label, BUILD_THRESHOLDS[i], i);
    if (res) return res;
  }
  return null;
}

function extractAtThreshold(
  img: RgbaImage, box: TileBox, label: string, threshold: number, tIdx = 0,
): { glyphs: ExtractedGlyph[]; pitch: number } | null {
  const mask = stripRuleLines(whiteMask(img, box, threshold));
  const cut = stripLeadingIcon(mask);
  const b = inkBounds(mask, cut);
  if (!b) return null;
  const chars = [...label];
  const groups = segmentCells(mask, b, chars.length);
  if (!groups) return null;
  const s = ATLAS_LINE_H / b.h;
  const glyphs: ExtractedGlyph[] = [];
  for (let i = 0; i < groups.length; i++) {
    const { x0, x1 } = groups[i];
    let y0 = b.y + b.h, y1 = -1;
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = x0; x <= x1; x++) {
        if (mask.bits[y * mask.w + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
      }
    }
    if (y1 < 0) return null;
    const scaled = scaleRegion(mask, { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, s);
    glyphs.push({
      char: chars[i], w: scaled.w, h: scaled.h,
      yOff: Math.round((y0 - b.y) * s), hex: bitsToHex(scaled.bits), nativeH: b.h, tIdx,
    });
  }
  // Cell pitch of this row at atlas scale (the game font is monospaced).
  const pitch = ((groups[groups.length - 1].x1 - groups[0].x0 + 1) / chars.length) * s;
  return { glyphs, pitch };
}

interface CandidateEntry { key: string; label: string }
interface LabeledCrop {
  img: RgbaImage; box: TileBox; label: string; lang: ScanLang;
  desc: string; expectedKey: string;
  candidates: CandidateEntry[];
  /** Same entries in the other three languages (cross-language hijack probe). */
  otherLangs: CandidateEntry[][];
}

function main(): void {
  const golden = JSON.parse(fs.readFileSync('training/player-golden.json', 'utf8'));
  // Direct sqlite vocab (scan.repo pulls the app's sql.js DB layer, which tsx
  // can't load; same queries, key/label contract mirrors candidatesForLang).
  const db = new Database('vgc_pokemon.db', { readonly: true });
  const locOf = (table: string) => db.prepare(`SELECT name_zh AS zh, name_ja AS ja FROM ${table} WHERE name_en = ?`);
  const loc = { moves: locOf('moves'), abilities: locOf('abilities'), items: locOf('items') };
  const pokemonId = db.prepare('SELECT id FROM pokemon WHERE name_en = ?');
  const moveId = db.prepare('SELECT id FROM moves WHERE name_en = ?');
  const legalItems = new Set<string>(MEGA_STONES);
  for (const item of Generations.get(9).items) legalItems.add(item.name);
  const candsOf = (rows: Array<{ key: string; zh: string | null; zhHans: string | null; ja: string | null; en: string }>, lang: ScanLang): CandidateEntry[] =>
    rows.map(r => ({
      key: r.key,
      label: (lang === 'en' ? r.en : lang === 'ja' ? r.ja : lang === 'zh-Hant' ? r.zh : r.zhHans) ?? r.en,
    }));
  const movesFor = (speciesId: number, lang: ScanLang) => candsOf(
    (db.prepare(`SELECT m.id, m.name_en AS en, m.name_zh AS zh, m.name_zh_hans AS zhHans, m.name_ja AS ja
                 FROM pokemon_moves pm JOIN moves m ON m.id = pm.move_id WHERE pm.pokemon_id = ?`)
      .all(speciesId) as any[]).map(r => ({ key: String(r.id), zh: r.zh, zhHans: r.zhHans, ja: r.ja, en: r.en })), lang);
  const abilitiesFor = (speciesId: number, lang: ScanLang) => candsOf(
    (db.prepare(`SELECT a.name_en AS en, a.name_zh AS zh, a.name_zh_hans AS zhHans, a.name_ja AS ja
                 FROM pokemon_abilities pa JOIN abilities a ON a.id = pa.ability_id WHERE pa.pokemon_id = ?`)
      .all(speciesId) as any[]).map(r => ({ key: r.en, zh: r.zh, zhHans: r.zhHans, ja: r.ja, en: r.en })), lang);
  const itemRows = (db.prepare('SELECT name_en AS en, name_zh AS zh, name_zh_hans AS zhHans, name_ja AS ja FROM items WHERE name_en IS NOT NULL').all() as any[])
    .filter(r => legalItems.has(r.en)).map(r => ({ key: r.en, zh: r.zh, zhHans: r.zhHans, ja: r.ja, en: r.en }));
  const itemsFor = (lang: ScanLang) => candsOf(itemRows, lang);

  const crops: LabeledCrop[] = [];
  for (const [key, pair] of Object.entries<any>(golden)) {
    if (key.startsWith('_') || pair.lang === 'en' || !pair.movesImage) continue;
    const lang: ScanLang = pair.lang;
    const col = lang === 'ja' ? 'ja' : 'zh';
    const localized = (table: keyof typeof loc, nameEn: string | null): string | null =>
      nameEn ? ((loc[table].get(nameEn) as any)?.[col] ?? null) : null;
    const img = readPng(`${GOLDEN_DIR}/${pair.movesImage}`);
    const det = detectPlayerPanels(img);
    if (!det || det.kind !== 'moves') { console.log(`  skip ${key}: no moves panels detected`); continue; }
    det.panels.forEach((panel, slot) => {
      const mon = pair.team[slot];
      const speciesId = (pokemonId.get(mon.species) as any).id;
      const others = (['en', 'ja', 'zh-Hant', 'zh-Hans'] as ScanLang[]).filter(l => l !== lang);
      const add = (box: TileBox | undefined, label: string | null, desc: string, expectedKey: string, candsFor: (l: ScanLang) => CandidateEntry[]) => {
        if (!box || !label) return;
        crops.push({
          img, box, label, lang, desc: `${key} slot${slot} ${desc}`, expectedKey,
          candidates: candsFor(lang), otherLangs: others.map(candsFor),
        });
      };
      add(panel.abilityText, localized('abilities', mon.ability), `ability "${mon.ability}"`, mon.ability, l => abilitiesFor(speciesId, l));
      add(panel.itemText, localized('items', mon.item), `item "${mon.item}"`, mon.item, l => itemsFor(l));
      mon.moves.forEach((m: string, j: number) => {
        const id = (moveId.get(m) as any)?.id;
        add(panel.moveTexts?.[j], localized('moves', m), `move${j} "${m}"`, String(id), l => movesFor(speciesId, l));
      });
    });
  }

  // Extract; dedupe per char keeping the largest-native-line variant.
  const best = new Map<string, ExtractedGlyph>();
  const pitches: number[] = [];
  let extracted = 0, skipped = 0;
  for (const crop of crops) {
    const res = extractFromCrop(crop.img, crop.box, crop.label);
    if (!res) { skipped++; console.log(`  skip ${crop.desc} "${crop.label}": segmentation failed`); continue; }
    extracted++;
    pitches.push(res.pitch);
    for (const g of res.glyphs) {
      const prev = best.get(g.char);
      // Prefer scan-time-threshold extractions (stroke weight matches the
      // crop side), then the largest native line for detail.
      if (!prev || g.tIdx < prev.tIdx || (g.tIdx === prev.tIdx && g.nativeH > prev.nativeH)) best.set(g.char, g);
    }
  }
  pitches.sort((a, b) => a - b);
  const pitch = Number((pitches[Math.floor(pitches.length / 2)] ?? ATLAS_LINE_H).toFixed(2));
  const entries: AtlasGlyphData[] = [...best.values()]
    .map(({ nativeH, tIdx, ...e }) => e)
    .sort((a, b) => a.char.localeCompare(b.char));

  // Validation report: rank every labeled crop against its full vocabulary
  // using the atlas pass only. This is the ATLAS_ACCEPT calibration data.
  const atlas: TextAtlas = parseAtlas(entries, pitch);
  let top1 = 0, total = 0;
  let maxWrongTop = -Infinity;
  let maxWrongAny = -Infinity;   // best wrong-candidate score, any crop (own language)
  let maxCrossLang = -Infinity;  // best score of any other-language candidate set
  let maxCrossLangDesc = '';
  const correctTops: Array<{ desc: string; score: number; margin: number }> = [];
  for (const crop of crops) {
    const decode = makeCellDecoder(MASK_THRESHOLDS.map(t => whiteMask(crop.img, crop.box, t)), atlas);
    const ranked = matchTextAtlas(decode, crop.candidates, Infinity);
    for (const r of ranked) if (r.key !== crop.expectedKey) { maxWrongAny = Math.max(maxWrongAny, r.score); break; }
    for (let li = 0; li < crop.otherLangs.length; li++) {
      // Only a WRONG key is a hijack — zh-Hant/zh-Hans share identical
      // strings for most names, and matching the same key there is correct.
      const other = matchTextAtlas(decode, crop.otherLangs[li], 1)[0];
      if (other && other.key !== crop.expectedKey && other.score > maxCrossLang) {
        maxCrossLang = other.score;
        maxCrossLangDesc = `${crop.desc} vs ${(['en','ja','zh-Hant','zh-Hans'] as ScanLang[]).filter(l => l !== crop.lang)[li]} key=${other.key}`;
      }
    }
    const rank = ranked.findIndex(r => r.key === crop.expectedKey);
    total++;
    if (rank === 0) {
      top1++;
      correctTops.push({ desc: crop.desc, score: ranked[0].score, margin: ranked[0].score - (ranked[1]?.score ?? 0) });
    } else {
      console.log(`  [validate] ${crop.desc}: rank=${rank} top=${ranked[0]?.key}@${ranked[0]?.score.toFixed(4)} correct@${ranked[rank]?.score.toFixed(4) ?? 'n/a'}`);
      if (ranked[0]) maxWrongTop = Math.max(maxWrongTop, ranked[0].score);
    }
  }
  // The four crops the canvas pass gets wrong (the whole point of the atlas):
  for (const c of correctTops) {
    if (/slot2 move2 "Tailwind"|slot0 move2 "Light Screen"|slot0 move3 "Taunt"|slot5 move1 "Sludge Wave"|slot4 item "Delphoxite"/.test(c.desc)) {
      console.log(`  [target] ${c.desc}: ${c.score.toFixed(4)} (margin ${c.margin.toFixed(4)})`);
    }
  }
  correctTops.sort((a, b) => a.score - b.score);
  console.log('  lowest correct top-1 scores (ATLAS_ACCEPT must sit below the ones the canvas pass gets wrong):');
  for (const c of correctTops.slice(0, 8)) console.log(`    ${c.score.toFixed(4)} (margin ${c.margin.toFixed(4)}) ${c.desc}`);

  fs.writeFileSync(
    TS_PATH,
    `// src/features/scan/textGlyphAtlas.ts
// GENERATED by scripts/build-text-glyph-atlas.ts. Do not edit by hand.
import type { AtlasGlyphData } from './textMatch';

/** Median character cell pitch, px at ATLAS_LINE_H scale. */
export const TEXT_GLYPH_PITCH = ${pitch};
export const TEXT_GLYPH_ATLAS: AtlasGlyphData[] = ${JSON.stringify(entries)};
`,
  );
  console.log(`Extracted ${extracted}/${crops.length} crops (${skipped} skipped), ${entries.length} glyphs, pitch=${pitch}.`);
  console.log(`Validation: ${top1}/${total} top-1. min correct top=${(correctTops[0]?.score ?? NaN).toFixed(4)}, max wrong top=${isFinite(maxWrongTop) ? maxWrongTop.toFixed(4) : 'none'}.`);
  console.log(`Gate calibration: max wrong-candidate score=${maxWrongAny.toFixed(4)}, max cross-language top score=${maxCrossLang.toFixed(4)} (${maxCrossLangDesc}) — ATLAS_ACCEPT must exceed both and stay below min correct top.`);
  console.log(`Chars: ${entries.map(e => e.char).join('')}`);
}

if (process.argv[1]?.includes('build-text-glyph-atlas')) main();
