import React from 'react';
import { Icon } from './Icon';

/**
 * RegPill — the regulation/format selector pill in the app bar. The whole app is
 * scoped to one regulation; tapping opens a format picker.
 */
export function RegPill({ value = 'Reg H', onClick, style = {} }: {
  value?: string; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 34,
        padding: '0 6px 0 12px',
        borderRadius: 'var(--r-pill)',
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent-soft-line)',
        color: 'var(--accent-hover)',
        fontFamily: 'var(--font-display)',
        fontSize: 13.5,
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-tight)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto' }} />
      {value}
      <Icon name="chevron-down" size={16} color="var(--accent-hover)" />
    </button>
  );
}
