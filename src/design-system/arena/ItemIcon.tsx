import React from 'react';
import ItemImage from '@/components/atoms/ItemImage';

/**
 * ItemIcon — small held-item icon in the DS frame, sourced from the app's local
 * `ItemImage` atom (by item name) rather than the DS's PokéAPI CDN.
 */
export function ItemIcon({ item, size = 22, framed = true, style = {} }: {
  item: string | null; size?: number; framed?: boolean; style?: React.CSSProperties;
}) {
  const hasItem = !!item && item !== 'None';
  const img = hasItem
    ? <ItemImage name={item} className="max-w-full max-h-full object-contain" />
    : <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.5, fontWeight: 700, color: 'var(--ink-3)', lineHeight: 1 }}>?</span>;
  if (!framed) {
    return <span style={{ display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center', ...style }}>{img}</span>;
  }
  return (
    <span
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size + 8,
        height: size + 8,
        background: 'var(--navy-900)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-pill)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {img}
    </span>
  );
}
