// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import PokemonImagePicker from './PokemonImagePicker';

vi.mock('@/components/atoms/PokemonImage', () => ({
  default: ({ name }: { name: string }) => <span>{name} sprite</span>,
}));

const pokemon = (id: number, nameEn: string): PokemonBaseStats => ({
  id,
  identifier: nameEn.toLowerCase(),
  nameEn,
  nameZh: null,
  type1: 'normal',
  type2: null,
  baseHp: 1,
  baseAttack: 1,
  baseDefense: 1,
  baseSpAtk: 1,
  baseSpDef: 1,
  baseSpeed: 1,
});

describe('PokemonImagePicker disabled IDs', () => {
  it('blocks reserved Pokémon while leaving other choices selectable', () => {
    const onSelect = vi.fn();
    render(
      <PokemonImagePicker
        pokemonList={[pokemon(6, 'Charizard'), pokemon(727, 'Incineroar')]}
        selectedId={null}
        disabledIds={new Set([727])}
        onSelect={onSelect}
      />,
    );

    const incineroar = screen.getByRole('button', { name: /Incineroar/i });
    expect((incineroar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(incineroar);
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Charizard/i }));
    expect(onSelect).toHaveBeenCalledWith(6);
  });
});
