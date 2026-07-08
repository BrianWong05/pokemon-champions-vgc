import React from 'react';
import type { SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { TypeBadge, Icon } from '@/design-system/arena';

const catShort = (damageClassId: number) => (damageClassId === 2 ? 'Ph' : 'Sp');

export function ArenaMoveList({ side, results, onSelect, onEdit }: {
  side: SideState;
  results: (DamageResult | null)[];
  onSelect: (index: number) => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Moves</div>
        <span style={{ flex: 1 }} />
        <button onClick={onEdit} aria-label="Edit moves" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'var(--ink-3)' }}>
          <Icon name="pencil" size={14} color="var(--ink-3)" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {side.moves.map((m, i) => {
          if (!m) {
            return (
              <button key={i} onClick={onEdit} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '7px 8px',
                borderRadius: 'var(--r-sm)', cursor: 'pointer', background: 'transparent',
                border: '1px dashed var(--line-2)', color: 'var(--ink-4)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 600,
              }}>Add move</button>
            );
          }
          const move = m as MoveData;
          const on = i === side.activeMoveIndex;
          const r = results[i];
          const typeName = REVERSE_TYPE_IDS[r?.moveType ?? move.typeId];
          return (
            <button key={i} onClick={() => onSelect(i)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44, textAlign: 'left', padding: '6px 9px',
              borderRadius: 'var(--r-sm)', cursor: 'pointer',
              background: on ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
            }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: on ? 'var(--ink-1)' : 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {move.nameEn}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {typeName && <TypeBadge type={typeName} size="sm" />}
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: 'var(--r-xs)', background: 'var(--surface-inset)', border: '1px solid var(--line-1)', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)' }}>
                    {catShort(move.damageClassId)}
                  </span>
                  {move.power != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, color: 'var(--ink-4)' }}>{move.power}</span>}
                </span>
              </span>
              <span style={{ flex: 'none', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                {r ? `${r.minPercent}–${r.maxPercent}%` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
