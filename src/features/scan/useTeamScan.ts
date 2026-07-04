import { useCallback, useState } from 'react';
import { scanTeamImage as realScan } from './scanImage';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { blobToRgbaImage as realLoad } from './imageLoading';
import { cropImage } from './segmentation';
import { detectScanTargets, type ScanDetection, type ScanMode } from './scanTargets';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import { loadClassifier, type Classifier } from './classifier';
import type { Candidate, ReferenceEntry, RgbaImage, SlotResult, TileBox } from './types';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';
export type ScanEngine = 'auto' | 'classifier' | 'descriptor';

const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5;

function getEngineSetting(): ScanEngine {
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

const DEFAULT_DEPS: Required<TeamScanDeps> = {
  loadRefs: loadReferenceDescriptors,
  blobToRgbaImage: realLoad,
  scanTeamImage: realScan,
  detectScanTargets,
  cropImage,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  loadClassifier,
};

export function useTeamScan(legalIds: Set<number>, deps: TeamScanDeps = DEFAULT_DEPS) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (blob: Blob) => {
    setStatus('scanning'); setError(null);
    try {
      const engine = getEngineSetting();
      const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);
      const image = await deps.blobToRgbaImage(blob);

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
        setMode(null); // legacy path does not report the screen type
        setSlots(deps.scanTeamImage(image, refs, 3));
        setStatus('done');
        return;
      }

      const detectTargets = deps.detectScanTargets ?? DEFAULT_DEPS.detectScanTargets;
      const crop = deps.cropImage ?? DEFAULT_DEPS.cropImage;
      const matchTileFn = deps.matchTile ?? DEFAULT_DEPS.matchTile;
      const loadClassifierFn = deps.loadClassifier ?? DEFAULT_DEPS.loadClassifier;

      const classifier = await loadClassifierFn();
      const { mode, targets } = detectTargets(image);
      setMode(mode);
      const results: SlotResult[] = [];
      for (const { box, side, hpPercent } of targets) {
        const tile = crop(image, box);
        const classifierCandidates = classifier ? await classifier.classify(tile, legalIds, 3) : [];
        const useDescriptorFallback =
          engine === 'auto' && (!classifier || (classifierCandidates[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD);
        const candidates = useDescriptorFallback
          ? matchTileFn(tile, refs, 3)
          : classifierCandidates;
        results.push({ box, side, hpPercent, candidates });
      }
      console.log(`[scan] mode: ${mode}, engine: ${classifier ? 'classifier' : 'descriptor'} (${engine})`);
      setSlots(results);
      setStatus('done');
    } catch (e) {
      console.error('[scan] failed', e);
      setError((e as Error).message); setStatus('error');
    }
  }, [legalIds, deps]);

  const reset = useCallback(() => { setStatus('idle'); setSlots([]); setMode(null); setError(null); }, []);

  return { status, slots, mode, error, scan, reset };
}
