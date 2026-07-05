import { useState, useEffect, useCallback } from 'react';
import { useTeams, TeamWithMembers } from '@/features/teams/hooks/useTeams';
import { pokemonRepository } from '@/db/repositories/pokemon.repo';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { getNatureStats, getFormattedNature } from '@/features/pokemon/utils/pokemon-natures';
import { useModalRegistry } from '@/hooks/useModalRegistry';
import { formatShowdownSet } from '@/features/pokemon/utils/showdown-formatter';
import { useFormat } from '@/features/formats/FormatContext';
import { matchSpecies, matchAbility, matchMove, matchItem } from '@/features/pokemon/utils/showdown-matcher';

export function useTeamDetail(id: string | undefined) {
  const { getTeam, updateTeam, loading: teamsLoading } = useTeams();
  const { format } = useFormat();
  
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  
  const modals = useModalRegistry({
    editor: false,
    export: false,
    exportSingle: false,
    importTeam: false,
    importSingle: false
  });
  
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [currentConfig, setCurrentConfig] = useState<PokemonConfig | null>(null);
  const [exportText, setExportText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pokeResult, moveResult] = await Promise.all([
          pokemonRepository.getPokemonListByFormat(format),
          pokemonRepository.getAllMoves()
        ]);
        setPokemonList(pokeResult);
        setMoveList(moveResult);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchData();
  }, [format]);

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

  const handleAddPokemonClick = async (p: PokemonBaseStats) => {
    let abilityNames: string[] = [];
    try {
      abilityNames = await pokemonRepository.getPokemonAbilities(p.id);
    } catch (e) {
      console.error('Failed to fetch abilities:', e);
    }

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
      abilities: abilityNames,
      activeAbility: abilityNames[0] || null,
      item: null,
      hpPercent: 100,
      isTypeOverridden: false,
    };
    
    setEditingMemberIndex(null);
    setCurrentConfig(initialConfig);
    modals.openModal('editor');
  };

  const handleEditPokemonClick = useCallback((index: number) => {
    if (!team) return;
    setEditingMemberIndex(index);
    setCurrentConfig(team.members[index].configuration);
    modals.openModal('editor');
  }, [team, modals]);

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

  const handleRenameTeam = async (newName: string) => {
    if (!team) return;
    try {
      await updateTeam(team.id, newName, team.members.map(m => m.configuration));
      const updatedTeam = await getTeam(team.id);
      setTeam(updatedTeam);
    } catch (err) {
      console.error('Failed to rename team:', err);
    }
  };

  const handleExportIndividual = useCallback((index: number) => {
    if (!team) return;
    const member = team.members[index];
    const speciesName = pokemonList.find(p => p.id === member.configuration.selectedId)?.nameEn || 'Unknown';
    const text = formatShowdownSet(member.configuration, speciesName);
    setExportText(text);
    modals.openModal('exportSingle');
  }, [team, pokemonList, modals]);

  const handleRemovePokemon = useCallback(async (orderToRemove: number) => {
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
  }, [team, updateTeam, getTeam]);

  const handleImportTeamShowdown = async (sets: ParsedShowdownSet[]) => {
    if (!team) return;

    const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newMembers: PokemonConfig[] = [];

    for (const set of sets.slice(0, 6)) {
      const showdownNorm = normalizeName(set.species);
      let p = pokemonList.find(p => normalizeName(p.nameEn) === showdownNorm);

      if (!p) {
        const megaMatch = showdownNorm.match(/^([a-z]+)mega([xy])?$/);
        if (megaMatch) {
          const expectedDbMega = `mega${megaMatch[1]}${megaMatch[2] || ''}`;
          p = pokemonList.find(p => normalizeName(p.nameEn) === expectedDbMega);
        }
      }

      if (!p && showdownNorm === 'indeedeef') {
        p = pokemonList.find(p => normalizeName(p.nameEn) === 'indeedee');
      }

      if (!p) {
        const prefix = set.species.toLowerCase().split('-')[0];
        p = pokemonList.find(p => p.nameEn.toLowerCase() === prefix) || 
            pokemonList.find(p => p.nameEn.toLowerCase().includes(prefix));
      }

      if (!p) continue;

      let abilityNames: string[] = [];
      try {
        abilityNames = await pokemonRepository.getPokemonAbilities(p.id);
      } catch (e) {}

      const movesData = set.moves.map(mName => moveList.find(m => m.nameEn.toLowerCase() === mName.toLowerCase()) || null);
      while (movesData.length < 4) movesData.push(null);
      const natureStats = getNatureStats(set.nature);

      newMembers.push({
        selectedId: p.id,
        type1: p.type1,
        type2: p.type2,
        baseHp: p.baseHp,
        baseAtk: p.baseAttack,
        baseDef: p.baseDefense,
        baseSpa: p.baseSpAtk,
        baseSpd: p.baseSpDef,
        baseSpe: p.baseSpeed,
        spHp: set.evs.hp,
        spAtk: set.evs.atk,
        spDef: set.evs.def,
        spSpa: set.evs.spa,
        spSpd: set.evs.spd,
        spSpe: set.evs.spe,
        nature: getFormattedNature(set.nature),
        boostedStat: natureStats.boostedStat,
        hinderedStat: natureStats.hinderedStat,
        moves: movesData.slice(0, 4),
        activeMoveIndex: 0,
        abilities: abilityNames,
        activeAbility: set.ability && abilityNames.includes(set.ability) ? set.ability : (abilityNames[0] || null),
        item: set.item,
        hpPercent: 100,
        isTypeOverridden: false,
      });
    }

    if (newMembers.length === 0) {
      alert('Could not find any Pokémon from the import text in our database.');
      return;
    }

    if (window.confirm(`Found ${newMembers.length} Pokémon. This will OVERWRITE your current team. Proceed?`)) {
      try {
        await updateTeam(team.id, team.name, newMembers);
        const updatedTeam = await getTeam(team.id);
        setTeam(updatedTeam);
      } catch (err) {
        console.error('Failed to import team:', err);
      }
    }
  };

  const handleImportSingleShowdown = async (set: ParsedShowdownSet) => {
    if (!team) return;

    const corrections: string[] = [];

    const speciesMatch = matchSpecies(set.species, pokemonList);
    if (!speciesMatch) {
      alert(`Could not find Pokémon matching "${set.species}"`);
      return;
    }
    const p = speciesMatch.match;
    if (speciesMatch.isFuzzy) {
      corrections.push(`Pokémon: ${speciesMatch.originalQuery} ➔ ${speciesMatch.resolvedName}`);
    }

    let abilityNames: string[] = [];
    try {
      abilityNames = await pokemonRepository.getPokemonAbilities(p.id);
    } catch (e) {}

    const resolvedAbility = set.ability ? matchAbility(set.ability, abilityNames) : null;
    let activeAbility = abilityNames[0] || null;
    if (resolvedAbility) {
      activeAbility = resolvedAbility.match;
      if (resolvedAbility.isFuzzy) {
        corrections.push(`Ability: ${resolvedAbility.originalQuery} ➔ ${resolvedAbility.resolvedName}`);
      }
    }

    const resolvedItem = set.item ? matchItem(set.item) : null;
    let item = set.item;
    if (resolvedItem) {
      item = resolvedItem.match;
      if (resolvedItem.isFuzzy) {
        corrections.push(`Item: ${resolvedItem.originalQuery} ➔ ${resolvedItem.resolvedName}`);
      }
    }

    const movesData = set.moves.map(mName => {
      const mm = matchMove(mName, moveList);
      if (mm) {
        if (mm.isFuzzy) {
          corrections.push(`Move: ${mm.originalQuery} ➔ ${mm.resolvedName}`);
        }
        return mm.match;
      }
      return null;
    });

    while (movesData.length < 4) movesData.push(null);
    const natureStats = getNatureStats(set.nature);

    const newConfig: PokemonConfig = {
      selectedId: p.id,
      type1: p.type1,
      type2: p.type2,
      baseHp: p.baseHp,
      baseAtk: p.baseAttack,
      baseDef: p.baseDefense,
      baseSpa: p.baseSpAtk,
      baseSpd: p.baseSpDef,
      baseSpe: p.baseSpeed,
      spHp: set.evs.hp,
      spAtk: set.evs.atk,
      spDef: set.evs.def,
      spSpa: set.evs.spa,
      spSpd: set.evs.spd,
      spSpe: set.evs.spe,
      nature: getFormattedNature(set.nature),
      boostedStat: natureStats.boostedStat,
      hinderedStat: natureStats.hinderedStat,
      moves: movesData.slice(0, 4),
      activeMoveIndex: 0,
      abilities: abilityNames,
      activeAbility,
      item,
      hpPercent: 100,
      isTypeOverridden: false,
    };

    const newMembers = [...team.members.map(m => m.configuration), newConfig];
    try {
      await updateTeam(team.id, team.name, newMembers);
      const updatedTeam = await getTeam(team.id);
      setTeam(updatedTeam);
    } catch (err) {
      console.error('Failed to add Pokémon via Showdown:', err);
    }

    if (corrections.length > 0) {
      window.dispatchEvent(new CustomEvent('showdown-imported', { detail: { side: 'single', corrections } }));
    }

    return corrections;
  };

  return {
    team,
    loading,
    error,
    pokemonList,
    moveList,
    modals,
    currentConfig,
    exportText,
    handleAddPokemonClick,
    handleEditPokemonClick,
    handleSaveMember,
    handleRenameTeam,
    handleExportIndividual,
    handleRemovePokemon,
    handleImportTeamShowdown,
    handleImportSingleShowdown
  };
}
