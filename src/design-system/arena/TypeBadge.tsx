import React from 'react';

const TYPE_VAR: Record<string, string> = {
  normal: '--type-normal', fire: '--type-fire', water: '--type-water', electric: '--type-electric',
  grass: '--type-grass', ice: '--type-ice', fighting: '--type-fighting', poison: '--type-poison',
  ground: '--type-ground', flying: '--type-flying', psychic: '--type-psychic', bug: '--type-bug',
  rock: '--type-rock', ghost: '--type-ghost', dragon: '--type-dragon', dark: '--type-dark',
  steel: '--type-steel', fairy: '--type-fairy',
};

/**
 * TypeBadge — a Pokémon type pill in that type's brand color.
 * `type` is the type name (any case). Sentence-cased label, never ALL CAPS.
 */
export function TypeBadge({ type, size = 'md', style = {} }: {
  type: string; size?: 'sm' | 'md'; style?: React.CSSProperties;
}) {
  const v = TYPE_VAR[String(type).toLowerCase()] || '--type-normal';
  const color = `var(${v})`;
  const label = String(type).charAt(0).toUpperCase() + String(type).slice(1).toLowerCase();
  const dims = size === 'sm'
    ? { height: 18, fontSize: 10, padding: '0 7px' }
    : { height: 22, fontSize: 11.5, padding: '0 9px' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--r-xs)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 'var(--fw-bold)',
        letterSpacing: '0.01em',
        lineHeight: 1,
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
        ...dims,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
