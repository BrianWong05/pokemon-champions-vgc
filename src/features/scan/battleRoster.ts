// Battle-session opponent roster: the 1-6 species ids the user confirmed
// from a team-preview scan, persisted until cleared or replaced. Species
// only — no HP memory (spec decision).
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const KEY = 'scan.battleRoster';

export function readBattleRoster(): number[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((n) => typeof n === 'number')) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed as number[];
  } catch {
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
    return null;
  }
}

export function saveBattleRoster(ids: number[]): void {
  if (ids.length === 0) return;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}

export function clearBattleRoster(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

// The opponent can Mega Evolve / form-change mid-battle, so the scan mask is
// the union of each confirmed species' form family. Forms are id >= 10000
// with identifiers prefixed by the base's (charizard -> charizard-mega-x);
// the id-range guard prevents cross-species prefix collisions (porygon-z is
// a BASE id, so it never joins porygon's family).
export function formFamilyIds(rosterIds: number[], pokemonList: PokemonBaseStats[]): Set<number> {
  const byId = new Map(pokemonList.map((p) => [p.id, p]));
  const bases = pokemonList.filter((p) => p.id < 10000);
  const out = new Set<number>();
  for (const id of rosterIds) {
    const mon = byId.get(id);
    if (!mon) { out.add(id); continue; }
    let base = mon;
    if (mon.id >= 10000) {
      // Longest-prefix base: a form's identifier starts with its base's.
      let best: PokemonBaseStats | null = null;
      for (const b of bases) {
        if (mon.identifier.startsWith(b.identifier + '-') && (!best || b.identifier.length > best.identifier.length)) best = b;
      }
      if (best) base = best;
      out.add(mon.id);
    }
    out.add(base.id);
    for (const p of pokemonList) {
      if (p.id >= 10000 && p.identifier.startsWith(base.identifier + '-')) out.add(p.id);
    }
  }
  return out;
}
