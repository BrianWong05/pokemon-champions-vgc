import React, { useMemo, useState } from 'react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { Sprite, TypeBadge, Icon } from '@/design-system/arena';

const LIMIT = 100;

/**
 * ArenaPokemonPicker — a dark, Arena-native species picker (replaces the reused
 * light PokemonSearchSelect inside the mobile sheet). Search field + a scrollable
 * list of sprite / EN + ZH name / type rows.
 */
export function ArenaPokemonPicker({ pokemonList, onSelect, autoFocus = true }: {
  pokemonList: PokemonBaseStats[];
  onSelect: (p: PokemonBaseStats) => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  const { results, total } = useMemo(() => {
    const raw = q.trim();
    const term = raw.toLowerCase();
    const filtered = term
      ? pokemonList.filter((p) => p.nameEn.toLowerCase().includes(term) || (p.nameZh ? p.nameZh.includes(raw) : false))
      : pokemonList;
    return { results: filtered.slice(0, LIMIT), total: filtered.length };
  }, [q, pokemonList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 12, display: 'inline-flex', pointerEvents: 'none' }}>
          <Icon name="search" size={18} color="var(--ink-3)" />
        </span>
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search Pokémon"
          style={{
            height: 46,
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--surface-inset)',
            border: `1px solid ${focused ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
            boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none',
            borderRadius: 'var(--r-sm)',
            color: 'var(--ink-1)',
            padding: '0 14px 0 40px',
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--fs-body)',
            fontWeight: 500,
            outline: 'none',
            colorScheme: 'dark',
            transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {results.length === 0 && (
          <div style={{ color: 'var(--ink-3)', padding: '10px 2px', fontSize: 'var(--fs-sm)' }}>No Pokémon found.</div>
        )}
        {results.map((p) => {
          const types = [p.type1, p.type2].filter(Boolean) as string[];
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                minHeight: 56,
                padding: '8px 10px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--surface-inset)',
                border: '1px solid var(--line-2)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Sprite dex={p.id} name={p.nameEn} size={40} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ color: 'var(--ink-1)', fontWeight: 700, fontSize: 'var(--fs-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nameEn}</span>
                {p.nameZh && <span style={{ color: 'var(--ink-3)', fontSize: 'var(--fs-xs)' }}>{p.nameZh}</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                {types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            </button>
          );
        })}
        {total > LIMIT && (
          <div style={{ color: 'var(--ink-4)', padding: '8px 2px 2px', fontSize: 'var(--fs-xs)', textAlign: 'center' }}>
            Showing {LIMIT} of {total} — keep typing to narrow.
          </div>
        )}
      </div>
    </div>
  );
}
