import React from 'react';
import { Icon } from './Icon';

/**
 * Sheet — bottom sheet / detail panel that slides up over a scrim. Controlled via `open`.
 * Renders inside the shell's relatively-positioned frame (absolute inset:0).
 */
export function Sheet({ open, onClose, title = null, children, maxHeight = '78vh' }: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children?: React.ReactNode; maxHeight?: string;
}) {
  return (
    <div aria-hidden={!open} style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: open ? 'auto' : 'none' }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,10,0.62)', opacity: open ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--line-2)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          boxShadow: 'var(--shadow-pop)',
          transform: open ? 'translateY(0)' : 'translateY(101%)',
          transition: 'transform var(--dur) var(--ease)',
        }}
      >
        <div style={{ position: 'relative', paddingTop: 10, minHeight: 34 }}>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line-3)' }} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', top: 2, right: 4, width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="x" size={20} color="var(--ink-3)" />
          </button>
        </div>
        {title && (
          <div style={{ padding: '2px var(--gutter) 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: 'var(--ink-1)' }}>
            {title}
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: 'var(--sp-4) var(--gutter) var(--sp-6)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
