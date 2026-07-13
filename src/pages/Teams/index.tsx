import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeams, TeamWithMembers } from '@/features/teams/hooks/useTeams';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import TeamExportModal from '@/components/organisms/TeamExportModal';
import TeamShowdownImportModal from '@/components/organisms/TeamShowdownImportModal';
import ScanTeamModal from '@/features/scan/ScanTeamModal';
import PlayerScanModal from '@/features/scan/PlayerScanModal';
import { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { getNatureStats, getFormattedNature } from '@/features/pokemon/utils/pokemon-natures';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats, pokemonAbilities, abilities, moves } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { useFormat } from '@/features/formats/FormatContext';
import { matchSpecies, matchMove, matchAbility, matchItem } from '@/features/pokemon/utils/showdown-matcher';
import { useToast } from '@/hooks/useToast';
import { ToastNotification } from '@/components/atoms/ToastNotification';
import { useViewportMode } from '@/hooks/useViewportMode';
import { ArenaTeams } from '@/features/teams/components/mobile/ArenaTeams';
import { ArenaTeamsLandscape } from '@/features/teams/components/mobile/ArenaTeamsLandscape';
import { ArenaAddTeam } from '@/features/teams/components/mobile/ArenaAddTeam';
import { ArenaReviewMon } from '@/features/teams/components/mobile/ArenaReviewMon';

const TeamsPage: React.FC = () => {
  const { teams, loading: teamsLoading, error, createTeam, deleteTeam, updateTeam } = useTeams();
  const { format } = useFormat();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  const [pokemonList, setPokemonList] = useState<PokemonBaseStats[]>([]);
  const [moveList, setMoveList] = useState<MoveData[]>([]);
  const [exportTeam, setExportTeam] = useState<TeamWithMembers | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isPlayerScanOpen, setIsPlayerScanOpen] = useState(false);
  const { toast } = useToast();
  const mode = useViewportMode();
  const isMobile = mode === 'arena';
  // Landscape "new team" full-screen view + which team to focus after a create.
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [editTeamId, setEditTeamId] = useState<string | null>(null); // when set, the add-team page edits this team
  const [focusTeamId, setFocusTeamId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ teamId: string; memberId: string } | null>(null);
  const prevTeamCount = useRef(0);
  useEffect(() => {
    if (creatingTeam && teams.length > prevTeamCount.current) {
      const newest = [...teams].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (newest) { setFocusTeamId(newest.id); setCreatingTeam(false); }
    }
    prevTeamCount.current = teams.length;
  }, [teams, creatingTeam]);

  useEffect(() => {
    const fetchMetadata = async () => {
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
          .where(eq(formats.name, format)),
          db.select().from(moves)
        ]);

        setPokemonList(pokeResult as PokemonBaseStats[]);
        setMoveList(moveResult as MoveData[]);
      } catch (error) {
        console.error('Failed to fetch pokemon list:', error);
      }
    };
    fetchMetadata();
  }, [format]);

  const handleImportTeam = async (sets: ParsedShowdownSet[], opts?: { name?: string; navigate?: boolean; teamId?: string }) => {
    const newMembers: PokemonConfig[] = [];
    const db = await getDb();
    const corrections: string[] = [];
    const errors: string[] = [];

    for (const set of sets.slice(0, 6)) {
      const speciesMatch = matchSpecies(set.species, pokemonList);
      if (!speciesMatch) {
        errors.push(`Pokémon: ${set.species}`);
        continue;
      }
      const p = speciesMatch.match;
      if (speciesMatch.isFuzzy) {
        corrections.push(`Pokémon: ${speciesMatch.originalQuery} ➔ ${speciesMatch.resolvedName}`);
      }

      let abilityResult: { nameEn: string | null; nameZh: string | null }[] = [];
      try {
        abilityResult = await db.select({ nameEn: abilities.nameEn, nameZh: abilities.nameZh })
          .from(pokemonAbilities)
          .innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id))
          .where(eq(pokemonAbilities.pokemonId, p.id))
          .orderBy(pokemonAbilities.slot);
      } catch (e) {}

      const abilityNames = abilityResult.map(a => a.nameEn).filter((name): name is string => !!name);
      const candidateAbilities = abilityResult.flatMap(a => [a.nameEn, a.nameZh].filter((name): name is string => !!name));

      const resolvedAbility = set.ability ? matchAbility(set.ability, candidateAbilities) : null;
      if (set.ability && !resolvedAbility) {
        errors.push(`Ability: ${set.ability}`);
      }
      let activeAbility = abilityResult[0]?.nameEn || null;
      if (resolvedAbility) {
        const dbRow = abilityResult.find(r => r.nameEn === resolvedAbility.match || r.nameZh === resolvedAbility.match);
        if (dbRow?.nameEn) {
          activeAbility = dbRow.nameEn;
          if (resolvedAbility.isFuzzy || resolvedAbility.match === dbRow.nameZh) {
            corrections.push(`Ability: ${resolvedAbility.originalQuery} ➔ ${dbRow.nameEn}`);
          }
        }
      }

      const resolvedItem = set.item ? matchItem(set.item) : null;
      if (set.item && !resolvedItem) {
        errors.push(`Item: ${set.item}`);
      }
      let item = set.item;
      if (resolvedItem) {
        item = resolvedItem.match;
        if (resolvedItem.isFuzzy || resolvedItem.originalQuery !== resolvedItem.resolvedName) {
          corrections.push(`Item: ${resolvedItem.originalQuery} ➔ ${resolvedItem.resolvedName}`);
        }
      }

      const movesData: (MoveData | null)[] = [];
      for (const mName of set.moves) {
        const mm = matchMove(mName, moveList);
        if (mm) {
          if (mm.isFuzzy || mm.originalQuery !== mm.resolvedName) {
            corrections.push(`Move: ${mm.originalQuery} ➔ ${mm.resolvedName}`);
          }
          movesData.push(mm.match);
        } else {
          errors.push(`Move: ${mName}`);
          movesData.push(null);
        }
      }
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
        activeAbility,
        item,
        hpPercent: 100,
        isTypeOverridden: false,
      });
    }

    if (errors.length > 0) {
      alert(`The following terms could not be recognized:\n${errors.join('\n')}`);
    }

    if (newMembers.length === 0) {
      alert('Could not find any Pokémon from the import text in our database.');
      return;
    }

    const existing = opts?.teamId ? teams.find((t) => t.id === opts.teamId) : null;
    const teamName = opts?.name?.trim() || existing?.name || (sets[0].species + "'s Team");
    let teamId: string;
    if (opts?.teamId) {
      await updateTeam(opts.teamId, teamName, newMembers);
      teamId = opts.teamId;
    } else {
      teamId = await createTeam(teamName, newMembers);
      setIsImportModalOpen(false);
    }

    if (corrections.length > 0) {
      window.dispatchEvent(new CustomEvent('showdown-imported', { detail: { side: 'team', corrections } }));
    }

    if (opts?.navigate !== false) navigate(`/teams/${teamId}`);
    return teamId;
  };

  const handleSavePlayerTeam = async (members: PokemonConfig[]) => {
    if (!members.length) return;
    const first = pokemonList.find(p => p.id === members[0].selectedId);
    const teamId = await createTeam(`${first?.nameEn ?? 'Scanned'}'s Team`, members);
    setIsPlayerScanOpen(false);
    if (mode !== 'arena-landscape') navigate(`/teams/${teamId}`);
  };

  const handleSaveReviewedMon = async (config: PokemonConfig) => {
    if (!reviewTarget) return;
    const team = teams.find((t) => t.id === reviewTarget.teamId);
    if (team) {
      const members = team.members.map((m) => (m.id === reviewTarget.memberId ? config : m.configuration));
      await updateTeam(team.id, team.name, members);
    }
    setReviewTarget(null);
  };

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

  const reviewTeam = reviewTarget ? teams.find((t) => t.id === reviewTarget.teamId) : null;
  const reviewMember = reviewTeam && reviewTarget ? reviewTeam.members.find((m) => m.id === reviewTarget.memberId) : null;
  const editTeam = editTeamId ? teams.find((t) => t.id === editTeamId) : null;
  const closeAddTeam = () => { setCreatingTeam(false); setEditTeamId(null); };

  // Shared by the landscape and portrait ArenaAddTeam full-screen flows.
  const handleAddTeamScanSave = async (members: PokemonConfig[]) => {
    if (editTeamId) {
      const tm = teams.find((t) => t.id === editTeamId);
      if (tm) await updateTeam(editTeamId, tm.name, members);
      setFocusTeamId(editTeamId); closeAddTeam();
    } else {
      await handleSavePlayerTeam(members);
    }
  };
  const handleAddTeamCreate = async (name: string, members: PokemonConfig[]) => {
    if (editTeamId) {
      await updateTeam(editTeamId, name.trim() || editTeam?.name || 'Team', members);
      setFocusTeamId(editTeamId); closeAddTeam();
    } else {
      const nm = name.trim() || `${pokemonList.find((p) => p.id === members[0]?.selectedId)?.nameEn ?? 'New'}'s Team`;
      await createTeam(nm, members);
    }
  };

  // ponytail: shared modals for both mobile frames; landscape = master-detail, portrait = card list
  if (isMobile || mode === 'arena-landscape') {
    return (
      <>
        {mode === 'arena-landscape' ? (
          creatingTeam ? (
            <ArenaAddTeam
              pokemonList={pokemonList}
              moveList={moveList}
              initialName={editTeam?.name}
              initialConfigs={editTeam ? editTeam.members.map((m) => m.configuration) : undefined}
              submitLabel={editTeam ? 'Save changes' : undefined}
              onBack={closeAddTeam}
              onScanSave={handleAddTeamScanSave}
              onCreate={handleAddTeamCreate}
            />
          ) : reviewMember && reviewTeam ? (
            <ArenaReviewMon
              member={reviewMember}
              teamName={reviewTeam.name}
              pokemonList={pokemonList}
              moveList={moveList}
              onBack={() => setReviewTarget(null)}
              onSave={handleSaveReviewedMon}
              onSendToCalc={() => navigate('/')}
            />
          ) : (
            <ArenaTeamsLandscape
              teams={teams} pokemonList={pokemonList} loading={teamsLoading} error={error}
              onNew={() => setCreatingTeam(true)}
              focusId={focusTeamId}
              onEdit={(id) => { setEditTeamId(id); setCreatingTeam(true); }}
              onDelete={handleDeleteTeam}
              onExport={setExportTeam}
              onReviewMon={(teamId, memberId) => setReviewTarget({ teamId, memberId })}
            />
          )
        ) : creatingTeam ? (
          <ArenaAddTeam
            pokemonList={pokemonList}
            moveList={moveList}
            initialMethod="scan"
            onBack={closeAddTeam}
            onScanSave={handleAddTeamScanSave}
            onCreate={handleAddTeamCreate}
          />
        ) : (
          <ArenaTeams
            teams={teams} loading={teamsLoading} error={error}
            onCreate={async (name) => { const id = await createTeam(name); navigate(`/teams/${id}`); }}
            onImport={() => setIsImportModalOpen(true)}
            onScan={() => setIsScanModalOpen(true)}
            onScanPlayer={() => setCreatingTeam(true)}
            onOpen={(id) => navigate(`/teams/${id}`)}
            onExport={(team) => setExportTeam(team)}
            onDelete={handleDeleteTeam}
          />
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
        <TeamShowdownImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportTeam}
        />
        <ScanTeamModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onImport={handleImportTeam}
          pokemonList={pokemonList}
        />
        <ToastNotification message={toast} />
      </>
    );
  }

  if (teamsLoading) {
    return <div className="container mx-auto p-4 max-w-4xl text-center text-ink-2">Loading teams...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 max-w-4xl text-danger">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-ink-1">Teams</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="text-accent bg-accent-soft hover:bg-accent-soft-hover px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Import team
          </button>
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2 rounded bg-inset text-ink-1 border border-line-2 hover:bg-raise"
          >
            Scan team
          </button>
          <button
            onClick={() => setIsPlayerScanOpen(true)}
            className="px-4 py-2 rounded bg-inset text-ink-1 border border-line-2 hover:bg-raise"
          >
            Scan my team
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-accent text-accent-ink px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors"
          >
            Create new team
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateTeam} className="bg-card p-4 rounded-xl mb-6 border border-line">
          <h2 className="text-lg font-semibold mb-3 text-ink-1">Create team</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team Name"
              className="flex-1 border border-line-2 rounded-md px-3 py-2 bg-inset text-ink-1 placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-ink-2 hover:bg-raise rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTeamName.trim()}
              className="bg-accent text-accent-ink px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-45"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {teams.length === 0 && !isCreating ? (
        <div className="text-center py-12 bg-card rounded-xl border border-line">
          <p className="text-ink-3 mb-4">You haven't created any teams yet.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="text-accent font-semibold hover:underline"
          >
            Create your first team
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="bg-card rounded-xl border border-line overflow-hidden flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-ink-1 line-clamp-1" title={team.name}>
                    {team.name}
                  </h3>
                  <span className="text-xs text-ink-3 whitespace-nowrap bg-inset px-2 py-1 rounded-full">
                    {team.members.length} / 6
                  </span>
                </div>
                <p className="text-sm text-ink-3 mb-4">
                  Created {team.createdAt.toLocaleDateString()}
                </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {team.members.slice(0, 6).map((member) => (
                    <div
                      key={member.id}
                      className="bg-inset border border-line p-1 rounded flex items-center justify-center gap-1"
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
                    <span className="text-sm italic text-ink-4">Empty team</span>
                  )}
                </div>
              </div>
              <div className="bg-inset px-4 py-3 border-t border-line flex justify-between">
                <div className="flex gap-4">
                  <Link
                    to={`/teams/${team.id}`}
                    className="text-accent hover:text-accent-hover font-medium text-sm transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setExportTeam(team)}
                    className="text-accent hover:text-accent-hover font-medium text-sm transition-colors"
                  >
                    Export
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteTeam(team.id, team.name)}
                  className="text-danger hover:underline font-medium text-sm transition-colors"
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

      <TeamShowdownImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTeam}
      />

      <ScanTeamModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onImport={handleImportTeam}
        pokemonList={pokemonList}
      />
      <PlayerScanModal
        isOpen={isPlayerScanOpen}
        onClose={() => setIsPlayerScanOpen(false)}
        pokemonList={pokemonList}
        moveList={moveList}
        onSave={handleSavePlayerTeam}
      />
      <ToastNotification message={toast} />
    </div>
  );
};

export default TeamsPage;
