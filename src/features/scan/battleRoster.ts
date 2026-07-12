// Battle-session opponent roster: the 1-6 species ids the user confirmed
// from a team-preview scan, persisted until cleared or replaced. Species
// only — scanned HP lives in the separate lastScanHp store (2026-07-12 overlay spec).
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { LegalIdsBySide } from './scanFrame';
import { clearLastScanHp } from './lastScanHp';

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
  const unique = [...new Set(ids)];
  try { localStorage.setItem(KEY, JSON.stringify(unique)); } catch { /* storage unavailable */ }
}

export function clearBattleRoster(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  clearLastScanHp();
}

// Base identifiers that embed a default-form suffix (palafin-zero,
// meowstic-male, ...) also match forms under their stripped root — the
// spec's curated list; naive split('-') would break mr-mime/ho-oh/etc.
const DEFAULT_FORM_SUFFIXES = ['-male', '-zero', '-50', '-incarnate', '-single-strike', '-curly', '-standard', '-plant', '-altered', '-land', '-red-striped', '-average', '-midday', '-solo', '-disguised', '-amped', '-full-belly', '-family-of-four', '-green-plumage'];

function baseAliases(identifier: string): string[] {
  const aliases = [identifier];
  for (const s of DEFAULT_FORM_SUFFIXES) {
    if (identifier.endsWith(s)) { aliases.push(identifier.slice(0, -s.length)); break; }
  }
  return aliases;
}

// The opponent can Mega Evolve / form-change mid-battle, so the scan mask is
// the union of each confirmed species' form family. Forms are id >= 10000
// with identifiers prefixed by the base's (charizard -> charizard-mega-x);
// the id-range guard prevents cross-species prefix collisions (porygon-z is
// a BASE id, so it never joins porygon's family). Some bases embed a
// default-form suffix in their own identifier (palafin-zero, meowstic-male);
// baseAliases() also matches forms under the stripped root in that case.
export function formFamilyIds(rosterIds: number[], pokemonList: PokemonBaseStats[]): Set<number> {
  const byId = new Map(pokemonList.map((p) => [p.id, p]));
  const bases = pokemonList.filter((p) => p.id < 10000);
  const out = new Set<number>();
  for (const id of rosterIds) {
    const mon = byId.get(id);
    if (!mon) { out.add(id); continue; }
    let base = mon;
    if (mon.id >= 10000) {
      // Longest-prefix base: a form's identifier starts with its base's (or an alias of it).
      let best: PokemonBaseStats | null = null;
      for (const b of bases) {
        const alias = baseAliases(b.identifier).find((a) => mon.identifier.startsWith(a + '-'));
        if (alias && (!best || alias.length > best.identifier.length)) best = b;
      }
      if (best) base = best;
      out.add(mon.id);
    }
    out.add(base.id);
    for (const p of pokemonList) {
      if (p.id >= 10000 && baseAliases(base.identifier).some((a) => p.identifier.startsWith(a + '-'))) out.add(p.id);
    }
  }
  return out;
}

// Central mask policy for scans: battle-mode opponent tiles narrow to the
// confirmed roster's family, battle-mode player tiles to the user's own
// team's family; team-preview and legacy paths always use the full format
// set. With no masks at all, the ORIGINAL Set is returned unchanged so
// scanFrame's identity-keyed refs cache behaves exactly as before.
export function buildLegalIdsResolver(
  full: Set<number>,
  oppFamily: Set<number> | null,
  myFamily: Set<number> | null,
): LegalIdsBySide {
  if (!oppFamily && !myFamily) return full;
  return (side, mode) => {
    if (mode !== 'battle') return full;
    if (side === 'player') return myFamily ?? full;
    return oppFamily ?? full;
  };
}
