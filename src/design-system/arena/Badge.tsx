import React from 'react';

type Tone = 'neutral' | 'accent' | 'safe' | 'danger' | 'field';

const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: 'var(--surface-inset)', fg: 'var(--ink-2)', bd: 'var(--line-2)' },
  accent:  { bg: 'var(--accent-soft)', fg: 'var(--accent-hover)', bd: 'var(--accent-soft-line)' },
  safe:    { bg: 'var(--safe-soft)', fg: 'var(--safe)', bd: 'var(--safe-line)' },
  danger:  { bg: 'var(--danger-soft)', fg: 'var(--danger)', bd: 'var(--danger-line)' },
  field:   { bg: 'var(--field-soft)', fg: 'var(--field)', bd: 'var(--field-line)' },
};

/**
 * Badge — small status pill. `solid` makes the count-style filled badge;
 * otherwise a soft tinted pill.
 */
export function Badge({ children, tone = 'neutral', solid = false, style = {} }: {
  children: React.ReactNode; tone?: Tone; solid?: boolean; style?: React.CSSProperties;
}) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 9px',
        borderRadius: 'var(--r-pill)',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-xs)',
        fontWeight: 'var(--fw-bold)',
        letterSpacing: '0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        background: solid ? t.fg : t.bg,
        color: solid ? 'var(--navy-900)' : t.fg,
        border: `1px solid ${solid ? 'transparent' : t.bd}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
