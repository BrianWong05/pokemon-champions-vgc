import React, { useState } from 'react';
import type { SpeedCompare } from '@/features/damage-calculator/utils/speed';
import { fmtStage } from '@/features/damage-calculator/utils/speed';
import { Badge } from '@/design-system/arena';

type Mode = 'actual' | 'scarf' | 'tailwind';
const MODES: { key: Mode; label: string }[] = [
  { key: 'actual', label: 'Actual' }, { key: 'scarf', label: 'Scarf' }, { key: 'tailwind', label: 'Tailwind' },
];

const stepBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)',
  border: '1px solid var(--line-2)', color: 'var(--ink-2)', fontFamily: 'var(--font-display)',
  fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
};
const micro: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' };

function RankRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 8px' }}>
      <span style={micro}>{label}</span>
      <span style={{ flex: 1 }} />
      <button aria-label={`Lower ${label}`} style={stepBtn} onClick={() => onChange(Math.max(-6, value - 1))}>−</button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', width: 28, textAlign: 'center' }}>{fmtStage(value)}</span>
      <button aria-label={`Raise ${label}`} style={stepBtn} onClick={() => onChange(Math.min(6, value + 1))}>+</button>
    </div>
  );
}

export function ArenaSpeedCompareView({
  compare, layout, youName, oppName, oppBaseSpe, youStage, oppStage, onYouStage, onOppStage, formula, trickRoom = false,
}: {
  compare: SpeedCompare;
  layout: 'columns' | 'stacked';
  youName: string; oppName: string; oppBaseSpe: number;
  youStage: number; oppStage: number;
  onYouStage: (val: number) => void; onOppStage: (val: number) => void;
  formula: string;
  trickRoom?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('actual');
  const youEff = compare.yours[mode];

  const youCol = (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...micro, marginBottom: 6 }}>{`You — ${youName}`}</div>
      <RankRow label="Spe rank" value={youStage} onChange={onYouStage} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MODES.map(({ key, label }) => {
          const on = mode === key;
          return (
            <button key={key} onClick={() => setMode(key)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', minHeight: 44,
              padding: '8px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left',
              background: on ? 'var(--accent-soft)' : 'var(--surface-inset)',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-1)' }}>{compare.yours[key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const oppCol = (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...micro, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{`Opp — ${oppName} · Base Spe ${oppBaseSpe}`}</span>
        {trickRoom && <Badge tone="field">Trick Room</Badge>}
      </div>
      <RankRow label="Spe rank" value={oppStage} onChange={onOppStage} />
      {compare.tiers.map((t) => {
        const first = trickRoom ? youEff < t.value : youEff > t.value;
        const outcome = youEff === t.value ? 'tie' : first ? 'faster' : 'outsped';
        return (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line-1)' }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{t.label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{t.value}</span>
            <Badge tone={outcome === 'faster' ? 'safe' : outcome === 'tie' ? 'field' : 'danger'}>
              {outcome === 'faster' ? 'Faster' : outcome === 'tie' ? 'Tie' : 'Outsped'}
            </Badge>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={layout === 'columns'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }
        : { display: 'flex', flexDirection: 'column', gap: 14 }}>
        {youCol}
        {oppCol}
      </div>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>{formula}</code>
    </div>
  );
}
