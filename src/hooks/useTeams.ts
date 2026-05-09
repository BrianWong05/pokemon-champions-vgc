import { useState, useCallback, useEffect } from 'react';
import { teamRepository, TeamWithMembers } from '@/db/repositories/team.repo';
import { PokemonConfig } from '@/hooks/usePokemonEditor';

export type { Team, TeamMember, TeamWithMembers } from '@/db/repositories/team.repo';

export const useTeams = () => {
  const [allTeams, setAllTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const teamsWithMembers = await teamRepository.getAllTeams();
      setAllTeams(teamsWithMembers);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeam = useCallback(async (name: string, members: PokemonConfig[] = []) => {
    try {
      const newTeamId = await teamRepository.createTeam(name, members);
      await fetchTeams();
      return newTeamId;
    } catch (err) {
      console.error("Failed to create team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const updateTeam = useCallback(async (teamId: string, name: string, members: PokemonConfig[]) => {
    try {
      await teamRepository.updateTeam(teamId, name, members);
      await fetchTeams();
    } catch (err) {
      console.error("Failed to update team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      await teamRepository.deleteTeam(teamId);
      await fetchTeams();
    } catch (err) {
      console.error("Failed to delete team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const getTeam = useCallback(async (teamId: string): Promise<TeamWithMembers | null> => {
    try {
      return await teamRepository.getTeamById(teamId);
    } catch (err) {
      console.error("Failed to get team:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Try to save to localStorage to persist across sessions since sql.js is in-memory
  useEffect(() => {
    if (!loading && allTeams.length > 0) {
      localStorage.setItem('vgc_teams', JSON.stringify(allTeams));
    }
  }, [allTeams, loading]);

  // Optional: Restore from localStorage if DB is empty
  useEffect(() => {
    const restoreFromStorage = async () => {
      if (!loading && allTeams.length === 0) {
        const stored = localStorage.getItem('vgc_teams');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as TeamWithMembers[];
            // Restore missing teams to DB
            for (const team of parsed) {
              await teamRepository.restoreTeam(team);
            }
            if (parsed.length > 0) {
              fetchTeams();
            }
          } catch (e) {
            console.error('Failed to restore teams from localStorage', e);
          }
        }
      }
    };
    restoreFromStorage();
  }, [loading, allTeams.length, fetchTeams]);

  return {
    teams: allTeams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeam,
  };
};
