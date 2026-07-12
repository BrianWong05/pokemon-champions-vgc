import { describe, it, expect } from 'vitest';
import { megaCycleTarget } from './mega';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, identifier: string) => ({ id, identifier, nameEn: identifier } as PokemonBaseStats);
const glimmora = mon(970, 'glimmora');
const megaGlimmora = mon(10970, 'glimmora-mega');
const charizard = mon(6, 'charizard');
const charX = mon(10034, 'charizard-mega-x');
const charY = mon(10035, 'charizard-mega-y');
const porygonZ = mon(474, 'porygon-z');
const list = [glimmora, megaGlimmora, charizard, charX, charY, porygonZ];

describe('megaCycleTarget', () => {
  it('base -> its mega', () => {
    expect(megaCycleTarget(970, list)?.identifier).toBe('glimmora-mega');
  });

  it('mega -> back to base', () => {
    expect(megaCycleTarget(10970, list)?.identifier).toBe('glimmora');
  });

  it('cycles through multiple megas: base -> X -> Y -> base', () => {
    expect(megaCycleTarget(6, list)?.identifier).toBe('charizard-mega-x');
    expect(megaCycleTarget(10034, list)?.identifier).toBe('charizard-mega-y');
    expect(megaCycleTarget(10035, list)?.identifier).toBe('charizard');
  });

  it('null when the species has no mega', () => {
    expect(megaCycleTarget(474, list)).toBeNull();
  });

  it('null for unknown ids', () => {
    expect(megaCycleTarget(999999, list)).toBeNull();
  });

  it('null when the entry has no identifier (partial fixtures)', () => {
    expect(megaCycleTarget(1, [{ id: 1, nameEn: 'X' } as PokemonBaseStats])).toBeNull();
  });
});
