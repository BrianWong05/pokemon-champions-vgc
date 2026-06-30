// src/features/scan/toParsedSets.ts
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';

export function toParsedSets(speciesNames: string[]): ParsedShowdownSet[] {
  return speciesNames.map((species) => ({
    species,
    item: null,
    ability: null,
    nature: 'Serious',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: [],
  }));
}
