import React, { useLayoutEffect, useRef, useState } from 'react';

const ROW = 28;

/** Option lists shared by the SP / Rank / Nature wheels. */
export const SP_OPTIONS = Array.from({ length: 33 }, (_, i) => String(i)); // 0..32
export const RANK_OPTIONS = Array.from({ length: 13 }, (_, i) => (i - 6 > 0 ? `+${i - 6}` : String(i - 6))); // -6..+6
export const NATURE_OPTIONS = ['0.9×', '1.0×', '1.1×']; // index 0 = hinder, 1 = neutral, 2 = boost

/**
 * WheelPicker — a compact vertical scroll wheel (iOS-timer style, laid in a
 * small box). Controlled by `index`; emits the settled index via `onChange`
 * once a flick comes to rest, so a fast spin doesn't fire a value per frame.
 * The centered row is the selected value, framed by an accent band.
 */
export function WheelPicker({ label, options, index, onChange, active, ariaLabel }: {
  label?: string;
  options: string[];
  index: number;
  onChange: (index: number) => void;
  active?: boolean;
  ariaLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const settled = useRef(index);      // last index reflected in scroll / emitted
  const centeredRef = useRef(index);  // live centered index during a flick
  const settleTimer = useRef<number | null>(null);
  const mounted = useRef(false);
  const [centered, setCentered] = useState(index);

  // Position on mount, and re-sync when `index` changes from outside (not our own scroll).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!mounted.current) { mounted.current = true; el.scrollTop = index * ROW; return; }
    if (settled.current !== index && centeredRef.current !== index) {
      el.scrollTop = index * ROW;
      settled.current = index;
      centeredRef.current = index;
      setCentered(index);
    }
  }, [index]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ROW)));
    if (i !== centeredRef.current) {
      centeredRef.current = i;
      setCentered(i);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(6);
    }
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (i !== settled.current) { settled.current = i; onChange(i); }
    }, 110);
  };

  const nudge = (delta: number) => {
    const el = scrollRef.current;
    if (el) el.scrollTop = Math.max(0, Math.min(options.length - 1, centeredRef.current + delta)) * ROW;
  };

  return (
    <div style={{
      padding: '4px 6px 5px', borderRadius: 8, minWidth: 0,
      background: active ? 'var(--accent-soft)' : 'var(--surface-inset)',
      border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
    }}>
      {label && (
        <div style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
      )}
      <div style={{ position: 'relative', width: '100%', height: ROW * 3, marginTop: 1 }}>
        <div style={{
          position: 'absolute', top: ROW, left: 0, right: 0, height: ROW, zIndex: 0, pointerEvents: 'none',
          background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', borderRadius: 6,
        }} />
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="arena-wheel-scroll"
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel ?? label}
          aria-valuetext={options[centered]}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { nudge(1); e.preventDefault(); }
            if (e.key === 'ArrowUp') { nudge(-1); e.preventDefault(); }
          }}
          style={{
            position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto',
            scrollSnapType: 'y mandatory', overscrollBehavior: 'contain',
            touchAction: 'pan-y', scrollbarWidth: 'none', outline: 'none',
          }}
        >
          <div style={{ height: ROW }} />
          {options.map((o, i) => (
            <div key={i} style={{
              height: ROW, display: 'flex', alignItems: 'center', justifyContent: 'center',
              scrollSnapAlign: 'center', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums',
              color: i === centered ? 'var(--accent)' : 'var(--ink-3)',
              fontSize: i === centered ? 15 : 12, fontWeight: i === centered ? 800 : 600,
              lineHeight: 1,
            }}>{o}</div>
          ))}
          <div style={{ height: ROW }} />
        </div>
      </div>
    </div>
  );
}
