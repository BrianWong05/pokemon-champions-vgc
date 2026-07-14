import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import { Card, CardHeader, Sprite, TypeBadge, ItemIcon, SelectRow, StatGrid, WheelPicker, SP_OPTIONS } from '@/design-system/arena';
import { ArenaMoveList } from './ArenaMoveList';

type SpKey = 'spHp' | 'spAtk' | 'spDef' | 'spSpa' | 'spSpd' | 'spSpe';
const SP_FIELDS: { label: string; key: SpKey }[] = [
  { label: 'HP', key: 'spHp' }, { label: 'Atk', key: 'spAtk' }, { label: 'Def', key: 'spDef' },
  { label: 'SpA', key: 'spSpa' }, { label: 'SpD', key: 'spSpd' }, { label: 'Spe', key: 'spSpe' },
];

/**
 * ArenaMonCard — the clean core controls for one side: species/types header,
 * defender HP bar, Move/Ability/Item/Nature rows, editable SP grid, and an
 * "Advanced" opener. Pickers/advanced sheets are owned by ArenaCalculator.
 */
export function ArenaMonCard({ side, role, state, dispatch, nameOf, onOpenPicker, onOpenAdvanced, extra, results }: {
  side: 'p1' | 'p2';
  role: 'Attacker' | 'Defender';
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  nameOf: (id: number | null) => string;
  onOpenPicker: (field: 'species' | 'move' | 'ability' | 'item' | 'nature') => void;
  onOpenAdvanced: () => void;
  /** Optional slot rendered directly under the card header (e.g. the battle-roster chips). */
  extra?: React.ReactNode;
  /** Per-move damage results, used by the attacker's move list. */
  results: (DamageResult | null)[];
}) {
  const s = state[side];
  const tone = role === 'Attacker' ? 'accent' : 'danger';
  const activeMove = s.moves[s.activeMoveIndex];
  const types = [s.type1, s.type2].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader
        title={
          <button
            onClick={() => onOpenPicker('species')}
            style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            {nameOf(s.selectedId) || 'Select Pokémon'}
          </button>
        }
        sub={role}
        icon={<Sprite dex={s.selectedId} name={nameOf(s.selectedId)} size={48} ring tone={tone} />}
        right={<div style={{ display: 'flex', gap: 4 }}>{types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>}
      />

      {extra}

      {role === 'Defender' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-3)' }}>Current HP</span>
          <div style={{ flex: 1, height: 8, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: s.hpPercent + '%', height: '100%', background: 'var(--safe)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{s.hpPercent}%</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {role === 'Attacker' ? (
          <ArenaMoveList
            side={s}
            results={results}
            onSelect={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side, index } })}
            onEdit={() => onOpenPicker('move')}
          />
        ) : (
          <SelectRow label="Move" value={activeMove?.nameEn ?? 'None'} leading={s.type1 ? <TypeBadge type={s.type1} size="sm" /> : null} onClick={() => onOpenPicker('move')} />
        )}
        <SelectRow label="Ability" value={s.activeAbility ?? 'None'} onClick={() => onOpenPicker('ability')} />
        <SelectRow label="Item" value={s.item ?? 'None'} leading={<ItemIcon item={s.item} size={18} />} onClick={() => onOpenPicker('item')} />
        <SelectRow label="Nature" value={s.nature} onClick={() => onOpenPicker('nature')} />
      </div>

      <StatGrid>
        {SP_FIELDS.map(({ label, key }) => (
          <WheelPicker
            key={key}
            label={label}
            options={SP_OPTIONS}
            index={s[key]}
            active={s[key] > 0}
            onChange={(i) => dispatch({ type: 'SET_SP', payload: { side, key, val: i } })}
          />
        ))}
      </StatGrid>

      <button
        onClick={onOpenAdvanced}
        style={{
          marginTop: 12,
          width: '100%',
          minHeight: 44,
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-inset)',
          border: '1px solid var(--line-2)',
          color: 'var(--text-body)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--fs-sm)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Advanced
      </button>
    </Card>
  );
}
