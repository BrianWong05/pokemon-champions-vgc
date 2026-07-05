// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTeamDetail } from './useTeamDetail';
import { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { renderHook, act } from '@testing-library/react';

// Mock react router params
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '123' }),
  Link: () => null
}));

// Mock useTeams hook
const mockUpdateTeam = vi.fn();
const mockGetTeam = vi.fn(() => Promise.resolve({
  id: '123',
  name: 'My Team',
  members: []
}));
vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: () => ({
    getTeam: mockGetTeam,
    updateTeam: mockUpdateTeam,
    loading: false
  })
}));

// Mock pokemonRepository
vi.mock('@/db/repositories/pokemon.repo', () => ({
  pokemonRepository: {
    getPokemonListByFormat: vi.fn(() => Promise.resolve([
      { id: 591, nameEn: 'Amoonguss', nameZh: '敗露球菇', baseHp: 114, type1: 'Grass', type2: 'Poison', baseAttack: 85, baseDefense: 70, baseSpAtk: 85, baseSpDef: 80, baseSpeed: 30 }
    ])),
    getAllMoves: vi.fn(() => Promise.resolve([
      { id: 1, nameEn: 'Spore', nameZh: '蘑菇孢子' },
      { id: 2, nameEn: 'Rage Powder', nameZh: '愤怒粉' }
    ])),
    getPokemonAbilities: vi.fn(() => Promise.resolve([
      'Regenerator',
      'Chlorophyll'
    ]))
  }
}));

// Mock format context
vi.mock('@/features/formats/FormatContext', () => ({
  useFormat: () => ({ format: 'vgc' })
}));

// Mock Modal registry
vi.mock('@/hooks/useModalRegistry', () => ({
  useModalRegistry: () => ({
    openModal: vi.fn(),
    closeModal: vi.fn(),
    isModalOpen: vi.fn()
  })
}));

describe('useTeamDetail - handleImportSingleShowdown with fuzzy matches', () => {
  let alertSpy: any;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockUpdateTeam.mockClear();
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('correctly imports fuzzy matched set, logs corrections and triggers event', async () => {
    const { result } = renderHook(() => useTeamDetail('123'));

    // Wait for initial useEffect fetches to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

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

    let corrections: string[] | undefined;
    await act(async () => {
      corrections = await result.current.handleImportSingleShowdown(set);
    });

    expect(corrections).toContain('Pokémon: Amoongus ➔ Amoonguss');
    expect(corrections).toContain('Ability: Regeneratr ➔ Regenerator');
    expect(corrections).toContain('Item: Rocky Helmt ➔ Rocky Helmet');
    expect(corrections).toContain('Move: Spor ➔ Spore');
    expect(corrections).toContain('Move: Rage Powdr ➔ Rage Powder');

    expect(mockUpdateTeam).toHaveBeenCalledWith(
      '123',
      'My Team',
      expect.arrayContaining([
        expect.objectContaining({
          selectedId: 591,
          activeAbility: 'Regenerator',
          item: 'Rocky Helmet',
          moves: [
            expect.objectContaining({ nameEn: 'Spore' }),
            expect.objectContaining({ nameEn: 'Rage Powder' }),
            null,
            null
          ]
        })
      ])
    );

    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    dispatchEventSpy.mockRestore();
  });

  it('alerts and returns early if species match fails', async () => {
    const { result } = renderHook(() => useTeamDetail('123'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const set: ParsedShowdownSet = {
      species: 'UnknownPoke',
      ability: 'Regenerator',
      item: 'Rocky Helmet',
      nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['Spore']
    };

    await act(async () => {
      await result.current.handleImportSingleShowdown(set);
    });

    expect(alertSpy).toHaveBeenCalledWith('Could not find Pokémon matching "UnknownPoke"');
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });

  it('alerts and returns early if ability match fails', async () => {
    const { result } = renderHook(() => useTeamDetail('123'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const set: ParsedShowdownSet = {
      species: 'Amoonguss',
      ability: 'Huge Power', // not in Amoonguss's ability list
      item: 'Rocky Helmet',
      nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['Spore']
    };

    await act(async () => {
      await result.current.handleImportSingleShowdown(set);
    });

    expect(alertSpy).toHaveBeenCalledWith('Could not find Ability matching "Huge Power"');
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });

  it('alerts and returns early if item match fails', async () => {
    const { result } = renderHook(() => useTeamDetail('123'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const set: ParsedShowdownSet = {
      species: 'Amoonguss',
      ability: 'Regenerator',
      item: 'Fake Item Name Here',
      nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['Spore']
    };

    await act(async () => {
      await result.current.handleImportSingleShowdown(set);
    });

    expect(alertSpy).toHaveBeenCalledWith('Could not find Item matching "Fake Item Name Here"');
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });

  it('alerts and returns early if move match fails', async () => {
    const { result } = renderHook(() => useTeamDetail('123'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const set: ParsedShowdownSet = {
      species: 'Amoonguss',
      ability: 'Regenerator',
      item: 'Rocky Helmet',
      nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['Fake Move Name']
    };

    await act(async () => {
      await result.current.handleImportSingleShowdown(set);
    });

    expect(alertSpy).toHaveBeenCalledWith('Could not find Move matching "Fake Move Name"');
    expect(mockUpdateTeam).not.toHaveBeenCalled();
  });
});
