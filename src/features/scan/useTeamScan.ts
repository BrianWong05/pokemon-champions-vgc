import { useCallback, useState } from 'react';
import { scanFrame, DEFAULT_DEPS, type TeamScanDeps } from './scanFrame';
import { type ScanMode } from './scanTargets';
import type { SlotResult } from './types';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';
export type { ScanEngine } from './scanFrame';
export { DEFAULT_DEPS, type TeamScanDeps } from './scanFrame';

export function useTeamScan(legalIds: Set<number>, deps: TeamScanDeps = DEFAULT_DEPS) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (blob: Blob) => {
    setStatus('scanning'); setError(null);
    try {
      const image = await deps.blobToRgbaImage(blob);
      const result = await scanFrame(image, legalIds, deps);
      setMode(result.mode);
      setSlots(result.slots);
      setStatus('done');
    } catch (e) {
      console.error('[scan] failed', e);
      setError((e as Error).message); setStatus('error');
    }
  }, [legalIds, deps]);

  const reset = useCallback(() => { setStatus('idle'); setSlots([]); setMode(null); setError(null); }, []);

  return { status, slots, mode, error, scan, reset };
}
