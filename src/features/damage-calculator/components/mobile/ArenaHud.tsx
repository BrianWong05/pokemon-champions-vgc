import React from 'react';
import type { CalcState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import { Sprite, Icon, KOVerdict, koVerdictFromText } from '@/design-system/arena';

/**
 * ArenaHud — the pinned single-direction result HUD (DS-faithful).
 * Shows the active attacker (`dir`) hitting the other side with its active move:
 * matchup row + big % readout + KOVerdict. `onSwap` flips the direction.
 */
export function ArenaHud({ state, dir, onSwap, p1Results, p2Results, nameOf }: {
  state: CalcState;
  dir: 'p1' | 'p2';
  onSwap: () => void;
  p1Results: (DamageResult | null)[];
  p2Results: (DamageResult | null)[];
  nameOf: (id: number | null) => string;
}) {
  const atk = state[dir];
  const def = state[dir === 'p1' ? 'p2' : 'p1'];
  const results = dir === 'p1' ? p1Results : p2Results;
  const r = results[atk.activeMoveIndex] ?? null;
  const ko = koVerdictFromText(r?.koChanceText);
  const pct = r
    ? `${isNaN(r.minPercent) ? '0.0' : r.minPercent}–${isNaN(r.maxPercent) ? '0.0' : r.maxPercent}%`
    : '—';
  const dmg = r ? `${r.minDamage}–${r.maxDamage} dmg` : 'Pick a move';
  const moveName = r?.moveName ?? 'No move';

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'var(--surface-sticky)',
      borderBottom: '1px solid var(--line-2)',
      boxShadow: 'var(--shadow-hud)',
      padding: '14px var(--gutter) 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Sprite dex={atk.selectedId} name={nameOf(atk.selectedId)} size={40} ring tone="accent" />
        <button
          onClick={onSwap}
          aria-label="Swap direction"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'inline-flex' }}
        >
          <Icon name="chevron-right" size={18} color="var(--ink-3)" />
        </button>
        <Sprite dex={def.selectedId} name={nameOf(def.selectedId)} size={40} ring tone="danger" />
        <div style={{ minWidth: 0, flex: 1, marginLeft: 2 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>{moveName}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nameOf(atk.selectedId)} <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>vs</span> {nameOf(def.selectedId)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-readout)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-readout)', lineHeight: 1 }}>{pct}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>{dmg}</div>
        </div>
        <KOVerdict verdict={ko.verdict} confidence={ko.confidence} tone={ko.tone} />
      </div>
    </div>
  );
}
