// Mega form cycling for the calculator's Mega button: base -> mega(-x) ->
// mega(-y) -> base. Mega forms are separate dex entries whose identifier is
// the base's plus a '-mega' suffix (charizard -> charizard-mega-x).
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const MEGA_RE = /-mega(-[a-z]+)?$/;

export function megaCycleTarget(currentId: number | null, list: PokemonBaseStats[]): PokemonBaseStats | null {
  const current = list.find((p) => p.id === currentId);
  if (!current?.identifier) return null;

  const baseIdentifier = current.identifier.replace(MEGA_RE, '');
  const megas = list
    .filter((p) => p.identifier.startsWith(baseIdentifier + '-mega') && MEGA_RE.test(p.identifier))
    .sort((a, b) => a.identifier.localeCompare(b.identifier));
  if (megas.length === 0) return null;

  if (!MEGA_RE.test(current.identifier)) return megas[0];
  const idx = megas.findIndex((p) => p.id === current.id);
  return megas[idx + 1] ?? list.find((p) => p.identifier === baseIdentifier) ?? null;
}
