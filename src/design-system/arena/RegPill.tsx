import React from 'react';
import { Icon } from './Icon';

/**
 * RegPill — the regulation/format selector pill in the app bar. The whole app is
 * scoped to one regulation; tapping opens a format picker.
 */
export function RegPill({ value = 'Reg H', onClick, compact = false, style = {} }: {
  value?: string; onClick?: () => void; compact?: boolean; style?: React.CSSProperties;
}) {
  const label = compact ? value.replace(/^Reg(ulation)?\s*/i, '') : value;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        height: compact ? 30 : 34,
        padding: compact ? '0 8px' : '0 6px 0 12px',
        borderRadius: 'var(--r-pill)',
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent-soft-line)',
        color: 'var(--accent-hover)',
        fontFamily: 'var(--font-display)',
        fontSize: compact ? 12 : 13.5,
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-tight)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto' }} />
      {label}
      {!compact && <Icon name="chevron-down" size={16} color="var(--accent-hover)" />}
    </button>
  );
}
