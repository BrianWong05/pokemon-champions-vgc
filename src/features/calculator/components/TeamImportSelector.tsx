import React, { useState, useEffect } from 'react';
import { useTeams, TeamWithMembers, TeamMember } from '@/features/teams/hooks/useTeams';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';

interface TeamImportSelectorProps {
  onSelect: (config: PokemonConfig) => void;
  onClose: () => void;
}

export const TeamImportSelector: React.FC<TeamImportSelectorProps> = ({ onSelect, onClose }) => {
  const { teams, loading } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  if (loading) {
    return <div className="p-4 text-center text-gray-500 text-sm font-bold">Loading teams...</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="text-sm font-bold text-gray-600">No teams found</div>
        <p className="text-xs text-gray-500">You don't have any saved teams yet.</p>
        <a 
          href="/teams" 
          className="inline-block text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
        >
          Go to Team Builder
        </a>
      </div>
    );
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl">
      <div className="p-4 border-b border-gray-100">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
          Select Team
        </label>
        <select
          value={selectedTeamId || ''}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      <div className="p-4 overflow-y-auto">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
          Select Pokémon
        </label>
        
        {selectedTeam?.members.length === 0 ? (
          <div className="text-center py-4 text-xs font-bold text-gray-400">
            This team has no Pokémon yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedTeam?.members.map(member => (
              <button
                key={member.id}
                onClick={() => {
                  onSelect(member.configuration);
                  onClose();
                }}
                className="flex flex-col items-center p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors group"
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
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center p-0.5">
                      <ItemImage name={member.configuration.item} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-600 truncate w-full text-center">
                  {member.configuration.nature}
                </span>
                <span className="text-[9px] text-gray-400 truncate w-full text-center">
                  {member.configuration.activeAbility || 'No Ability'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
