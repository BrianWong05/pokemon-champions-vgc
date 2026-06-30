// src/features/scan/toParsedSets.test.ts
import { describe, it, expect } from 'vitest';
import { toParsedSets } from './toParsedSets';

describe('toParsedSets', () => {
  it('builds neutral species-only sets the import resolver accepts', () => {
    const sets = toParsedSets(['Charizard', 'Rotom (Heat)']);
    expect(sets).toHaveLength(2);
    expect(sets[0].species).toBe('Charizard');
    expect(sets[0].item).toBeNull();
    expect(sets[0].ability).toBeNull();
    expect(sets[0].nature).toBe('Serious');
    expect(sets[0].moves).toEqual([]);
    expect(sets[0].evs).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    expect(sets[0].ivs).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });
});
