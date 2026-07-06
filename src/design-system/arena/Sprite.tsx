import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';

const RING: Record<'neutral' | 'accent' | 'safe' | 'danger', string> = {
  neutral: 'var(--line-2)',
  accent: 'var(--accent-soft-line)',
  safe: 'var(--safe-line)',
  danger: 'var(--danger-line)',
};

/**
 * Sprite — a Pokémon avatar in a rounded inset tile (DS chrome), sourced from the
 * app's local `PokemonImage` atom (local thumbnail by dex id, PokéAPI fallback) —
 * not the DS's PokéAPI CDN. Pass `dex` (national dex number / species id).
 */
export function Sprite({ dex, name = '', size = 56, ring = false, tone = 'neutral', style = {} }: {
  dex: number | null; name?: string; size?: number; ring?: boolean;
  tone?: 'neutral' | 'accent' | 'safe' | 'danger'; style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: '0 0 auto',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--surface-inset)',
        borderRadius: 'var(--r-md)',
        border: `1px solid ${ring ? (RING[tone] || RING.neutral) : 'var(--line-1)'}`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {dex != null && <PokemonImage id={dex} name={name} className="max-w-[86%] max-h-[86%] object-contain" />}
    </div>
  );
}
