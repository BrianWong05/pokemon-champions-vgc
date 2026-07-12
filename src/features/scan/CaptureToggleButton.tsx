// Compact icon toggle for the floating capture bubble — lives in the app
// chrome (nav rail / app bar) so enabling is one tap from anywhere.
// Renders nothing outside Android native.
import React from 'react';
import { Icon } from '@/design-system/arena';
import { useOneTapCapture } from './useOneTapCapture';

export function CaptureToggleButton({ style = {} }: { style?: React.CSSProperties }) {
  const { supported, active, toggle } = useOneTapCapture();
  if (!supported) return null;
  return (
    <button
      type="button"
      aria-label={active ? 'Stop one-tap capture' : 'Enable one-tap capture'}
      aria-pressed={active}
      onClick={() => void toggle()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 'var(--r-pill)',
        background: active ? 'var(--accent-soft)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
        color: active ? 'var(--accent)' : 'var(--ink-2)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <Icon name="scan-line" size={18} color={active ? 'var(--accent)' : 'var(--ink-2)'} />
    </button>
  );
}
