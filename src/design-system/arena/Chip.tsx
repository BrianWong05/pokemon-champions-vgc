import React from 'react';

type Tone = 'accent' | 'safe' | 'danger' | 'field';

const TONES: Record<Tone, { bg: string; fg: string; bd: string }> = {
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent-hover)', bd: 'var(--accent-soft-line)' },
  safe:   { bg: 'var(--safe-soft)', fg: 'var(--safe)', bd: 'var(--safe-line)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)', bd: 'var(--danger-line)' },
  field:  { bg: 'var(--field-soft)', fg: 'var(--field)', bd: 'var(--field-line)' },
};

/**
 * Chip — a toggleable selection chip for field-condition groups.
 * Inactive: inset surface. Active: tinted with the chosen tone (accent by default).
 */
export function Chip({ children, active = false, tone = 'accent', icon = null, onClick, style = {} }: {
  children: React.ReactNode; active?: boolean; tone?: Tone; icon?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) {
  const t = TONES[tone] || TONES.accent;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 34,
        padding: '0 12px',
        flex: '0 0 auto',
        borderRadius: 'var(--r-pill)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-sm)',
        fontWeight: 'var(--fw-semibold)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'all var(--dur) var(--ease)',
        WebkitTapHighlightColor: 'transparent',
        background: active ? t.bg : 'var(--surface-inset)',
        color: active ? t.fg : 'var(--ink-2)',
        border: `1px solid ${active ? t.bd : 'var(--line-2)'}`,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * ChipGroup — a labelled row of chips. On mobile it scrolls horizontally
 * (no wrap) by default so it never pushes past the screen edge; set wrap to flow.
 */
export function ChipGroup({ label = null, children, wrap = false, style = {} }: {
  label?: React.ReactNode; children: React.ReactNode; wrap?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...style }}>
      {label && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)', textTransform: 'none', letterSpacing: 'var(--ls-wide)', color: 'var(--text-muted)', marginBottom: 8 }}>
          {label}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: 8,
          overflowX: wrap ? 'visible' : 'auto',
          paddingBottom: wrap ? 0 : 4,
          margin: wrap ? 0 : '0 calc(-1 * var(--gutter))',
          paddingLeft: wrap ? 0 : 'var(--gutter)',
          paddingRight: wrap ? 0 : 'var(--gutter)',
          scrollbarWidth: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
