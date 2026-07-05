import { describe, it, expect } from 'vitest';
import { convertSCtoTC, matchSpecies, matchMove, matchAbility, matchItem } from '@/features/pokemon/utils/showdown-matcher';

describe('showdown-matcher', () => {
  const mockPokemonList = [
    { id: 591, nameEn: 'Amoonguss', nameZh: '敗露球菇' },
    { id: 6, nameEn: 'Charizard', nameZh: '噴火龍' },
    { id: 10035, nameEn: 'Mega Charizard Y', nameZh: '超級噴火龍Y' },
    { id: 137, nameEn: 'Porygon2', nameZh: '3D龍II' }
  ];
  const mockMoveList = [
    { id: 1, nameEn: 'Spore', nameZh: '蘑菇孢子' },
    { id: 2, nameEn: 'U-turn', nameZh: '急速折返' }
  ];
  const mockAbilityNames = [
    'Regenerator',
    'Intimidate',
    '威嚇',
    '再生力',
    '黃金之軀'
  ];

  it('translates SC to TC', () => {
    expect(convertSCtoTC('败露球菇')).toBe('敗露球菇');
    expect(convertSCtoTC('喷火龙')).toBe('噴火龍');
  });

  it('matches species exactly and fuzzily in English', () => {
    const res = matchSpecies('Amoongus', mockPokemonList);
    expect(res).not.toBeNull();
    expect(res!.match.id).toBe(591);
    expect(res!.isFuzzy).toBe(true);
  });

  it('matches species exactly and fuzzily in Chinese (SC & TC)', () => {
    const res1 = matchSpecies('败露球菇', mockPokemonList);
    expect(res1!.match.id).toBe(591);
    expect(res1!.isFuzzy).toBe(false); // Exact match after SC->TC conversion

    const res2 = matchSpecies('败露菇', mockPokemonList);
    expect(res2!.match.id).toBe(591);
    expect(res2!.isFuzzy).toBe(true);
  });

  it('matches exact Megas without fuzzy flag', () => {
    const res = matchSpecies('超級噴火龍Y', mockPokemonList);
    expect(res!.match.id).toBe(10035);
    expect(res!.isFuzzy).toBe(false);
  });

  it('matches Megas correctly using regex rules in Chinese', () => {
    const res = matchSpecies('噴火龍-Mega-Y', mockPokemonList);
    expect(res!.match.id).toBe(10035);
    expect(res!.isFuzzy).toBe(true);
  });

  it('matches hybrid English/Chinese terms case-insensitively', () => {
    const res1 = matchSpecies('3D龍ii', mockPokemonList);
    expect(res1!.match.id).toBe(137);
    expect(res1!.isFuzzy).toBe(false);

    const res2 = matchSpecies('3d龍II', mockPokemonList);
    expect(res2!.match.id).toBe(137);
    expect(res2!.isFuzzy).toBe(false);
  });

  it('matches moves fuzzily', () => {
    const res = matchMove('Uturn', mockMoveList);
    expect(res!.match.nameEn).toBe('U-turn');
  });

  it('matches abilities exactly and fuzzily in English and Chinese', () => {
    const resExactEn = matchAbility('Regenerator', mockAbilityNames);
    expect(resExactEn!.match).toBe('Regenerator');
    expect(resExactEn!.isFuzzy).toBe(false);

    const resExactZh = matchAbility('威嚇', mockAbilityNames);
    expect(resExactZh!.match).toBe('威嚇');
    expect(resExactZh!.isFuzzy).toBe(false);

    const resFuzzyEn = matchAbility('regenratr', mockAbilityNames);
    expect(resFuzzyEn!.match).toBe('Regenerator');
    expect(resFuzzyEn!.isFuzzy).toBe(true);

    const resFuzzyZh = matchAbility('黃金軀', mockAbilityNames);
    expect(resFuzzyZh!.match).toBe('黃金之軀');
    expect(resFuzzyZh!.isFuzzy).toBe(true);
  });

  it('matches items exactly and fuzzily', () => {
    const resExact = matchItem('Choice Band');
    expect(resExact!.match).toBe('Choice Band');
    expect(resExact!.isFuzzy).toBe(false);

    // Exact normalized match is not fuzzy
    const resExactNorm = matchItem('choiceband');
    expect(resExactNorm!.match).toBe('Choice Band');
    expect(resExactNorm!.isFuzzy).toBe(false);

    // Typo match is fuzzy
    const resFuzzyTypo = matchItem('Choic Band');
    expect(resFuzzyTypo!.match).toBe('Choice Band');
    expect(resFuzzyTypo!.isFuzzy).toBe(true);
  });

  it('translates common VGC items from Chinese', () => {
    const res1 = matchItem('命玉');
    expect(res1!.match).toBe('Life Orb');
    expect(res1!.isFuzzy).toBe(false);

    const res2 = matchItem('剩饭');
    expect(res2!.match).toBe('Leftovers');
    expect(res2!.isFuzzy).toBe(false);

    const res3 = matchItem('凹凸頭盔');
    expect(res3!.match).toBe('Rocky Helmet');
    expect(res3!.isFuzzy).toBe(false);
  });
});
