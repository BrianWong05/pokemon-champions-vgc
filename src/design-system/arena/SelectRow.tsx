import React from 'react';
import { Icon } from './Icon';

/**
 * SelectRow — a tappable field showing a label + current value with a chevron.
 * Stands in for a dropdown/picker (move, ability, item, nature).
 * `leading` renders a node before the value (e.g. an ItemIcon or type dot).
 */
export function SelectRow({ label, value, leading = null, onClick, style = {} }: {
  label: string; value: React.ReactNode; leading?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        minHeight: 44,
        padding: '8px 10px 8px 12px',
        background: 'var(--surface-inset)',
        border: '1px solid var(--line-2)',
        borderRadius: 'var(--r-sm)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-xs)',
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-wide)',
        color: 'var(--text-muted)',
        flex: '0 0 auto',
        minWidth: 52,
      }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
        {leading}
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--fs-body)',
          fontWeight: 'var(--fw-semibold)',
          color: 'var(--ink-1)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{value}</span>
      </span>
      <Icon name="chevron-right" size={16} color="var(--ink-3)" />
    </button>
  );
}
