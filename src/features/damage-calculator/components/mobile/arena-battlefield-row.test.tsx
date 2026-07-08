// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaBattlefieldRow } from './ArenaBattlefieldRow';
import type { CalcState } from '@/features/damage-calculator/hooks/useCalculatorState';

const sampleState = {
  weather: 'None',
  terrain: 'None',
  isSpreadTarget: false,
  isTrickRoom: false,
  isGravity: false,
  isFairyAura: false,
  isDarkAura: false,
  isAuraBreak: false,
} as unknown as CalcState;

describe('ArenaBattlefieldRow', () => {
  it('renders the header label and the five field chips', () => {
    render(<ArenaBattlefieldRow state={sampleState} dispatch={() => {}} />);
    expect(screen.getByText('BATTLEFIELD')).toBeTruthy();
    expect(screen.getByText('☀ Weather')).toBeTruthy();
    // "Terrain" also appears as the (closed, hidden) Sheet's default title, so scope to the chip button.
    expect(screen.getByRole('button', { name: 'Terrain' })).toBeTruthy();
    expect(screen.getByText('Trick Room')).toBeTruthy();
    expect(screen.getByText('Gravity')).toBeTruthy();
    expect(screen.getByText('Auras')).toBeTruthy();
  });

  it('only renders weather options once the Weather chip is clicked, and dispatches SET_WEATHER on selection', () => {
    const dispatch = vi.fn();
    render(<ArenaBattlefieldRow state={sampleState} dispatch={dispatch} />);
    expect(screen.queryByText('Sun')).toBeNull();

    fireEvent.click(screen.getByText('☀ Weather'));
    expect(screen.getByText('Sun')).toBeTruthy();

    fireEvent.click(screen.getByText('Sun'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_WEATHER', payload: 'Sun' });
  });

  it('only renders terrain options once the Terrain chip is clicked, and dispatches SET_TERRAIN on selection', () => {
    const dispatch = vi.fn();
    render(<ArenaBattlefieldRow state={sampleState} dispatch={dispatch} />);
    expect(screen.queryByText('Grassy')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Terrain' }));
    expect(screen.getByText('Grassy')).toBeTruthy();

    fireEvent.click(screen.getByText('Grassy'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TERRAIN', payload: 'Grassy' });
  });

  it('dispatches TOGGLE_TRICK_ROOM and TOGGLE_GRAVITY on the respective clicks', () => {
    const dispatch = vi.fn();
    render(<ArenaBattlefieldRow state={sampleState} dispatch={dispatch} />);

    fireEvent.click(screen.getByText('Trick Room'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_TRICK_ROOM' });

    fireEvent.click(screen.getByText('Gravity'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_GRAVITY' });
  });

  it('opens the Auras picker and toggles a field aura (sheet stays open for multi-select)', () => {
    const dispatch = vi.fn();
    render(<ArenaBattlefieldRow state={sampleState} dispatch={dispatch} />);
    expect(screen.queryByText('Fairy Aura')).toBeNull();

    fireEvent.click(screen.getByText('Auras'));
    expect(screen.getByText('Fairy Aura')).toBeTruthy();

    fireEvent.click(screen.getByText('Fairy Aura'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_FIELD_AURA', payload: 'isFairyAura' });
  });
});
