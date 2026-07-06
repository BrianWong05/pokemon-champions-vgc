import { eq } from 'drizzle-orm';
import { Generations } from '@smogon/calc';
import { getDb } from '../index';
import { moves, pokemonMoves, abilities, pokemonAbilities, items } from '../schema';
import { MEGA_STONES } from '@/features/pokemon/utils/items';

// Task 3/5 will re-export or alias these; define locally for now
export type ScanLang = 'en' | 'ja' | 'zh-Hant' | 'zh-Hans';
export interface TextCandidate { key: string; label: string }

export interface LocalizedNames { en: string; ja: string | null; zhHant: string | null; zhHans: string | null }
export interface MoveVocabEntry { moveId: number; names: LocalizedNames }
export interface NameVocabEntry { key: string; names: LocalizedNames }

export interface PlayerScanVocab {
  movesFor(pokemonId: number): MoveVocabEntry[];
  abilitiesFor(pokemonId: number): NameVocabEntry[];
  items: NameVocabEntry[];
}

interface VocabRows {
  moves: Array<{ id: number; nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
  learnset: Array<{ pokemonId: number; moveId: number }>;
  abilities: Array<{ pokemonId: number; nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
  items: Array<{ nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }>;
}

const legalItemNames = (): Set<string> => {
  const s = new Set<string>(MEGA_STONES);
  for (const item of Generations.get(9).items) s.add(item.name);
  return s;
};

const names = (r: { nameEn: string; nameJa: string | null; nameZh: string | null; nameZhHans: string | null }): LocalizedNames =>
  ({ en: r.nameEn, ja: r.nameJa, zhHant: r.nameZh, zhHans: r.nameZhHans });

export function buildPlayerScanVocab(rows: VocabRows): PlayerScanVocab {
  const movesById = new Map(rows.moves.map(m => [m.id, m]));
  const learnsetByPokemon = new Map<number, number[]>();
  for (const { pokemonId, moveId } of rows.learnset) {
    if (!learnsetByPokemon.has(pokemonId)) learnsetByPokemon.set(pokemonId, []);
    learnsetByPokemon.get(pokemonId)!.push(moveId);
  }
  const abilitiesByPokemon = new Map<number, NameVocabEntry[]>();
  for (const a of rows.abilities) {
    if (!abilitiesByPokemon.has(a.pokemonId)) abilitiesByPokemon.set(a.pokemonId, []);
    abilitiesByPokemon.get(a.pokemonId)!.push({ key: a.nameEn, names: names(a) });
  }
  const legal = legalItemNames();
  return {
    movesFor: (id) => (learnsetByPokemon.get(id) ?? [])
      .map(mid => movesById.get(mid))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map(m => ({ moveId: m.id, names: names(m) })),
    abilitiesFor: (id) => abilitiesByPokemon.get(id) ?? [],
    items: rows.items.filter(i => legal.has(i.nameEn)).map(i => ({ key: i.nameEn, names: names(i) })),
  };
}

let cached: Promise<PlayerScanVocab> | null = null;
export async function loadPlayerScanVocab(): Promise<PlayerScanVocab> {
  if (cached) return cached;
  cached = (async () => {
    const db = await getDb();
    const [moveRows, learnRows, abilityRows, itemRows] = await Promise.all([
      db.select().from(moves),
      db.select().from(pokemonMoves),
      db.select({
        pokemonId: pokemonAbilities.pokemonId,
        nameEn: abilities.nameEn, nameJa: abilities.nameJa,
        nameZh: abilities.nameZh, nameZhHans: abilities.nameZhHans,
      }).from(pokemonAbilities).innerJoin(abilities, eq(pokemonAbilities.abilityId, abilities.id)),
      db.select().from(items),
    ]);
    return buildPlayerScanVocab({
      moves: moveRows as any, learnset: learnRows as any,
      abilities: abilityRows as any, items: itemRows as any,
    });
  })();
  return cached;
}

export function candidatesForLang(
  entries: Array<{ key?: string; moveId?: number; names: LocalizedNames }>, lang: ScanLang,
): TextCandidate[] {
  const pick = (n: LocalizedNames) =>
    lang === 'en' ? n.en : lang === 'ja' ? n.ja : lang === 'zh-Hant' ? n.zhHant : n.zhHans;
  return entries.map(e => ({
    key: e.moveId != null ? String(e.moveId) : e.key!,
    label: pick(e.names) ?? e.names.en,
  }));
}
