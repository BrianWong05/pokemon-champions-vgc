// Compact battle-roster chip row rendered inside the Defender panel: the
// opponent's confirmed six, one tap -> load as defender, ✕ ends the session.
import React from 'react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import RosterChipRow from './RosterChipRow';

interface OpponentRosterChipsProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  /** Current defender species id — its chip gets the selected ring. */
  activeId?: number | null;
  onPick: (id: number) => void;
  onClear: () => void;
}

const OpponentRosterChips: React.FC<OpponentRosterChipsProps> = ({ roster, byId, activeId, onPick, onClear }) => (
  <RosterChipRow
    label="Opp"
    tone="danger"
    entries={roster.map((id) => ({ id, name: byId.get(id)?.nameEn ?? `#${id}` }))}
    unknownCount={Math.max(0, 6 - roster.length)}
    activeId={activeId}
    onPick={onPick}
    onClear={onClear}
    pickAriaLabel={(name) => `Set ${name} as defender`}
    clearAriaLabel="End battle (clear opponent roster)"
  />
);

export default OpponentRosterChips;
