// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useCalculatorActions } from './useCalculatorActions';
import { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';

// Mock getDb to avoid DB dependency in tests
vi.mock('@/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([
              { name: 'Regenerator' },
              { name: 'Chlorophyll' }
            ]))
          }))
        }))
      }))
    }))
  }))
}));

describe('useCalculatorActions - handleImportShowdown with fuzzy matches', () => {
  const mockPokemonList = [
    { id: 591, nameEn: 'Amoonguss', nameZh: '敗露球菇', baseHp: 114, type1: 'Grass', type2: 'Poison', baseAttack: 85, baseDefense: 70, baseSpAtk: 85, baseSpDef: 80, baseSpeed: 30 }
  ];
  const mockMoveList = [
    { id: 1, nameEn: 'Spore', nameZh: '蘑菇孢子' },
    { id: 2, nameEn: 'Rage Powder', nameZh: '愤怒粉' }
  ];

  it('correctly maps fuzzy species, ability, items, and moves and returns corrections', async () => {
    const dispatch = vi.fn();
    const actions = useCalculatorActions(dispatch, mockPokemonList, mockMoveList);

    const set: ParsedShowdownSet = {
      species: 'Amoongus', // fuzzy typo
      ability: 'Regeneratr', // fuzzy typo
      item: 'Rocky Helmt', // fuzzy typo
      nature: 'Bold',
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['Spor', 'Rage Powdr'] // fuzzy typos
    };

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    const corrections = await actions.handleImportShowdown('p1', set);

    expect(corrections).toContain('Pokémon: Amoongus ➔ Amoonguss');
    expect(corrections).toContain('Ability: Regeneratr ➔ Regenerator');
    expect(corrections).toContain('Item: Rocky Helmt ➔ Rocky Helmet');
    expect(corrections).toContain('Move: Spor ➔ Spore');
    expect(corrections).toContain('Move: Rage Powdr ➔ Rage Powder');

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'IMPORT_SHOWDOWN_SET',
      payload: expect.objectContaining({
        pokemon: expect.objectContaining({ id: 591, nameEn: 'Amoonguss' }),
        set: expect.objectContaining({
          species: 'Amoonguss',
          ability: 'Regenerator',
          item: 'Rocky Helmet'
        })
      })
    }));

    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    dispatchEventSpy.mockRestore();
  });
});
