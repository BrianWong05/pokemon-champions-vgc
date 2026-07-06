import React from 'react';
import { Sprite, Icon, Badge, StatChip, Sheet, TypeBadge } from '@/design-system/arena';
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

const Row: React.FC<{ mon: PokemonWithSpeeds; onClick: () => void }> = ({ mon, onClick }) => (
  <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--surface-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', cursor: 'pointer' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <Sprite dex={mon.id} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mon.name}</div>
        {mon.nameZh && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{mon.nameZh}</div>}
      </div>
      <Icon name="chevron-right" size={16} color="var(--ink-3)" />
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <StatChip label="Max+" value={mon.maxPlus} tone="accent" />
      <StatChip label="Max" value={mon.maxNeutral} tone="muted" />
      <StatChip label="Uninvested" value={mon.uninvested} tone="muted" />
      <StatChip label="Min−" value={mon.minMinus} tone="danger" />
    </div>
  </button>
);

export const ArenaSpeedTiers: React.FC<ArenaSpeedTiersProps> = ({ groups, isLoading, onSelect, detail, otherForms, onCloseDetail, onFormSelect }) => {
  if (isLoading) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading speed tiers…</div>;
  return (
    <div style={{ paddingBottom: 'var(--sp-7)' }}>
      {groups.map((g) => (
        <div key={g.baseSpeed}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px var(--gutter)', background: 'var(--surface-sticky)', borderBottom: '1px solid var(--line-1)' }}>
            <Icon name="gauge" size={14} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '0.02em' }}>Base {g.baseSpeed}</span>
            <span style={{ flex: 1 }} />
            <Badge>{g.pokemon.length}</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--sp-3) var(--gutter)' }}>
            {g.pokemon.map((mon) => <Row key={mon.id} mon={mon} onClick={() => onSelect(mon.id)} />)}
          </div>
        </div>
      ))}
      <Sheet open={!!detail} onClose={onCloseDetail} title={detail?.nameEn ?? ''}>
        {detail && <Detail mon={detail} forms={otherForms} onFormSelect={onFormSelect} />}
      </Sheet>
    </div>
  );
};
