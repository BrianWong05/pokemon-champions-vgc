import React from 'react';
import { RegPill } from './RegPill';

/**
 * AppBar — compact sticky top bar: screen title left, RegPill (or `right`) on the right.
 */
export function AppBar({ title, reg = 'Reg H', onReg, right, sticky = true, style = {} }: {
  title: React.ReactNode; reg?: string; onReg?: () => void; right?: React.ReactNode; sticky?: boolean; style?: React.CSSProperties;
}) {
  return (
    <header
      style={{
        position: sticky ? 'sticky' : 'static',
        top: 0,
        zIndex: 30,
        height: 'var(--appbar-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sp-3)',
        padding: '0 var(--gutter)',
        background: 'var(--bg-appbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line-1)',
        ...style,
      }}
    >
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-h1)',
        fontWeight: 'var(--fw-bold)',
        color: 'var(--ink-1)',
        letterSpacing: 'var(--ls-tight)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{title}</h1>
      {right !== undefined ? right : <RegPill value={reg} onClick={onReg} />}
    </header>
  );
}
