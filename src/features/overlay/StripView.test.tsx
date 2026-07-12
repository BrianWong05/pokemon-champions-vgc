// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StripView from './StripView';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);
const byId = new Map([445, 823, 970].map((id) => [id, mon(id, `Mon${id}`)]));

describe('StripView', () => {
  it('renders one tile per roster mon with the active one pressed', () => {
    render(<StripView roster={[445, 823, 970]} byId={byId} activeId={823} onPick={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Mon823/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('fires onPick with the species id', () => {
    const onPick = vi.fn();
    render(<StripView roster={[445]} byId={byId} activeId={null} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /Mon445/ }));
    expect(onPick).toHaveBeenCalledWith(445);
  });
});
