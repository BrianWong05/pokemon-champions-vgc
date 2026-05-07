import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeams, TeamWithMembers } from '@/hooks/useTeams';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, moves } from '@/db/schema';
import { eq } from 'drizzle-orm';
import TeamMemberEditorModal from '@/components/organisms/TeamMemberEditorModal';
import { PokemonConfig } from '@/hooks/usePokemonEditor';
import PokemonSearchSelect from '@/components/molecules/PokemonSearchSelect';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import TypeBadge from '@/components/atoms/TypeBadge';
import Typography from '@/components/atoms/Typography';
import TeamMemberStatDisplay from '@/components/molecules/TeamMemberStatDisplay';

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getTeam, updateTeam, loading: teamsLoading } = useTeams();
  
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [currentConfig, setCurrentConfig] = useState<PokemonConfig | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await getDb();
        const [pokeResult, moveResult] = await Promise.all([
          db.select({
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
          .where(eq(formats.name, 'Regulation M-A')),
          db.select().from(moves)
        ]);
        
        setPokemonList(pokeResult as PokemonBaseStats[]);
        setMoveList(moveResult as MoveData[]);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchData();
  }, []);

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

  const handleAddPokemonClick = (p: PokemonBaseStats) => {
    const initialConfig: PokemonConfig = {
      selectedId: p.id,
      type1: p.type1,
      type2: p.type2,
      baseHp: p.baseHp,
      baseAtk: p.baseAttack,
      baseDef: p.baseDefense,
      baseSpa: p.baseSpAtk,
      baseSpd: p.baseSpDef,
      baseSpe: p.baseSpeed,
      spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
      nature: 'Hardy',
      boostedStat: null,
      hinderedStat: null,
      moves: [null, null, null, null],
      activeMoveIndex: 0,
      abilities: [],
      activeAbility: null,
      item: null,
      hpPercent: 100,
      isTypeOverridden: false,
    };
    
    setEditingMemberIndex(null);
    setCurrentConfig(initialConfig);
    setIsEditorOpen(true);
  };

  const handleEditPokemonClick = (index: number) => {
    if (!team) return;
    setEditingMemberIndex(index);
    setCurrentConfig(team.members[index].configuration);
    setIsEditorOpen(true);
  };

  const handleSaveMember = async (config: PokemonConfig) => {
    if (!team) return;

    let newMembers = [...team.members.map(m => m.configuration)];
    if (editingMemberIndex !== null) {
      newMembers[editingMemberIndex] = config;
    } else {
      newMembers.push(config);
    }

    try {
      await updateTeam(team.id, team.name, newMembers);
      const updatedTeam = await getTeam(team.id);
      setTeam(updatedTeam);
    } catch (err) {
      console.error('Failed to save team member:', err);
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
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-8">
        <Link to="/teams" className="text-blue-600 hover:underline mb-4 inline-block font-semibold">
          &larr; Back to Teams
        </Link>
        <div className="flex justify-between items-end bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-1">{team.name}</h1>
            <p className="text-gray-400 font-medium">Created {team.createdAt.toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">
              {team.members.length} / 6 Members
            </div>
            <div className="flex gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full ${i < team.members.length ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {team.members.map((member, idx) => (
          <div key={member.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col group transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden shrink-0">
                  <PokemonImage id={member.configuration.selectedId!} name={member.configuration.selectedId?.toString() || ''} className="w-12 h-12" />
                </div>
                <div className="flex flex-col items-end">
                   <div className="flex gap-1">
                    <TypeBadge type={member.configuration.type1 || 'normal'} size="sm" />
                    {member.configuration.type2 && <TypeBadge type={member.configuration.type2} size="sm" />}
                  </div>
                </div>
              </div>

              <h3 className="font-black text-xl text-gray-800 mb-1 truncate">
                {pokemonList.find(p => p.id === member.configuration.selectedId)?.nameEn || 'Unknown'}
              </h3>
              
              <div className="space-y-1.5 text-xs font-bold text-gray-500 mb-4">
                <div className="flex justify-between items-center">
                  <span className="uppercase tracking-tighter">Item:</span>
                  <div className="flex items-center gap-1.5">
                    {member.configuration.item && member.configuration.item !== 'None' && (
                      <div className="w-5 h-5 flex items-center justify-center bg-gray-50 rounded-md border border-gray-100 overflow-hidden shrink-0">
                        <ItemImage name={member.configuration.item} className="w-4 h-4 object-contain" />
                      </div>
                    )}
                    <span className="text-blue-600">{member.configuration.item || 'None'}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="uppercase tracking-tighter">Ability:</span>
                  <span className="text-indigo-600">{member.configuration.activeAbility || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="uppercase tracking-tighter">Nature:</span>
                  <span className="text-amber-600">{member.configuration.nature}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50 mb-4">
                {member.configuration.moves.map((move, mIdx) => (
                  <div key={mIdx} className="text-[10px] font-black text-gray-400 truncate bg-gray-50 px-2 py-1 rounded-lg">
                    {move?.nameEn || '-'}
                  </div>
                ))}
              </div>

              <TeamMemberStatDisplay config={member.configuration} pokemonList={pokemonList} />
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => handleEditPokemonClick(idx)}
                className="text-blue-600 hover:text-blue-800 font-black text-xs uppercase tracking-widest transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleRemovePokemon(member.order)}
                className="text-red-400 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {team.members.length < 6 && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center min-h-[300px] transition-colors hover:border-blue-300 group">
            <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[10px] font-black mb-4">
              Add New Member
            </Typography>
            <div className="w-full">
               <PokemonSearchSelect 
                label="" 
                pokemonList={pokemonList} 
                onSelect={handleAddPokemonClick}
              />
            </div>
            <div className="mt-6 text-center text-gray-300 group-hover:text-blue-400 transition-colors">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-bold">Search to add</p>
            </div>
          </div>
        )}
      </div>

      <TeamMemberEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveMember}
        initialConfig={currentConfig}
        pokemonList={pokemonList}
        moveList={moveList}
      />
    </div>
  );
};

export default TeamDetailPage;
