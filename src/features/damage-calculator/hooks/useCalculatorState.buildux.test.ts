import { describe, it, expect } from 'vitest';
import { sideReducer, initialSide } from './useCalculatorState';
import type { SavedBuild } from '../utils/build-store';

describe('build-ux reducer actions', () => {
  it('APPLY_SPREAD sets SP + nature (+ derived stats), leaves ability/item', () => {
    const start = { ...initialSide, activeAbility: 'Intimidate', item: 'Leftovers' };
    const next = sideReducer(start, {
      type: 'APPLY_SPREAD',
      payload: { side: 'p2', sp: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, nature: 'Bold (+DEF, -ATK)' },
    });
    expect(next.spHp).toBe(32);
    expect(next.spDef).toBe(32);
    expect(next.nature).toBe('Bold (+DEF, -ATK)');
    expect(next.boostedStat).toBe('def');
    expect(next.hinderedStat).toBe('atk');
    expect(next.activeAbility).toBe('Intimidate'); // untouched
    expect(next.item).toBe('Leftovers'); // untouched
  });

  it('APPLY_SAVED_BUILD sets SP + nature + ability + item', () => {
    const build: SavedBuild = {
      nature: 'Calm (+SPD, -ATK)', ability: 'Rough Skin', item: 'Sitrus Berry',
      sp: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 },
    };
    const next = sideReducer(initialSide, { type: 'APPLY_SAVED_BUILD', payload: { side: 'p2', build } });
    expect(next.spSpd).toBe(32);
    expect(next.nature).toBe('Calm (+SPD, -ATK)');
    expect(next.boostedStat).toBe('spd');
    expect(next.activeAbility).toBe('Rough Skin');
    expect(next.item).toBe('Sitrus Berry');
  });

  it('SET_SCAN_LOADED toggles the flag', () => {
    const next = sideReducer(initialSide, { type: 'SET_SCAN_LOADED', payload: { side: 'p2', val: true } });
    expect(next.loadedFromScan).toBe(true);
  });

  it('RESET_BUILD clears SP/nature/item and the flag', () => {
    const dirty = { ...initialSide, spHp: 32, spDef: 32, nature: 'Bold (+DEF, -ATK)', item: 'Leftovers', loadedFromScan: true };
    const next = sideReducer(dirty, { type: 'RESET_BUILD', payload: { side: 'p2' } });
    expect(next.spHp).toBe(0);
    expect(next.spDef).toBe(0);
    expect(next.nature).toBe('Hardy');
    expect(next.item).toBeNull();
    expect(next.loadedFromScan).toBe(false);
  });

  it('initialSide.loadedFromScan defaults false', () => {
    expect(initialSide.loadedFromScan).toBe(false);
  });
});
