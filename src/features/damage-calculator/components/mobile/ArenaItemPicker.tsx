import React, { useMemo, useState } from 'react';
import { Generations } from '@smogon/calc';
import { ItemIcon, Icon } from '@/design-system/arena';

const gen = Generations.get(9);
const ALL_ITEMS = Array.from(gen.items).map((i) => i.name).sort();
const POPULAR = ['Choice Band', 'Choice Specs', 'Choice Scarf', 'Life Orb', 'Assault Vest', 'Focus Sash', 'Leftovers', 'Sitrus Berry', 'Booster Energy'];
const LIMIT = 100;

const row = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 48, padding: '7px 10px',
  borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left',
  background: active ? 'var(--accent-soft)' : 'var(--surface-inset)',
  border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
});

/**
 * ArenaItemPicker — dark, Arena-native held-item picker (replaces the reused light
 * ItemSearchSelect). Search field + a "No item" row + item rows (icon + name).
 * Item pool is @smogon/calc Gen 9; empty search shows a popular shortlist.
 */
export function ArenaItemPicker({ selectedItem, onSelect }: {
  selectedItem: string | null;
  onSelect: (item: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  const { results, total } = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term ? ALL_ITEMS.filter((n) => n.toLowerCase().includes(term)) : POPULAR;
    return { results: filtered.slice(0, LIMIT), total: filtered.length };
  }, [q]);

  const none = selectedItem == null || selectedItem === 'None';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 12, display: 'inline-flex', pointerEvents: 'none' }}>
          <Icon name="search" size={18} color="var(--ink-3)" />
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search item"
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
        <button onClick={() => onSelect(null)} style={row(none)}>
          <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', flex: '0 0 auto', color: 'var(--ink-3)', fontSize: 18 }}>—</span>
          <span style={{ flex: 1, color: 'var(--ink-2)', fontWeight: 600, fontSize: 'var(--fs-body)' }}>No item</span>
        </button>
        {results.map((name) => (
          <button key={name} onClick={() => onSelect(name)} style={row(name === selectedItem)}>
            <ItemIcon item={name} size={26} />
            <span style={{ flex: 1, minWidth: 0, color: 'var(--ink-1)', fontWeight: 600, fontSize: 'var(--fs-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          </button>
        ))}
        {total > LIMIT && (
          <div style={{ color: 'var(--ink-4)', padding: '8px 2px 2px', fontSize: 'var(--fs-xs)', textAlign: 'center' }}>
            Showing {LIMIT} of {total} — keep typing to narrow.
          </div>
        )}
      </div>
    </div>
  );
}
