import React from 'react';
import { Icon } from '@/design-system/arena';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonWithSpeeds } from './index';

export interface ArenaSpeedTiersLandscapeProps {
  groups: { baseSpeed: number; pokemon: PokemonWithSpeeds[] }[];
  isLoading: boolean;
  format: string;
}

const StatBox: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    minWidth: accent ? 46 : 42, padding: '2px 8px', borderRadius: 'var(--r-xs)',
    background: accent ? 'var(--accent-soft)' : 'var(--surface-card)',
    border: `1px solid ${accent ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
  }}>
    <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: accent ? 'var(--accent)' : 'var(--ink-4)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-display)', fontSize: accent ? 14 : 12.5, fontWeight: accent ? 800 : 700, color: accent ? 'var(--accent)' : 'var(--ink-3)' }}>{value}</span>
  </div>
);

const MemberChip: React.FC<{ mon: PokemonWithSpeeds }> = ({ mon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 13px 5px 6px', borderRadius: 999, background: 'var(--surface-inset)', border: '1px solid var(--line-2)' }}>
    <div style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--surface-card)', borderRadius: 8, overflow: 'hidden' }}>
      <PokemonImage id={mon.id} name={mon.name} className="max-w-[90%] max-h-[90%] object-contain" />
    </div>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>{mon.name}</span>
  </div>
);

/**
 * Landscape Speed Tiers — the format's speed reference (design 4a), grouped by base
 * speed fastest-first. Each group is a card carrying its four shared benchmarks
 * (Min− / Max / Max+ / Scarf) with the member species as chips. Renders inside
 * ArenaShell's landscape frame (the NavRail + RegPill are provided by the shell).
 */
export const ArenaSpeedTiersLandscape: React.FC<ArenaSpeedTiersLandscapeProps> = ({ groups, isLoading, format }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-page)' }}>
    {/* header */}
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderBottom: '1px solid var(--line-1)' }}>
      <Icon name="gauge" size={18} color="var(--accent)" />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>Speed tiers</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>· {format}</span>
    </div>

    {/* rows */}
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 14px' }}>
      {isLoading ? (
        <div style={{ padding: 'var(--sp-6)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading speed tiers…</div>
      ) : groups.length === 0 ? (
        <div style={{ padding: 'var(--sp-6)', color: 'var(--ink-4)', textAlign: 'center' }}>No speed data found for {format}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map((g) => {
            const b = g.pokemon[0];
            const scarf = Math.floor(b.maxPlus * 1.5);
            return (
              <div key={g.baseSpeed} style={{ border: '1px solid var(--line-1)', background: 'var(--surface-card)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', background: 'var(--surface-inset)', borderBottom: '1px solid var(--line-1)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)' }}>Base {g.baseSpeed}</span>
                  {g.pokemon.length > 1 && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', borderRadius: 999, padding: '1px 7px' }}>×{g.pokemon.length}</span>
                  )}
                  <span style={{ flex: 1 }} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                    <StatBox label="Min−" value={b.minMinus} />
                    <StatBox label="Max" value={b.maxNeutral} />
                    <StatBox label="Max+" value={b.maxPlus} accent />
                    <StatBox label="Scarf" value={scarf} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '10px 12px' }}>
                  {g.pokemon.map((m) => <MemberChip key={m.id} mon={m} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* footer legend */}
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--line-1)', background: 'var(--surface-sticky)' }}>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>Lv 50 · Max+ = 32 SP, boosting nature · Scarf ×1.5</span>
    </div>
  </div>
);
