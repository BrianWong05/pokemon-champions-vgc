import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeams, TeamWithMembers } from '@/hooks/useTeams';
import { POKEMON_PRESETS, PokemonPreset } from '@/utils/pokemon-presets';

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getTeam, updateTeam, loading: teamsLoading } = useTeams();
  
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    const loadTeam = async () => {
      if (!id || teamsLoading) return;
      try {
        setLoading(true);
        const fetchedTeam = await getTeam(id);
        if (fetchedTeam) {
          setTeam(fetchedTeam);
        } else {
          setError('Team not found');
        }
      } catch (err) {
        setError('Failed to load team');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadTeam();
  }, [id, getTeam, teamsLoading]);

  const handleAddPokemon = async () => {
    if (!team || !selectedPreset) return;
    if (team.members.length >= 6) {
      alert('A team can only have up to 6 Pokémon.');
      return;
    }

    const presetToAdd = POKEMON_PRESETS.find(p => p.id === selectedPreset);
    if (!presetToAdd) return;

    try {
      const newMembers = [...team.members.map(m => m.configuration), presetToAdd];
      await updateTeam(team.id, team.name, newMembers);
      
      // Reload team to get updated IDs and order
      const updatedTeam = await getTeam(team.id);
      setTeam(updatedTeam);
      setIsAdding(false);
      setSelectedPreset('');
    } catch (err) {
      console.error('Failed to add Pokémon:', err);
      alert('Failed to add Pokémon to team.');
    }
  };

  const handleRemovePokemon = async (orderToRemove: number) => {
    if (!team) return;

    if (window.confirm('Remove this Pokémon from the team?')) {
      try {
        const newMembers = team.members
          .filter(m => m.order !== orderToRemove)
          .map(m => m.configuration);
          
        await updateTeam(team.id, team.name, newMembers);
        
        const updatedTeam = await getTeam(team.id);
        setTeam(updatedTeam);
      } catch (err) {
        console.error('Failed to remove Pokémon:', err);
        alert('Failed to remove Pokémon from team.');
      }
    }
  };

  if (loading || teamsLoading) {
    return <div className="container mx-auto p-4 max-w-4xl text-center">Loading team...</div>;
  }

  if (error || !team) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-red-600 mb-4">Error: {error || 'Team not found'}</div>
        <Link to="/teams" className="text-blue-600 hover:underline">&larr; Back to Teams</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Link to="/teams" className="text-blue-600 hover:underline mb-2 inline-block">&larr; Back to Teams</Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{team.name}</h1>
            <p className="text-gray-500">Created: {team.createdAt.toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold mb-1">
              {team.members.length} / 6 Slots Filled
            </div>
            <div className="flex gap-1">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-6 h-6 rounded-full border ${i < team.members.length ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300'}`}
                  title={i < team.members.length ? `Slot ${i + 1} filled` : `Slot ${i + 1} empty`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {team.members.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 flex-1">
              <h3 className="font-bold text-lg mb-1">{member.configuration.pokemonName}</h3>
              <p className="text-sm text-gray-600 mb-3">{member.configuration.name}</p>
              
              <div className="space-y-1 text-sm mb-4">
                <div><span className="font-medium">Item:</span> {member.configuration.item}</div>
                <div><span className="font-medium">Ability:</span> {member.configuration.ability}</div>
                <div><span className="font-medium">Nature:</span> {member.configuration.nature}</div>
              </div>

              <div className="text-sm">
                <span className="font-medium">Moves:</span>
                <ul className="list-disc list-inside pl-4 text-gray-700 mt-1">
                  {member.configuration.moves.map((move, idx) => (
                    <li key={idx}>{move}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => handleRemovePokemon(member.order)}
                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {team.members.length < 6 && !isAdding && (
          <div 
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer min-h-[250px]"
          >
            <span className="text-4xl mb-2">+</span>
            <span className="font-medium">Add Pokémon</span>
          </div>
        )}

        {isAdding && (
          <div className="border border-blue-300 rounded-lg p-4 bg-blue-50 flex flex-col min-h-[250px]">
            <h3 className="font-bold text-gray-800 mb-4">Add from Presets</h3>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="" disabled>Select a Pokémon preset</option>
              {POKEMON_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <div className="mt-auto flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedPreset('');
                }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPokemon}
                disabled={!selectedPreset}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 text-sm"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetailPage;
