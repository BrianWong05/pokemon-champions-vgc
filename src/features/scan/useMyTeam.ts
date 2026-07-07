import { useCallback, useMemo, useState } from 'react';
import type { TeamWithMembers } from '@/db/repositories/team.repo';
import { clearMyTeamId, readMyTeamId, saveMyTeamId } from './myTeam';

export function useMyTeam(teams: TeamWithMembers[]) {
  const [teamId, setTeamId] = useState<string | null>(() => readMyTeamId());
  // A stored id with no matching team (deleted, or teams still loading)
  // derives to null -> the picker shows again; the stored id is harmless.
  const team = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);
  const selectTeam = useCallback((id: string) => { saveMyTeamId(id); setTeamId(id); }, []);
  const clearTeam = useCallback(() => { clearMyTeamId(); setTeamId(null); }, []);
  return { teamId, team, selectTeam, clearTeam };
}
