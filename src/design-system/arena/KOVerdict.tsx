import React from 'react';

type Tone = 'safe' | 'danger' | 'field';

const TONES: Record<Tone, { fg: string; bg: string; bd: string; dot: string }> = {
  safe:   { fg: 'var(--safe)', bg: 'var(--safe-soft)', bd: 'var(--safe-line)', dot: 'var(--safe)' },
  danger: { fg: 'var(--danger)', bg: 'var(--danger-soft)', bd: 'var(--danger-line)', dot: 'var(--danger)' },
  field:  { fg: 'var(--field)', bg: 'var(--field-soft)', bd: 'var(--field-line)', dot: 'var(--field)' },
};

/**
 * KOVerdict — the KO-verdict badge beside the damage readout.
 * tone 'danger' guaranteed/likely KO, 'safe' survives, 'field' it-depends.
 */
export function KOVerdict({ verdict = '2HKO', confidence = null, tone = 'danger', style = {} }: {
  verdict?: string; confidence?: string | null; tone?: Tone; style?: React.CSSProperties;
}) {
  const t = TONES[tone] || TONES.danger;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 30,
        padding: '0 12px',
        borderRadius: 'var(--r-pill)',
        background: t.bg,
        border: `1px solid ${t.bd}`,
        fontFamily: 'var(--font-display)',
        lineHeight: 1,
        ...style,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, flex: '0 0 auto' }} />
      <span style={{ fontSize: 13.5, fontWeight: 'var(--fw-bold)', color: t.fg, letterSpacing: 'var(--ls-tight)' }}>
        {verdict}
      </span>
      {confidence && (
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 'var(--fw-semibold)', color: t.fg, opacity: 0.78 }}>
          {confidence}
        </span>
      )}
    </span>
  );
}
