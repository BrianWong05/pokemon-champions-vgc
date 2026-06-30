import { useCallback, useState } from 'react';
import { scanTeamImage as realScan } from './scanImage';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { blobToRgbaImage as realLoad } from './imageLoading';
import type { ReferenceEntry, RgbaImage, SlotResult } from './types';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export interface TeamScanDeps {
  loadRefs: () => Promise<ReferenceEntry[]>;
  blobToRgbaImage: (blob: Blob) => Promise<RgbaImage>;
  scanTeamImage: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => SlotResult[];
}

const DEFAULT_DEPS: TeamScanDeps = {
  loadRefs: loadReferenceDescriptors,
  blobToRgbaImage: realLoad,
  scanTeamImage: realScan,
};

export function useTeamScan(legalIds: Set<number>, deps: TeamScanDeps = DEFAULT_DEPS) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (blob: Blob) => {
    setStatus('scanning'); setError(null);
    try {
      const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);
      const image = await deps.blobToRgbaImage(blob);
      setSlots(deps.scanTeamImage(image, refs, 3));
      setStatus('done');
    } catch (e) {
      console.error('[scan] failed', e);
      setError((e as Error).message); setStatus('error');
    }
  }, [legalIds, deps]);

  const reset = useCallback(() => { setStatus('idle'); setSlots([]); setError(null); }, []);

  return { status, slots, error, scan, reset };
}
