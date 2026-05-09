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

export const teamRepository = {
  async getAllTeams(): Promise<TeamWithMembers[]> {
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
    
    return teamsWithMembers;
  },

  async getTeamById(teamId: string): Promise<TeamWithMembers | null> {
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
  },

  async createTeam(name: string, members: PokemonConfig[] = []): Promise<string> {
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
    
    return newTeamId;
  },

  async updateTeam(teamId: string, name: string, members: PokemonConfig[]): Promise<void> {
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
  },

  async deleteTeam(teamId: string): Promise<void> {
    const db = await getDb();
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));
  },
  
  async restoreTeam(team: TeamWithMembers): Promise<void> {
    const db = await getDb();
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
};
