import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { NATURES } from '@/features/pokemon/utils/pokemon-natures';
import { Sheet } from '@/design-system/arena';
import { ArenaPokemonPicker } from './ArenaPokemonPicker';
import { ArenaItemPicker } from './ArenaItemPicker';

export type CorePickerField = 'species' | 'ability' | 'item' | 'nature';
type Side = 'p1' | 'p2';

const listRow = (activeSel: boolean): React.CSSProperties => ({
  display: 'block', width: '100%', textAlign: 'left', minHeight: 44, padding: '10px 12px',
  borderRadius: 'var(--r-sm)', border: `1px solid ${activeSel ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
  background: activeSel ? 'var(--accent-soft)' : 'var(--surface-inset)',
  color: activeSel ? 'var(--accent-hover)' : 'var(--ink-1)', fontFamily: 'var(--font-ui)',
  fontSize: 'var(--fs-body)', fontWeight: 600, cursor: 'pointer', marginBottom: 8,
});

const TITLES: Record<CorePickerField, string> = {
  species: 'Pokémon', ability: 'Ability', item: 'Item', nature: 'Nature',
};

/** The species / ability / item / nature picker sheet shared by the portrait and landscape calculators. */
export function ArenaPickerSheet({ picker, onClose, state, dispatch, pokemonList, actions, autoFocus = true }: {
  picker: { side: Side; field: CorePickerField } | null;
  onClose: () => void;
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  pokemonList: PokemonBaseStats[];
  actions: ReturnType<typeof useCalculatorActions>;
  autoFocus?: boolean;
}) {
  return (
    <Sheet
      open={!!picker}
      onClose={onClose}
      title={picker ? TITLES[picker.field] : ''}
      height={picker?.field === 'species' || picker?.field === 'item' ? '80vh' : undefined}
    >
      {picker && picker.field === 'species' && (
        <ArenaPokemonPicker
          pokemonList={pokemonList}
          autoFocus={autoFocus}
          onSelect={(p) => { void actions.handleSelectPokemon(picker.side, p); onClose(); }}
        />
      )}
      {picker && picker.field === 'item' && (
        <ArenaItemPicker
          selectedItem={state[picker.side].item}
          autoFocus={autoFocus}
          onSelect={(it) => { dispatch({ type: 'SET_ITEM', payload: { side: picker.side, item: it } }); onClose(); }}
        />
      )}
      {picker && picker.field === 'ability' && (
        <div>
          {state[picker.side].abilities.length === 0 && <div style={{ color: 'var(--ink-3)' }}>No abilities available.</div>}
          {state[picker.side].abilities.map((a) => (
            <button key={a} style={listRow(a === state[picker.side].activeAbility)} onClick={() => { dispatch({ type: 'SET_ACTIVE_ABILITY', payload: { side: picker.side, ability: a } }); onClose(); }}>{a}</button>
          ))}
        </div>
      )}
      {picker && picker.field === 'nature' && (
        <div>
          {NATURES.map((n) => (
            <button key={n} style={listRow(n === state[picker.side].nature)} onClick={() => { dispatch({ type: 'SET_NATURE', payload: { side: picker.side, nature: n } }); onClose(); }}>{n}</button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
