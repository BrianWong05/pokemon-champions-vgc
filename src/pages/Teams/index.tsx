import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeams, TeamWithMembers } from '@/hooks/useTeams';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import TeamExportModal from '@/components/organisms/TeamExportModal';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const TeamsPage: React.FC = () => {
  const { teams, loading: teamsLoading, error, createTeam, deleteTeam } = useTeams();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [exportTeam, setExportTeam] = useState<TeamWithMembers | null>(null);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        const db = await getDb();
        const pokeResult = await db.select({
          id: pokemon.id,
          identifier: pokemon.identifier,
          nameEn: pokemon.nameEn,
          nameZh: pokemon.nameZh,
          type1: pokemon.type1,
          type2: pokemon.type2,
          baseHp: pokemon.baseHp,
          baseAttack: pokemon.baseAttack,
          baseDefense: pokemon.baseDefense,
          baseSpAtk: pokemon.baseSpAtk,
          baseSpDef: pokemon.baseSpDef,
          baseSpeed: pokemon.baseSpeed,
        })
        .from(pokemon)
        .innerJoin(formatPokemon, eq(pokemon.id, formatPokemon.pokemonId))
        .innerJoin(formats, eq(formatPokemon.formatId, formats.id))
        .where(eq(formats.name, 'Regulation M-A'));
        
        setPokemonList(pokeResult as PokemonBaseStats[]);
      } catch (error) {
        console.error('Failed to fetch pokemon list:', error);
      }
    };
    fetchPokemon();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      const newTeamId = await createTeam(newTeamName.trim());
      setNewTeamName('');
      setIsCreating(false);
      navigate(`/teams/${newTeamId}`);
    } catch (err) {
      console.error('Error creating team:', err);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the team "${name}"?`)) {
      await deleteTeam(id);
    }
  };

  if (teamsLoading) {
    return <div className="container mx-auto p-4 max-w-4xl text-center">Loading teams...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 max-w-4xl text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Teams</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New Team
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateTeam} className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Create Team</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team Name"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTeamName.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {teams.length === 0 && !isCreating ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500 mb-4">You haven't created any teams yet.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="text-blue-600 font-semibold hover:underline"
          >
            Create your first team
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-800 line-clamp-1" title={team.name}>
                    {team.name}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded-full">
                    {team.members.length} / 6
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Created {team.createdAt.toLocaleDateString()}
                </p>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {team.members.slice(0, 6).map((member) => (
                    <div 
                      key={member.id} 
                      className="bg-gray-50 border border-gray-200 p-1 rounded flex items-center justify-center gap-1"
                      title={member.configuration.nature}
                    >
                      <PokemonImage 
                        id={member.configuration.selectedId!} 
                        name={member.configuration.activeAbility || "pokemon"} 
                        className="w-16 h-16" 
                      />
                      <ItemImage 
                        name={member.configuration.item} 
                        className="w-6 h-6" 
                        title={member.configuration.item || "No Item"}
                      />
                    </div>
                  ))}
                  {team.members.length === 0 && (
                    <span className="text-sm italic text-gray-400">Empty team</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between">
                <div className="flex gap-4">
                  <Link
                    to={`/teams/${team.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                  >
                    Edit Team
                  </Link>
                  <button
                    onClick={() => setExportTeam(team)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                  >
                    Export
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteTeam(team.id, team.name)}
                  className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {exportTeam && (
        <TeamExportModal
          isOpen={!!exportTeam}
          onClose={() => setExportTeam(null)}
          teamName={exportTeam.name}
          members={exportTeam.members.map(m => ({
            configuration: m.configuration,
            speciesName: pokemonList.find(p => p.id === m.configuration.selectedId)?.nameEn || 'Unknown'
          }))}
        />
      )}
    </div>
  );
};

export default TeamsPage;
