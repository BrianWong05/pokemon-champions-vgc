import { useCallback, useState } from 'react';
import { scanTeamImage as realScan } from './scanImage';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { blobToRgbaImage as realLoad } from './imageLoading';
import { detectOpponentTiles, cropImage } from './segmentation';
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
  detectOpponentTiles?: (img: RgbaImage) => TileBox[];
  cropImage?: (img: RgbaImage, box: TileBox) => RgbaImage;
  matchTile?: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => Candidate[];
  loadClassifier?: () => Promise<Classifier | null>;
}

const DEFAULT_DEPS: Required<TeamScanDeps> = {
  loadRefs: loadReferenceDescriptors,
  blobToRgbaImage: realLoad,
  scanTeamImage: realScan,
  detectOpponentTiles,
  cropImage,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  loadClassifier,
};

export function useTeamScan(legalIds: Set<number>, deps: TeamScanDeps = DEFAULT_DEPS) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (blob: Blob) => {
    setStatus('scanning'); setError(null);
    try {
      const engine = getEngineSetting();
      const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);
      const image = await deps.blobToRgbaImage(blob);

      // Callers that inject only the legacy 3-dep shape (no tile/classifier deps
      // overridden) get the original scanTeamImage-only behavior, regardless of the
      // engine setting — there's no classifier/tile pipeline to route through.
      const hasTilePipelineDeps =
        deps.detectOpponentTiles != null ||
        deps.cropImage != null ||
        deps.matchTile != null ||
        deps.loadClassifier != null;

      if (engine === 'descriptor' || (engine !== 'classifier' && !hasTilePipelineDeps)) {
        console.log('[scan] engine: descriptor');
        setSlots(deps.scanTeamImage(image, refs, 3));
        setStatus('done');
        return;
      }

      const detectTiles = deps.detectOpponentTiles ?? DEFAULT_DEPS.detectOpponentTiles;
      const crop = deps.cropImage ?? DEFAULT_DEPS.cropImage;
      const matchTileFn = deps.matchTile ?? DEFAULT_DEPS.matchTile;
      const loadClassifierFn = deps.loadClassifier ?? DEFAULT_DEPS.loadClassifier;

      const classifier = await loadClassifierFn();
      const boxes = detectTiles(image);
      const results: SlotResult[] = [];
      for (const box of boxes) {
        const tile = crop(image, box);
        const classifierCandidates = classifier ? await classifier.classify(tile, legalIds, 3) : [];
        const useDescriptorFallback =
          engine === 'auto' && (!classifier || (classifierCandidates[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD);
        const candidates = useDescriptorFallback
          ? matchTileFn(tile, refs, 3)
          : classifierCandidates;
        results.push({ box, candidates });
      }
      console.log(`[scan] engine: ${classifier ? 'classifier' : 'descriptor'} (${engine})`);
      setSlots(results);
      setStatus('done');
    } catch (e) {
      console.error('[scan] failed', e);
      setError((e as Error).message); setStatus('error');
    }
  }, [legalIds, deps]);

  const reset = useCallback(() => { setStatus('idle'); setSlots([]); setError(null); }, []);

  return { status, slots, error, scan, reset };
}
