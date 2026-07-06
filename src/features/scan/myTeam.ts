// The user's selected Team for the calculator's attacker chips. Stores the
// TEAM ID only (a string — Team.id is a uuid-ish string); members derive
// live from useTeams() so team edits reflect immediately. Lifecycle is
// independent of battles: persists until cleared or replaced.
const KEY = 'calc.myTeamId';

export function readMyTeamId(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || !raw.trim()) {
      // intentional cleanup: a whitespace-only value is junk, remove it on read
      if (raw != null) localStorage.removeItem(KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function saveMyTeamId(id: string): void {
  if (!id.trim()) return;
  try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ }
}

export function clearMyTeamId(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
