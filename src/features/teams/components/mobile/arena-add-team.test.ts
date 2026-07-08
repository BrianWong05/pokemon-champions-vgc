import { describe, it, expect } from 'vitest';
import { setToConfig } from './ArenaAddTeam';
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

const pokemonList = [
  { id: 445, identifier: 'garchomp', nameEn: 'Garchomp', nameZh: null, type1: 'dragon', type2: 'ground',
    baseHp: 108, baseAttack: 130, baseDefense: 95, baseSpAtk: 80, baseSpDef: 85, baseSpeed: 102 },
] as PokemonBaseStats[];
const moveList = [
  { id: 1, nameEn: 'Earthquake', nameZh: null, typeId: 5 },
  { id: 2, nameEn: 'Protect', nameZh: null, typeId: 1 },
] as unknown as MoveData[];

const set = (over: Partial<ParsedShowdownSet> = {}): ParsedShowdownSet => ({
  species: 'Garchomp', item: 'Rocky Helmet', ability: 'Rough Skin', nature: 'Jolly',
  evs: { hp: 0, atk: 32, def: 1, spa: 0, spd: 0, spe: 32 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  moves: ['Earthquake', 'Protect'],
  ...over,
});

describe('setToConfig', () => {
  it('maps species, base stats, SP, item, ability, and nature', () => {
    const c = setToConfig(set(), pokemonList, moveList);
    expect(c.selectedId).toBe(445);
    expect(c.baseSpe).toBe(102); // PokemonBaseStats.baseSpeed → config.baseSpe
    expect(c.spAtk).toBe(32); // set.evs are already SP-scale — passed straight through
    expect(c.item).toBe('Rocky Helmet');
    expect(c.activeAbility).toBe('Rough Skin');
    // Jolly = +Spe / -SpA
    expect(c.boostedStat).toBe('spe');
    expect(c.hinderedStat).toBe('spa');
  });

  it('resolves move names to MoveData and pads to four slots', () => {
    const c = setToConfig(set(), pokemonList, moveList);
    expect(c.moves).toHaveLength(4);
    expect(c.moves[0]?.nameEn).toBe('Earthquake');
    expect(c.moves[1]?.nameEn).toBe('Protect');
    expect(c.moves[2]).toBeNull();
  });

  it('leaves species null when it is not in the list', () => {
    expect(setToConfig(set({ species: 'Mewnobody' }), pokemonList, moveList).selectedId).toBeNull();
  });
});
