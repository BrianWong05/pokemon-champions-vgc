// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArenaTeamsLandscape, memberFlags, teamCompleteness } from './ArenaTeamsLandscape';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import type { TeamWithMembers } from '@/db/repositories/team.repo';

const cfg = (over: Partial<PokemonConfig> = {}): PokemonConfig => ({
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  moves: [null, null, null, null],
  ...over,
} as unknown as PokemonConfig);

const member = (c: PokemonConfig) => ({ configuration: c } as unknown as TeamWithMembers['members'][number]);
const move = (nameEn: string) => ({ nameEn, typeId: 1 } as PokemonConfig['moves'][number]);

describe('memberFlags', () => {
  it('flags no stats and no moves for a bare config', () => {
    expect(memberFlags(cfg())).toEqual({ hasStats: false, hasMoves: false });
  });

  it('detects invested EVs as stats and a named move as moves', () => {
    expect(memberFlags(cfg({ spSpa: 252 }))).toMatchObject({ hasStats: true });
    expect(memberFlags(cfg({ moves: [move('Protect'), null, null, null] }))).toMatchObject({ hasMoves: true });
  });
});

describe('teamCompleteness', () => {
  const full = cfg({ spSpa: 252, moves: [move('Protect'), null, null, null] });

  it('is complete only when all six slots have both stats and moves', () => {
    expect(teamCompleteness(Array.from({ length: 6 }, () => member(full)))).toEqual({ filled: 6, complete: true });
  });

  it('is incomplete with fewer than six, or a slot missing moves', () => {
    expect(teamCompleteness([member(full), member(full)])).toEqual({ filled: 2, complete: false });
    const five = Array.from({ length: 5 }, () => member(full));
    expect(teamCompleteness([...five, member(cfg({ spSpa: 252 }))])).toEqual({ filled: 6, complete: false });
  });
});

describe('ArenaTeamsLandscape', () => {
  it('deletes the selected team through an accessible action', () => {
    const onDelete = vi.fn();
    render(
      <ArenaTeamsLandscape
        teams={[{ id: 'team-1', name: 'Rain', createdAt: new Date(), members: [] }]}
        pokemonList={[]}
        loading={false}
        error={null}
        onNew={() => {}}
        onScanPlayer={() => {}}
        onEdit={() => {}}
        onReviewMon={() => {}}
        onDelete={onDelete}
        onExport={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete team' }));
    expect(onDelete).toHaveBeenCalledWith('team-1', 'Rain');
  });

  it('exports the selected team through a labeled action', () => {
    const team = { id: 'team-1', name: 'Rain', createdAt: new Date(), members: [] };
    const onExport = vi.fn();
    render(
      <ArenaTeamsLandscape
        teams={[team]}
        pokemonList={[]}
        loading={false}
        error={null}
        onNew={() => {}}
        onScanPlayer={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onReviewMon={() => {}}
        onExport={onExport}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export team' }));
    expect(onExport).toHaveBeenCalledWith(team);
  });
});
