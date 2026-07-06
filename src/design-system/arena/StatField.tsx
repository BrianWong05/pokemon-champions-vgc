import React from 'react';

/**
 * StatField — one labelled stat-investment input (HP / Atk / Def / SpA / SpD / Spe).
 * Custom "SP" system: the value is the SP invested. Read-only unless an onChange is given.
 */
export function StatField({ label, value, max = 252, active = false, onChange, style = {} }: {
  label: string; value: number | string; max?: number; active?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; style?: React.CSSProperties;
}) {
  const isSpeed = label === 'Spe';
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'var(--surface-inset)',
        border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
        borderRadius: 'var(--r-sm)',
        padding: '7px 9px',
        minWidth: 0,
        ...style,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-xs)',
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-wide)',
        color: active || isSpeed ? 'var(--accent-hover)' : 'var(--text-muted)',
      }}>{label}</span>
      <input
        value={value}
        onChange={onChange}
        readOnly={!onChange}
        inputMode="numeric"
        max={max}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 'var(--fw-bold)',
          color: Number(value) > 0 ? 'var(--ink-1)' : 'var(--ink-4)',
          letterSpacing: 'var(--ls-tight)',
        }}
      />
    </label>
  );
}

/** StatGrid — six StatFields in a responsive 3-column grid. */
export function StatGrid({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, ...style }}>
      {children}
    </div>
  );
}
