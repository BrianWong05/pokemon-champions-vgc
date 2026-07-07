// The user's own team in the Attacker panel: no team selected -> a compact
// native select of saved Teams; selected -> a chip row where one tap loads
// that member's FULL saved build as attacker. ✕ clears the selection.
import React from 'react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { TeamMember, TeamWithMembers } from '@/db/repositories/team.repo';
import RosterChipRow from './RosterChipRow';

interface MyTeamChipsProps {
  teams: TeamWithMembers[];
  team: TeamWithMembers | null;
  byId: Map<number, PokemonBaseStats>;
  /** Current attacker species id — its chip gets the selected ring. */
  activeId?: number | null;
  onSelectTeam: (id: string) => void;
  onPick: (member: TeamMember) => void;
  onClear: () => void;
}

const MyTeamChips: React.FC<MyTeamChipsProps> = ({ teams, team, byId, activeId, onSelectTeam, onPick, onClear }) => {
  if (!team) {
    return (
      <div className="mb-3">
        <select
          className="w-full rounded-lg border border-line-2 bg-inset px-2 py-1.5 text-sm text-ink-2"
          value=""
          onChange={(e) => e.target.value && onSelectTeam(e.target.value)}
          aria-label="Select my team"
        >
          <option value="" disabled>
            {teams.length ? 'My team ▾' : 'No teams yet'}
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    );
  }

  const members = team.members.filter((m) => m.configuration.selectedId != null);

  // One chip per species (first member wins) — duplicate species on a team
  // would otherwise produce duplicate React keys; pick semantics are already
  // species-level (find() takes the first member with that id).
  const uniqueMembers = members.filter(
    (m, i) => members.findIndex((o) => o.configuration.selectedId === m.configuration.selectedId) === i,
  );

  return (
    <RosterChipRow
      label="You"
      tone="accent"
      entries={uniqueMembers.map((m) => ({
        id: m.configuration.selectedId as number,
        name: byId.get(m.configuration.selectedId as number)?.nameEn ?? `#${m.configuration.selectedId}`,
      }))}
      activeId={activeId}
      onPick={(id) => {
        // Duplicate species on one team: the first member with that id wins.
        const member = members.find((m) => m.configuration.selectedId === id);
        if (member) onPick(member);
      }}
      onClear={onClear}
      pickAriaLabel={(name) => `Load ${name} as attacker`}
      clearAriaLabel="Clear my team selection"
    />
  );
};

export default MyTeamChips;
