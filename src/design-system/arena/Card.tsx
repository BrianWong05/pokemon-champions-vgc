import React from 'react';

/**
 * Card — the raised surface that holds everything. Flat fill + hairline border.
 * `inset` for a card-on-card / input surface.
 */
export function Card({ children, inset = false, padded = true, style = {}, ...rest }: {
  children?: React.ReactNode; inset?: boolean; padded?: boolean; style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: inset ? 'var(--surface-inset)' : 'var(--surface-card)',
        border: `1px solid ${inset ? 'var(--line-2)' : 'var(--border-card)'}`,
        borderRadius: inset ? 'var(--r-sm)' : 'var(--r-md)',
        padding: padded ? 'var(--sp-4)' : 0,
        fontFamily: 'var(--font-ui)',
        color: 'var(--text-body)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** CardHeader — title row with optional right-aligned action/badge. */
export function CardHeader({ title, sub = null, right = null, icon = null, style = {} }: {
  title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; icon?: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)', ...style }}>
      {icon}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)' }}>{title}</div>
        {sub && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}
