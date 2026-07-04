// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSavedBuild, saveBuild, clearBuild, type SavedBuild } from './build-store';

const build: SavedBuild = {
  nature: 'Bold (+DEF, -ATK)', ability: 'Intimidate', item: 'Sitrus Berry',
  sp: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 },
};

describe('build-store', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for an unknown species', () => {
    expect(loadSavedBuild('Garchomp')).toBeNull();
  });
  it('round-trips a saved build by species', () => {
    saveBuild('Garchomp', build);
    expect(loadSavedBuild('Garchomp')).toEqual(build);
    expect(loadSavedBuild('Incineroar')).toBeNull();
  });
  it('clears a species without touching others', () => {
    saveBuild('Garchomp', build);
    saveBuild('Incineroar', build);
    clearBuild('Garchomp');
    expect(loadSavedBuild('Garchomp')).toBeNull();
    expect(loadSavedBuild('Incineroar')).toEqual(build);
  });
});
