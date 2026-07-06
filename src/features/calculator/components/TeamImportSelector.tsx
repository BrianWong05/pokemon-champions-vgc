import React, { useState, useEffect } from 'react';
import { useTeams, TeamWithMembers, TeamMember } from '@/features/teams/hooks/useTeams';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface TeamImportSelectorProps {
  pokemonList: PokemonBaseStats[];
  onSelect: (config: PokemonConfig) => void;
  onClose: () => void;
}

export const TeamImportSelector: React.FC<TeamImportSelectorProps> = ({ pokemonList, onSelect, onClose }) => {
  const { teams, loading } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  if (loading) {
    return <div className="p-4 text-center text-ink-3 text-sm font-bold">Loading teams...</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="text-sm font-bold text-ink-2">No teams found</div>
        <p className="text-xs text-ink-3">You don't have any saved teams yet.</p>
        <a
          href="/teams"
          className="inline-block text-xs font-black text-accent bg-accent-soft hover:bg-accent-soft-hover px-4 py-2 rounded-lg transition-colors"
        >
          Go to team builder
        </a>
      </div>
    );
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="flex flex-col h-full bg-card rounded-xl">
      <div className="p-4 border-b border-line">
        <label className="text-[10px] font-black text-ink-3 uppercase tracking-widest block mb-1">
          Select Team
        </label>
        <select
          value={selectedTeamId || ''}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full h-10 bg-inset border border-line rounded-xl px-3 text-sm font-bold text-ink-2 outline-none focus:ring-2 focus:ring-accent/20"
        >
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      <div className="p-4 overflow-y-auto">
        <label className="text-[10px] font-black text-ink-3 uppercase tracking-widest block mb-3">
          Select Pokémon
        </label>

        {selectedTeam?.members.length === 0 ? (
          <div className="text-center py-4 text-xs font-bold text-ink-4">
            This team has no Pokémon yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedTeam?.members.map(member => {
              const p = pokemonList.find(poke => poke.id === member.configuration.selectedId);
              const displayName = p ? (p.nameZh ? `${p.nameZh} / ${p.nameEn}` : p.nameEn) : 'Unknown Pokémon';

              return (
                <button
                  key={member.id}
                  onClick={() => {
                    onSelect(member.configuration);
                    onClose();
                  }}
                  className="flex flex-col items-center p-3 bg-inset hover:bg-accent-soft rounded-xl border border-line hover:border-accent-soft-line transition-colors group"
                >
                  <div className="w-12 h-12 relative mb-2">
                    {member.configuration.selectedId && (
                      <PokemonImage
                        id={member.configuration.selectedId}
                        name="pokemon"
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    )}
                    {member.configuration.item && member.configuration.item !== 'None' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-card rounded-full flex items-center justify-center p-0.5">
                        <ItemImage name={member.configuration.item} className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-extrabold text-ink-1 line-clamp-1 w-full text-center mt-1">
                    {displayName}
                  </span>
                  <span className="text-[9px] text-ink-3 truncate w-full text-center leading-none mt-0.5">
                    {member.configuration.nature} • {member.configuration.activeAbility || 'No Ability'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
