// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readLastScanHp, saveScanHp, clearLastScanHp } from './lastScanHp';
import { clearBattleRoster } from './battleRoster';

describe('lastScanHp', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty map when nothing stored', () => {
    expect(readLastScanHp()).toEqual({});
  });

  it('merges entries and skips null hp', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }, { id: 823, hpPercent: null }]);
    saveScanHp([{ id: 823, hpPercent: 100 }]);
    expect(readLastScanHp()).toEqual({ 445: 56, 823: 100 });
  });

  it('overwrites an existing entry on re-scan', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }]);
    saveScanHp([{ id: 445, hpPercent: 31 }]);
    expect(readLastScanHp()[445]).toBe(31);
  });

  it('drops garbage stored values', () => {
    localStorage.setItem('scan.lastScanHp', JSON.stringify({ 445: 'high', 823: 200, 970: 42 }));
    expect(readLastScanHp()).toEqual({ 970: 42 });
  });

  it('clears', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }]);
    clearLastScanHp();
    expect(readLastScanHp()).toEqual({});
  });

  it('is cleared together with the battle roster', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }]);
    clearBattleRoster();
    expect(readLastScanHp()).toEqual({});
  });
});
