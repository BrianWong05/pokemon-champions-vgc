import React from 'react';

const TONES = {
  accent: 'var(--accent-hover)',
  safe: 'var(--safe)',
  danger: 'var(--danger)',
  field: 'var(--field)',
  muted: 'var(--ink-3)',
} as const;

export interface StatChipProps {
  label: string;
  value: number | string;
  tone?: keyof typeof TONES;
  style?: React.CSSProperties;
}

/** Tiny labelled numeric readout for speed tiers (Max+ / Max / Uninvested / Min−). */
export const StatChip: React.FC<StatChipProps> = ({ label, value, tone = 'muted', style }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    minWidth: 0, flex: 1, padding: '6px 4px',
    background: 'var(--surface-inset)', border: '1px solid var(--line-1)',
    borderRadius: 'var(--r-sm)', ...style,
  }}>
    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--ls-wide)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: TONES[tone], letterSpacing: 'var(--ls-tight)', lineHeight: 1.1 }}>{value}</span>
  </div>
);
