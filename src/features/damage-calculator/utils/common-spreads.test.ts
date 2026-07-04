import { describe, it, expect } from 'vitest';
import { COMMON_SPREADS } from './common-spreads';

describe('COMMON_SPREADS', () => {
  it('has Max HB and Max HD', () => {
    expect(COMMON_SPREADS.map((s) => s.id)).toEqual(['maxHB', 'maxHD']);
  });
  it('Max HB is 32 HP / 32 Def with a +Def nature', () => {
    const hb = COMMON_SPREADS.find((s) => s.id === 'maxHB')!;
    expect(hb.sp).toEqual({ hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 });
    expect(hb.nature).toBe('Bold (+DEF, -ATK)');
  });
  it('Max HD is 32 HP / 32 SpD with a +SpD nature', () => {
    const hd = COMMON_SPREADS.find((s) => s.id === 'maxHD')!;
    expect(hd.sp).toEqual({ hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 });
    expect(hd.nature).toBe('Calm (+SPD, -ATK)');
  });
  it('no spread exceeds the 32-per-stat cap or 66 total', () => {
    for (const s of COMMON_SPREADS) {
      const vals = Object.values(s.sp);
      expect(Math.max(...vals)).toBeLessThanOrEqual(32);
      expect(vals.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(66);
    }
  });
});
