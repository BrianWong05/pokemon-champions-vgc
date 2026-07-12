// Decides which overlay view a scanned frame routes to. Only team previews
// are scan-routed: in-battle classification and HP reads were removed
// (2026-07-12 accuracy call) — battle frames report an error instead.
import type { SlotResult } from '../scan/types';
import type { ScanMode } from '../scan/scanTargets';

export type OverlayRoute =
  | { view: 'confirm'; slots: SlotResult[] }
  | { view: 'error'; reason: 'empty' | 'battle' };

export function routeScan(mode: ScanMode | null, slots: SlotResult[]): OverlayRoute {
  if (mode === 'team') {
    if (!slots.some((s) => s.candidates.length > 0)) return { view: 'error', reason: 'empty' };
    return { view: 'confirm', slots };
  }
  if (mode === 'battle') return { view: 'error', reason: 'battle' };
  return { view: 'error', reason: 'empty' };
}
