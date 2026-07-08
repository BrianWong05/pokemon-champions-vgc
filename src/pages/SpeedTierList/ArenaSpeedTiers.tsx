import React from 'react';
import { Sprite, Sheet, TypeBadge } from '@/design-system/arena';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { FullPokemonDetail } from '@/components/organisms/PokemonDetailModal';
import type { PokemonWithSpeeds } from './index';

export interface ArenaSpeedTiersProps {
  groups: { baseSpeed: number; pokemon: PokemonWithSpeeds[] }[];
  isLoading: boolean;
  onSelect: (id: number) => void;
  detail: FullPokemonDetail | null;
  otherForms: { id: number; name: string }[];
  onCloseDetail: () => void;
  onFormSelect: (id: number) => void;
}

const STATS: { label: string; key: keyof FullPokemonDetail }[] = [
  { label: 'HP', key: 'baseHp' }, { label: 'Atk', key: 'baseAttack' },
  { label: 'Def', key: 'baseDefense' }, { label: 'SpA', key: 'baseSpAtk' },
  { label: 'SpD', key: 'baseSpDef' }, { label: 'Spe', key: 'baseSpeed' },
];

const Detail: React.FC<{ mon: FullPokemonDetail; forms: { id: number; name: string }[]; onFormSelect: (id: number) => void }> = ({ mon, forms, onFormSelect }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <Sprite dex={mon.id} size={64} ring tone="accent" />
      <div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
          {[mon.type1, mon.type2].filter(Boolean).map((t) => <TypeBadge key={t} type={String(t)} />)}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>Base speed {mon.baseSpeed}</div>
      </div>
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: 10 }}>BASE STATS</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {STATS.map(({ label, key }) => {
        const v = Number(mon[key] ?? 0);
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>{label}</span>
            <span style={{ width: 32, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', textAlign: 'right' }}>{v}</span>
            <div style={{ flex: 1, height: 8, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (v / 160) * 100)}%`, height: '100%', background: label === 'Spe' ? 'var(--accent)' : 'var(--ink-3)' }} />
            </div>
          </div>
        );
      })}
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-3)', marginBottom: 10 }}>ALTERNATE FORMS</div>
    {forms.length > 1 ? (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {forms.map((f) => (
          <button key={f.id} onClick={() => onFormSelect(f.id)} style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>{f.name}</button>
        ))}
      </div>
    ) : (
      <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No alternate forms.</div>
    )}
  </div>
);

const BenchBox: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{ padding: '5px 6px', borderRadius: 'var(--r-xs)', background: accent ? 'var(--accent-soft)' : 'var(--surface-inset)', border: `1px solid ${accent ? 'var(--accent-soft-line)' : 'var(--line-1)'}` }}>
    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: accent ? 'var(--accent)' : 'var(--ink-4)' }}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: accent ? 13.5 : 13, fontWeight: accent ? 800 : 700, color: accent ? 'var(--accent)' : 'var(--ink-3)', marginTop: 1 }}>{value}</div>
  </div>
);

const MemberRow: React.FC<{ mon: PokemonWithSpeeds; onClick: () => void }> = ({ mon, onClick }) => (
  <button
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
  >
    <div style={{ width: 40, height: 40, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', borderRadius: 10, overflow: 'hidden' }}>
      <PokemonImage id={mon.id} name={mon.name} className="max-w-full max-h-full object-contain" />
    </div>
    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mon.name}</span>
  </button>
);

/**
 * Portrait Speed Tiers — the format's speed reference (design 4b, Format view):
 * one card per base-speed tier carrying its four shared benchmarks
 * (Min− / Max / Max+ / Scarf) with the member species listed below. Renders
 * inside ArenaShell's portrait frame (AppBar + bottom TabBar). Tapping a member
 * opens its detail sheet.
 */
export const ArenaSpeedTiers: React.FC<ArenaSpeedTiersProps> = ({ groups, isLoading, onSelect, detail, otherForms, onCloseDetail, onFormSelect }) => {
  if (isLoading) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading speed tiers…</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px var(--gutter) var(--sp-7)' }}>
      {groups.map((g) => {
        const b = g.pokemon[0];
        const scarf = Math.floor(b.maxPlus * 1.5);
        return (
          <div key={g.baseSpeed} style={{ border: '1px solid var(--line-1)', background: 'var(--surface-card)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid var(--line-1)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)' }}>Base {g.baseSpeed}</span>
              {g.pokemon.length > 1 && (
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', borderRadius: 999, padding: '1px 7px' }}>×{g.pokemon.length}</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, padding: '10px 12px 0' }}>
              <BenchBox label="Min−" value={b.minMinus} />
              <BenchBox label="Max" value={b.maxNeutral} />
              <BenchBox label="Max+" value={b.maxPlus} accent />
              <BenchBox label="Scarf" value={scarf} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '11px 12px' }}>
              {g.pokemon.map((m) => <MemberRow key={m.id} mon={m} onClick={() => onSelect(m.id)} />)}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textAlign: 'center', paddingTop: 2 }}>Lv 50 · Max+ = 32 SP, boosting nature · Scarf ×1.5</div>
      <Sheet open={!!detail} onClose={onCloseDetail} title={detail?.nameEn ?? ''}>
        {detail && <Detail mon={detail} forms={otherForms} onFormSelect={onFormSelect} />}
      </Sheet>
    </div>
  );
};
