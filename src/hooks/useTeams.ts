import { useState, useCallback, useEffect } from 'react';
import { getDb } from '@/db';
import { teams, teamMembers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { PokemonConfig } from '@/hooks/usePokemonEditor';

export interface Team {
  id: string;
  name: string;
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  configuration: PokemonConfig;
  order: number;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export const useTeams = () => {
  const [allTeams, setAllTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      
      const fetchedTeams = await db.select().from(teams).orderBy(desc(teams.createdAt));
      
      const teamsWithMembers: TeamWithMembers[] = [];
      
      for (const team of fetchedTeams) {
        const fetchedMembers = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id))
          .orderBy(teamMembers.order);
          
        teamsWithMembers.push({
          ...team,
          createdAt: new Date(team.createdAt),
          members: fetchedMembers.map(m => ({
            ...m,
            configuration: typeof m.configuration === 'string' 
              ? JSON.parse(m.configuration) 
              : m.configuration,
          })),
        });
      }
      
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
      const db = await getDb();
      const newTeamId = crypto.randomUUID();
      
      await db.insert(teams).values({
        id: newTeamId,
        name,
        createdAt: new Date(),
      });
      
      for (let i = 0; i < members.length; i++) {
        await db.insert(teamMembers).values({
          id: crypto.randomUUID(),
          teamId: newTeamId,
          configuration: JSON.stringify(members[i]),
          order: i,
        });
      }
      
      await fetchTeams();
      return newTeamId;
    } catch (err) {
      console.error("Failed to create team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const updateTeam = useCallback(async (teamId: string, name: string, members: PokemonConfig[]) => {
    try {
      const db = await getDb();
      
      await db.update(teams)
        .set({ name })
        .where(eq(teams.id, teamId));
        
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      
      for (let i = 0; i < members.length; i++) {
        await db.insert(teamMembers).values({
          id: crypto.randomUUID(),
          teamId,
          configuration: JSON.stringify(members[i]),
          order: i,
        });
      }
      
      await fetchTeams();
    } catch (err) {
      console.error("Failed to update team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      const db = await getDb();
      
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
      
      await fetchTeams();
    } catch (err) {
      console.error("Failed to delete team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const getTeam = useCallback(async (teamId: string): Promise<TeamWithMembers | null> => {
    try {
      const db = await getDb();
      
      const fetchedTeams = await db.select().from(teams).where(eq(teams.id, teamId));
      
      if (fetchedTeams.length === 0) return null;
      
      const team = fetchedTeams[0];
      
      const fetchedMembers = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId))
        .orderBy(teamMembers.order);
        
      return {
        ...team,
        createdAt: new Date(team.createdAt),
        members: fetchedMembers.map(m => ({
          ...m,
          configuration: typeof m.configuration === 'string' 
            ? JSON.parse(m.configuration) 
            : m.configuration,
        })),
      };
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
            const db = await getDb();
            // Restore missing teams to DB
            for (const team of parsed) {
              const existing = await db.select().from(teams).where(eq(teams.id, team.id));
              if (existing.length === 0) {
                await db.insert(teams).values({
                  id: team.id,
                  name: team.name,
                  createdAt: new Date(team.createdAt),
                });
                for (const member of team.members) {
                  await db.insert(teamMembers).values({
                    id: member.id,
                    teamId: team.id,
                    configuration: JSON.stringify(member.configuration),
                    order: member.order,
                  });
                }
              }
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
