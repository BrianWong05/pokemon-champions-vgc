import { scanTeamImage as realScan } from './scanImage';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { blobToRgbaImage as realLoad } from './imageLoading';
import { cropImage } from './segmentation';
import { detectScanTargets, type ScanDetection, type ScanMode } from './scanTargets';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import { loadClassifier, type Classifier } from './classifier';
import type { Candidate, ReferenceEntry, RgbaImage, SlotResult, TileBox } from './types';
import type { CapturedFrame } from './captureSource';

export type ScanEngine = 'auto' | 'classifier' | 'descriptor';

const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5;

export function getEngineSetting(): ScanEngine {
  const stored = localStorage.getItem('scan.engine');
  return stored === 'classifier' || stored === 'descriptor' ? stored : 'auto';
}

export interface TeamScanDeps {
  loadRefs: () => Promise<ReferenceEntry[]>;
  blobToRgbaImage: (blob: Blob) => Promise<RgbaImage>;
  scanTeamImage: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => SlotResult[];
  detectScanTargets?: (img: RgbaImage) => ScanDetection;
  cropImage?: (img: RgbaImage, box: TileBox) => RgbaImage;
  matchTile?: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => Candidate[];
  loadClassifier?: () => Promise<Classifier | null>;
}

export const DEFAULT_DEPS: Required<TeamScanDeps> = {
  loadRefs: loadReferenceDescriptors,
  blobToRgbaImage: realLoad,
  scanTeamImage: realScan,
  detectScanTargets,
  cropImage,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  loadClassifier,
};

export interface ScanFrameResult {
  mode: ScanMode | null;
  slots: SlotResult[];
}

export async function scanFrame(
  image: RgbaImage,
  legalIds: Set<number>,
  deps: TeamScanDeps = DEFAULT_DEPS,
): Promise<ScanFrameResult> {
  const engine = getEngineSetting();
  const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);

  // Callers that inject only the legacy 3-dep shape (no target/classifier deps
  // overridden) get the original scanTeamImage-only behavior, regardless of the
  // engine setting — there's no classifier/target pipeline to route through.
  const hasTargetPipelineDeps =
    deps.detectScanTargets != null ||
    deps.cropImage != null ||
    deps.matchTile != null ||
    deps.loadClassifier != null;

  if (engine === 'descriptor' || (engine !== 'classifier' && !hasTargetPipelineDeps)) {
    console.log('[scan] engine: descriptor');
    return { mode: null, slots: deps.scanTeamImage(image, refs, 3) };
  }

  const detectTargets = deps.detectScanTargets ?? DEFAULT_DEPS.detectScanTargets;
  const crop = deps.cropImage ?? DEFAULT_DEPS.cropImage;
  const matchTileFn = deps.matchTile ?? DEFAULT_DEPS.matchTile;
  const loadClassifierFn = deps.loadClassifier ?? DEFAULT_DEPS.loadClassifier;

  const classifier = await loadClassifierFn();
  const { mode, targets } = detectTargets(image);
  const slots: SlotResult[] = [];
  for (const { box, side, hpPercent } of targets) {
    const tile = crop(image, box);
    const classifierCandidates = classifier ? await classifier.classify(tile, legalIds, 3) : [];
    const useDescriptorFallback =
      engine === 'auto' && (!classifier || (classifierCandidates[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD);
    const candidates = useDescriptorFallback ? matchTileFn(tile, refs, 3) : classifierCandidates;
    slots.push({ box, side, hpPercent, candidates });
  }
  console.log(`[scan] mode: ${mode}, engine: ${classifier ? 'classifier' : 'descriptor'} (${engine})`);
  return { mode, slots };
}

export async function ingestFrame(
  frame: CapturedFrame,
  legalIds: Set<number>,
  deps: TeamScanDeps = DEFAULT_DEPS,
): Promise<ScanFrameResult> {
  const image = await deps.blobToRgbaImage(frame.blob);
  return scanFrame(image, legalIds, deps);
}
