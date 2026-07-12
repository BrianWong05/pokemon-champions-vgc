// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmRosterView from './ConfirmRosterView';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { SlotResult } from '../scan/types';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);
const list = [mon(445, 'Garchomp'), mon(149, 'Dragonite'), mon(823, 'Corviknight')];
const slot = (candidates: Array<{ id: number; score: number }>): SlotResult =>
  ({ box: { x: 0, y: 0, w: 10, h: 10 }, candidates });

describe('ConfirmRosterView', () => {
  it('shows top candidate per slot with confidence and confirms the ids', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmRosterView
        slots={[slot([{ id: 445, score: 0.92 }]), slot([{ id: 823, score: 0.99 }])]}
        pokemonList={list}
        onConfirm={onConfirm}
        onRescan={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Garchomp')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Confirm & lock roster/ }));
    expect(onConfirm).toHaveBeenCalledWith([445, 823]);
  });

  it('lets the user swap a slot to another candidate', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmRosterView
        slots={[slot([{ id: 445, score: 0.61 }, { id: 149, score: 0.26 }])]}
        pokemonList={list}
        onConfirm={onConfirm}
        onRescan={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Fix Garchomp/ }));
    fireEvent.click(screen.getByRole('button', { name: /Use Dragonite/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm & lock roster/ }));
    expect(onConfirm).toHaveBeenCalledWith([149]);
  });

  it('wires rescan and close', () => {
    const onRescan = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmRosterView slots={[slot([{ id: 445, score: 0.9 }])]} pokemonList={list} onConfirm={() => {}} onRescan={onRescan} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Re-scan/ }));
    fireEvent.click(screen.getByRole('button', { name: /Minimize/ }));
    expect(onRescan).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
