import type { RgbaImage, TileBox, Candidate, ReferenceEntry } from './types';
import { detectPlayerPanels } from './playerPanels';
import type { PanelRegions, ScanLang } from './playerTypes';
import { readStatCell, type StatRowRead } from './statDigits';
import {
  shapeFromMask, matchTextHybrid, makeCellDecoder, parseAtlas,
  browserTextRenderer, type TextRenderer, type TextMatchResult,
} from './textMatch';
import { whiteMask, MASK_THRESHOLDS } from './hpText';
import { TEXT_GLYPH_ATLAS, TEXT_GLYPH_PITCH } from './textGlyphAtlas';
import { loadPlayerPanelDescriptors, filterByFormatLegal } from './referenceData';
import { loadClassifier, type Classifier } from './classifier';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import { cropImage } from './segmentation';
import { candidatesForLang, type PlayerScanVocab } from '@/db/repositories/scan.repo';

export const LANGS: ScanLang[] = ['en', 'ja', 'zh-Hant', 'zh-Hans'];
const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5; // mirror scanFrame.ts

export interface TextFieldRead { byLang: Record<ScanLang, TextMatchResult[]> }
export interface MovesPanelRead {
  slot: number; species: Candidate[];
  ability: TextFieldRead | null; item: TextFieldRead | null;
  moves: Array<TextFieldRead | null>;
}
export interface StatsPanelRead { slot: number; species: Candidate[]; rows: StatRowRead[] }
export type PlayerFrameScan =
  | { kind: 'moves'; panels: MovesPanelRead[] }
  | { kind: 'stats'; panels: StatsPanelRead[] };

export interface PlayerScanDeps {
  loadRefs(): Promise<ReferenceEntry[]>;
  loadClassifier(): Promise<Classifier | null>;
  matchTile(img: RgbaImage, refs: ReferenceEntry[], topN: number): Candidate[];
  cropImage(img: RgbaImage, box: TileBox): RgbaImage;
  render: TextRenderer;
}

export const PLAYER_SCAN_DEPS: PlayerScanDeps = {
  loadRefs: loadPlayerPanelDescriptors,
  loadClassifier,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  cropImage,
  render: browserTextRenderer,
};

// Game-font glyph templates extracted from labeled goldens
// (scripts/build-text-glyph-atlas.ts) — the atlas-first pass in
// matchTextHybrid; canvas shape matching remains the fallback.
const textAtlas = parseAtlas(TEXT_GLYPH_ATLAS, TEXT_GLYPH_PITCH);

function readTextField(
  img: RgbaImage, box: TileBox | undefined,
  entries: Array<{ key?: string; moveId?: number; names: any }>,
  render: TextRenderer,
): TextFieldRead | null {
  if (!box) return null;
  const raw = whiteMask(img, box, 0.72); // CALIBRATE threshold (mirrors textShapeAt)
  const shape = shapeFromMask(raw);
  if (!shape) return null;
  const decode = makeCellDecoder(
    MASK_THRESHOLDS.map(t => (t === 0.72 ? raw : whiteMask(img, box, t))), textAtlas,
  );
  const byLang = {} as TextFieldRead['byLang'];
  for (const lang of LANGS) {
    byLang[lang] = matchTextHybrid(decode, shape, candidatesForLang(entries, lang), render);
  }
  return { byLang };
}

export function rescanMovesPanelText(
  img: RgbaImage, panel: PanelRegions, speciesId: number, vocab: PlayerScanVocab, render: TextRenderer,
): Pick<MovesPanelRead, 'ability' | 'moves'> {
  return {
    ability: readTextField(img, panel.abilityText, vocab.abilitiesFor(speciesId), render),
    moves: (panel.moveTexts ?? []).map(b => readTextField(img, b, vocab.movesFor(speciesId), render)),
  };
}

export async function scanPlayerImage(
  img: RgbaImage, legalIds: Set<number>, vocab: PlayerScanVocab, deps: PlayerScanDeps = PLAYER_SCAN_DEPS,
): Promise<PlayerFrameScan | null> {
  const det = detectPlayerPanels(img);
  if (!det) return null;
  const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);
  const classifier = await deps.loadClassifier();

  // Species candidate policy (player path only — differs from scanFrame.ts's
  // opponent path, which replaces classifier candidates with descriptor
  // candidates below the confidence gate). Here the classifier is ALWAYS
  // primary when it returns anything: its top-1 stays top-1 even under the
  // gate. Below CLASSIFIER_CONFIDENCE_THRESHOLD we APPEND descriptor
  // candidates instead, so a low top-score still flags the field as
  // low-confidence downstream while offering correction options — the
  // descriptor metric is measurably weaker on panel crops than on opponent
  // battle-box crops (task-7-report.md Fix C/D: descriptor top-1 is 1/6 on
  // these crops, vs. the classifier's 6/6), so replacing would make things
  // worse, not better. Descriptor-only behavior when no classifier is loaded
  // is unchanged.
  const speciesFor = async (panel: PanelRegions): Promise<Candidate[]> => {
    const tile = deps.cropImage(img, panel.sprite);
    const fromClassifier = classifier ? await classifier.classify(tile, legalIds, 3) : [];
    if (fromClassifier.length === 0) return deps.matchTile(tile, refs, 3);
    if ((fromClassifier[0]?.score ?? 0) >= CLASSIFIER_CONFIDENCE_THRESHOLD) return fromClassifier;
    const seen = new Set(fromClassifier.map(c => c.id));
    const descriptorExtras = deps.matchTile(tile, refs, 3).filter(c => !seen.has(c.id));
    return [...fromClassifier, ...descriptorExtras];
  };

  if (det.kind === 'stats') {
    const panels: StatsPanelRead[] = [];
    for (let i = 0; i < det.panels.length; i++) {
      panels.push({
        slot: i, species: await speciesFor(det.panels[i]),
        rows: det.panels[i].statCells!.map(c => readStatCell(img, c)),
      });
    }
    return { kind: 'stats', panels };
  }

  const panels: MovesPanelRead[] = [];
  for (let i = 0; i < det.panels.length; i++) {
    const p = det.panels[i];
    const species = await speciesFor(p);
    const speciesId = species[0]?.id ?? null;
    panels.push({
      slot: i, species,
      item: readTextField(img, p.itemText, vocab.items, deps.render),
      ...(speciesId != null
        ? rescanMovesPanelText(img, p, speciesId, vocab, deps.render)
        : { ability: null, moves: [null, null, null, null] }),
    });
  }
  return { kind: 'moves', panels };
}
