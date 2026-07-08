// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaReviewMon } from './ArenaReviewMon';
import type { TeamWithMembers } from '@/db/repositories/team.repo';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

const pokemonList = [{
  id: 6,
  identifier: 'charizard-mega-y',
  nameEn: 'Mega Charizard Y',
  nameZh: null,
  type1: 'fire',
  type2: 'flying',
  baseHp: 78,
  baseAttack: 104,
  baseDefense: 78,
  baseSpAtk: 159,
  baseSpDef: 115,
  baseSpeed: 100,
}] as PokemonBaseStats[];

const moveList = [] as MoveData[];

const config: PokemonConfig = {
  selectedId: 6,
  type1: 'fire',
  type2: 'flying',
  baseHp: 78,
  baseAtk: 104,
  baseDef: 78,
  baseSpa: 159,
  baseSpd: 115,
  baseSpe: 100,
  spHp: 32,
  spAtk: 0,
  spDef: 10,
  spSpa: 11,
  spSpd: 0,
  spSpe: 13,
  nature: 'Modest',
  boostedStat: 'spa',
  hinderedStat: 'atk',
  moves: [null, null, null, null],
  activeMoveIndex: 0,
  abilities: ['Drought'],
  activeAbility: 'Drought',
  item: 'Charizardite Y',
  hpPercent: 100,
  isTypeOverridden: false,
};

const member = {
  id: 'member-1',
  teamId: 'team-1',
  order: 0,
  configuration: config,
} as TeamWithMembers['members'][number];

describe('ArenaReviewMon nature cycling', () => {
  it('leaves unrelated stats alone and lets the reduced stat toggle only between neutral and reduced', () => {
    const onSave = vi.fn();
    render(
      <ArenaReviewMon
        member={member}
        teamName="M-B"
        pokemonList={pokemonList}
        moveList={moveList}
        onBack={() => {}}
        onSave={onSave}
        saveLabel="Save"
      />,
    );

    for (const stat of ['B', 'D', 'S']) {
      fireEvent.click(screen.getByRole('button', { name: stat }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
      boostedStat: 'spa',
      hinderedStat: 'atk',
    }));

    fireEvent.click(screen.getByRole('button', { name: /^A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
      boostedStat: 'spa',
      hinderedStat: null,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
      boostedStat: 'spa',
      hinderedStat: 'atk',
    }));
  });
});
