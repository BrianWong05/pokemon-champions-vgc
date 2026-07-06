import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import MoveSearchSelect from '@/components/molecules/MoveSearchSelect';
import { Sheet } from '@/design-system/arena';

/**
 * ArenaMovePickerSheet — the four move slots: tap a slot to make it the active move
 * (drives the HUD), see each slot's damage %, and change a slot via MoveSearchSelect.
 */
export function ArenaMovePickerSheet({ open, onClose, side, state, dispatch, moveList, results }: {
  open: boolean;
  onClose: () => void;
  side: 'p1' | 'p2';
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  moveList: MoveData[];
  results: (DamageResult | null)[];
}) {
  const s = state[side];
  return (
    <Sheet open={open} onClose={onClose} title="Moves">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => {
          const m = s.moves[i];
          const r = results[i];
          const active = s.activeMoveIndex === i;
          const pct = r ? `${r.minPercent}–${r.maxPercent}%` : '';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side, index: i } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r-sm)',
                  border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--surface-inset)', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto', background: active ? 'var(--accent)' : 'var(--line-3)' }} />
                <span style={{ flex: 1, color: 'var(--ink-1)', fontWeight: 600, fontSize: 'var(--fs-body)' }}>{m?.nameEn ?? `Empty slot ${i + 1}`}</span>
                {pct && <span style={{ color: 'var(--ink-3)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>{pct}</span>}
              </button>
              <MoveSearchSelect label="" moveList={moveList} onSelect={(mv) => dispatch({ type: 'SELECT_MOVE_FOR_SLOT', payload: { side, index: i, move: mv } })} />
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
