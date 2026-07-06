import type { RgbaImage, TileBox, Candidate, ReferenceEntry } from './types';
import { detectPlayerPanels } from './playerPanels';
import type { PanelRegions, ScanLang } from './playerTypes';
import { readStatCell, type StatRowRead } from './statDigits';
import { textShapeAt, matchTextShape, browserTextRenderer, type TextRenderer, type TextMatchResult } from './textMatch';
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

function readTextField(
  img: RgbaImage, box: TileBox | undefined,
  entries: Array<{ key?: string; moveId?: number; names: any }>,
  render: TextRenderer,
): TextFieldRead | null {
  if (!box) return null;
  const shape = textShapeAt(img, box);
  if (!shape) return null;
  const byLang = {} as TextFieldRead['byLang'];
  for (const lang of LANGS) {
    byLang[lang] = matchTextShape(shape, candidatesForLang(entries, lang), render);
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

  const speciesFor = async (panel: PanelRegions): Promise<Candidate[]> => {
    const tile = deps.cropImage(img, panel.sprite);
    const fromClassifier = classifier ? await classifier.classify(tile, legalIds, 3) : [];
    const useFallback = !classifier || (fromClassifier[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD;
    return useFallback ? deps.matchTile(tile, refs, 3) : fromClassifier;
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
