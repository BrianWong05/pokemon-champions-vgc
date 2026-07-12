// Decides which overlay view a scanned frame routes to (2026-07-12 spec):
// team preview -> confirm roster; battle -> calculator with the LEFT-MOST
// detected opponent as defender and every detected opponent's HP stored.
import type { SlotResult } from '../scan/types';
import type { ScanMode } from '../scan/scanTargets';

export type OverlayRoute =
  | { view: 'confirm'; slots: SlotResult[] }
  | { view: 'calc'; defenderId: number; hpPercent: number | null; hpEntries: Array<{ id: number; hpPercent: number | null }> }
  | { view: 'error'; reason: 'empty' | 'no-roster-match' };

export function routeScan(mode: ScanMode | null, slots: SlotResult[]): OverlayRoute {
  if (mode === 'team') {
    if (!slots.some((s) => s.candidates.length > 0)) return { view: 'error', reason: 'empty' };
    return { view: 'confirm', slots };
  }
  if (mode === 'battle') {
    const opp = slots
      .filter((s) => s.side === 'opponent' && s.candidates.length > 0)
      .sort((a, b) => a.box.x - b.box.x);
    if (opp.length === 0) return { view: 'error', reason: 'no-roster-match' };
    const hpEntries = opp.map((s) => ({ id: s.candidates[0].id, hpPercent: s.hpPercent ?? null }));
    return { view: 'calc', defenderId: hpEntries[0].id, hpPercent: hpEntries[0].hpPercent, hpEntries };
  }
  return { view: 'error', reason: 'empty' };
}
