import React from 'react';
import { Icon } from '@/design-system/arena';

/** Landscape placeholder for tabs that only have a portrait layout. */
export function RotateToPortrait({ label }: { label: string }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 24,
      textAlign: 'center',
      fontFamily: 'var(--font-ui)',
    }}>
      <Icon name="rotate-ccw" size={26} color="var(--accent)" />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink-1)' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 260, lineHeight: 1.5 }}>
        Rotate to portrait to use this tab.
      </div>
    </div>
  );
}
