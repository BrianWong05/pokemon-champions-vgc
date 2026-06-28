import { describe, it, expect } from 'vitest';
import { formatShowdownSet } from '@/features/pokemon/utils/showdown-formatter';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';

describe('showdown-formatter', () => {
  it('should format a basic pokemon config correctly', () => {
    const config: PokemonConfig = {
      selectedId: 1,
      type1: 'Grass',
      type2: 'Poison',
      baseHp: 80, baseAtk: 82, baseDef: 83, baseSpa: 100, baseSpd: 100, baseSpe: 80,
      spHp: 252, spAtk: 0, spDef: 4, spSpa: 252, spSpd: 0, spSpe: 0,
      nature: 'Modest',
      boostedStat: 'spa',
      hinderedStat: 'atk',
      moves: [
        { id: 1, nameEn: 'Giga Drain', power: 75, accuracy: 100, type: 'Grass', category: 'Special' },
        { id: 2, nameEn: 'Sludge Bomb', power: 90, accuracy: 100, type: 'Poison', category: 'Special' },
        null,
        null
      ],
      activeMoveIndex: 0,
      abilities: ['Overgrow'],
      activeAbility: 'Overgrow',
      item: 'Life Orb',
      hpPercent: 100,
      isTypeOverridden: false,
    };

    const output = formatShowdownSet(config, 'Venusaur');
    
    expect(output).toContain('Venusaur @ Life Orb');
    expect(output).toContain('Ability: Overgrow');
    expect(output).toContain('EVs: 252 HP / 4 Def / 252 SpA');
    expect(output).toContain('Modest Nature');
    expect(output).toContain('- Giga Drain');
    expect(output).toContain('- Sludge Bomb');
  });
});
