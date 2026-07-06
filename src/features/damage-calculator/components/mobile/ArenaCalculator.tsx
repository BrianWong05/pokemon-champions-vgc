import React, { useState } from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { ArenaPokemonPicker } from './ArenaPokemonPicker';
import { ArenaItemPicker } from './ArenaItemPicker';
import ShowdownImportModal from '@/components/organisms/ShowdownImportModal';
import { NATURES } from '@/features/pokemon/utils/pokemon-natures';
import { Sheet } from '@/design-system/arena';
import { ArenaHud } from './ArenaHud';
import { ArenaMonCard } from './ArenaMonCard';
import { ArenaFieldConditions } from './ArenaFieldConditions';
import { ArenaMovePickerSheet } from './ArenaMovePickerSheet';
import { ArenaAdvancedSheet } from './ArenaAdvancedSheet';

type Side = 'p1' | 'p2';
type PickerField = 'species' | 'move' | 'ability' | 'item' | 'nature';
type Actions = ReturnType<typeof useCalculatorActions>;

const listRow = (activeSel: boolean): React.CSSProperties => ({
  display: 'block', width: '100%', textAlign: 'left', minHeight: 44, padding: '10px 12px',
  borderRadius: 'var(--r-sm)', border: `1px solid ${activeSel ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
  background: activeSel ? 'var(--accent-soft)' : 'var(--surface-inset)',
  color: activeSel ? 'var(--accent-hover)' : 'var(--ink-1)', fontFamily: 'var(--font-ui)',
  fontSize: 'var(--fs-body)', fontWeight: 600, cursor: 'pointer', marginBottom: 8,
});

export function ArenaCalculator({
  state, dispatch, pokemonList, moveList, p1Results, p2Results, actions, onApplySpread, onResetBuild, onOpenScan,
}: {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  p1Results: (DamageResult | null)[];
  p2Results: (DamageResult | null)[];
  p1MaxHp: number;
  p2MaxHp: number;
  actions: Actions;
  onApplySpread: (side: Side, spread: Spread) => void;
  onResetBuild: (side: Side) => void;
  onOpenScan: () => void;
}) {
  const [dir, setDir] = useState<Side>('p1');
  const [picker, setPicker] = useState<{ side: Side; field: PickerField } | null>(null);
  const [movePickerSide, setMovePickerSide] = useState<Side | null>(null);
  const [advancedSide, setAdvancedSide] = useState<Side | null>(null);
  const [showdownSide, setShowdownSide] = useState<Side | null>(null);

  const nameOf = (id: number | null) => pokemonList.find((p) => p.id === id)?.nameEn ?? '—';

  const openPicker = (side: Side) => (field: PickerField) => {
    if (field === 'move') setMovePickerSide(side);
    else setPicker({ side, field });
  };

  return (
    <>
      <ArenaHud
        state={state}
        dir={dir}
        onSwap={() => setDir((d) => (d === 'p1' ? 'p2' : 'p1'))}
        p1Results={p1Results}
        p2Results={p2Results}
        nameOf={nameOf}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 'var(--sp-4) var(--gutter) var(--sp-7)' }}>
        <ArenaMonCard side="p1" role="Attacker" state={state} dispatch={dispatch} nameOf={nameOf} onOpenPicker={openPicker('p1')} onOpenAdvanced={() => setAdvancedSide('p1')} />
        <ArenaMonCard side="p2" role="Defender" state={state} dispatch={dispatch} nameOf={nameOf} onOpenPicker={openPicker('p2')} onOpenAdvanced={() => setAdvancedSide('p2')} />

        <button
          onClick={onOpenScan}
          style={{ minHeight: 44, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', color: 'var(--accent-hover)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer' }}
        >
          Scan opponent
        </button>

        <ArenaFieldConditions state={state} dispatch={dispatch} />

        <div style={{ border: '1px dashed var(--line-2)', borderRadius: 'var(--r-md)', padding: '12px var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-4)', marginBottom: 2, textTransform: 'uppercase' }}>SP stat system</div>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>HP = Base + 75 + SP</code>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>Stat = floor((Base + 20 + SP) × Nature)</code>
        </div>
      </div>

      {/* Advanced overflow sheet */}
      <ArenaAdvancedSheet
        open={!!advancedSide}
        side={advancedSide ?? 'p1'}
        onClose={() => setAdvancedSide(null)}
        state={state}
        dispatch={dispatch}
        onApplySpread={onApplySpread}
        onResetBuild={onResetBuild}
        onImportShowdown={() => { const s = advancedSide; setAdvancedSide(null); setShowdownSide(s); }}
      />

      {/* Move picker */}
      <ArenaMovePickerSheet
        open={!!movePickerSide}
        side={movePickerSide ?? 'p1'}
        onClose={() => setMovePickerSide(null)}
        state={state}
        dispatch={dispatch}
        moveList={moveList}
        results={movePickerSide === 'p2' ? p2Results : p1Results}
      />

      {/* Species / item / ability / nature picker */}
      <Sheet open={!!picker} onClose={() => setPicker(null)} title={picker ? pickerTitle(picker.field) : ''} height={picker?.field === 'species' || picker?.field === 'item' ? '80vh' : undefined}>
        {picker && picker.field === 'species' && (
          <ArenaPokemonPicker
            pokemonList={pokemonList}
            onSelect={(p) => { void actions.handleSelectPokemon(picker.side, p); setPicker(null); }}
          />
        )}
        {picker && picker.field === 'item' && (
          <ArenaItemPicker
            selectedItem={state[picker.side].item}
            onSelect={(it) => { dispatch({ type: 'SET_ITEM', payload: { side: picker.side, item: it } }); setPicker(null); }}
          />
        )}
        {picker && picker.field === 'ability' && (
          <div>
            {state[picker.side].abilities.length === 0 && <div style={{ color: 'var(--ink-3)' }}>No abilities available.</div>}
            {state[picker.side].abilities.map((a) => (
              <button key={a} style={listRow(a === state[picker.side].activeAbility)} onClick={() => { dispatch({ type: 'SET_ACTIVE_ABILITY', payload: { side: picker.side, ability: a } }); setPicker(null); }}>{a}</button>
            ))}
          </div>
        )}
        {picker && picker.field === 'nature' && (
          <div>
            {NATURES.map((n) => (
              <button key={n} style={listRow(n === state[picker.side].nature)} onClick={() => { dispatch({ type: 'SET_NATURE', payload: { side: picker.side, nature: n } }); setPicker(null); }}>{n}</button>
            ))}
          </div>
        )}
      </Sheet>

      {/* Showdown import (reuses the existing modal) */}
      <ShowdownImportModal
        isOpen={!!showdownSide}
        onClose={() => setShowdownSide(null)}
        onImport={(set) => { if (showdownSide) actions.handleImportShowdown(showdownSide, set); setShowdownSide(null); }}
      />
    </>
  );
}

function pickerTitle(field: PickerField): string {
  return field === 'species' ? 'Pokémon' : field === 'item' ? 'Item' : field === 'ability' ? 'Ability' : 'Nature';
}
