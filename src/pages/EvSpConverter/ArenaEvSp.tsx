import React from 'react';
import { Card, Button } from '@/design-system/arena';
import { convertEvToSp } from '@/features/pokemon/utils/sp-ev-converter';
import type { EvSpread } from '@/components/organisms/EvSpForm';

export interface ArenaEvSpProps {
  spread: EvSpread;
  onSpreadChange: (s: EvSpread) => void;
  onReset: () => void;
  totalEvs: number;
  totalSp: number;
}

const STATS: { key: keyof EvSpread; label: string }[] = [
  { key: 'hp', label: 'HP' }, { key: 'atk', label: 'Atk' }, { key: 'def', label: 'Def' },
  { key: 'spa', label: 'SpA' }, { key: 'spd', label: 'SpD' }, { key: 'spe', label: 'Spe' },
];

export const ArenaEvSp: React.FC<ArenaEvSpProps> = ({ spread, onSpreadChange, onReset, totalEvs, totalSp }) => {
  const set = (key: keyof EvSpread, v: number) =>
    onSpreadChange({ ...spread, [key]: Math.max(0, Math.min(252, Math.round(v / 4) * 4)) });
  const over = totalEvs > 510;

  return (
    <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STATS.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: key === 'spe' ? 'var(--accent)' : 'var(--ink-3)' }}>{label}</span>
              <input
                type="range" min={0} max={252} step={4} value={spread[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <input
                type="number" inputMode="numeric" min={0} max={252} step={4} value={spread[key]}
                onChange={(e) => set(key, Number(e.target.value) || 0)}
                style={{ width: 56, height: 36, textAlign: 'center', borderRadius: 'var(--r-xs)', background: 'var(--surface-inset)', border: '1px solid var(--border-input)', color: spread[key] > 0 ? 'var(--ink-1)' : 'var(--ink-4)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}
              />
              <span style={{ width: 44, textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: spread[key] > 0 ? 'var(--accent)' : 'var(--ink-4)' }}>
                {convertEvToSp(spread[key])} <span style={{ fontSize: 9.5, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>SP</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: over ? 'var(--danger)' : 'var(--ink-3)' }}>EVS {totalEvs} / 510</div>
            <div style={{ height: 6, marginTop: 4, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (totalEvs / 510) * 100)}%`, height: '100%', background: over ? 'var(--danger)' : 'var(--accent)' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink-1)' }}>
            {totalSp} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>SP total</span>
          </div>
        </div>
      </Card>
      <Button variant="danger" block onClick={onReset}>Reset all</Button>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textAlign: 'center' }}>
        SP = floor((EV + 4) / 8) · max 252 EV per stat · 510 total
      </div>
    </div>
  );
};
