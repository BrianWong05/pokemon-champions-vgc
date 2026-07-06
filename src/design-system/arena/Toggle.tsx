import React from 'react';

/**
 * Toggle — compact on/off switch for binary conditions (Gravity, side effects).
 * Accent track when on. Render bare (no label) or as a labelled row.
 */
export function Toggle({ on = false, onChange, label = null, style = {} }: {
  on?: boolean; onChange?: (on: boolean) => void; label?: React.ReactNode; style?: React.CSSProperties;
}) {
  const sw = (
    <span
      onClick={() => onChange && onChange(!on)}
      style={{
        position: 'relative',
        width: 42,
        height: 26,
        flex: '0 0 auto',
        borderRadius: 999,
        cursor: 'pointer',
        background: on ? 'var(--accent)' : 'var(--surface-inset)',
        border: `1px solid ${on ? 'transparent' : 'var(--line-2)'}`,
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: on ? 18 : 2,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: on ? '#fff' : 'var(--ink-3)',
        transition: 'left var(--dur) var(--ease)',
      }} />
    </span>
  );
  if (!label) return sw;
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...style }}>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--ink-2)' }}>{label}</span>
      {sw}
    </label>
  );
}
