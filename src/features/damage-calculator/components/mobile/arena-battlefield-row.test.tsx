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
} as unknown as CalcState;

describe('ArenaBattlefieldRow', () => {
  it('renders the header label, Single/Spread toggle, and the four field chips', () => {
    render(<ArenaBattlefieldRow state={sampleState} dispatch={() => {}} />);
    expect(screen.getByText('BATTLEFIELD')).toBeTruthy();
    expect(screen.getByText('Single')).toBeTruthy();
    expect(screen.getByText('Spread')).toBeTruthy();
    expect(screen.getByText('☀ Weather')).toBeTruthy();
    // "Terrain" also appears as the (closed, hidden) Sheet's default title, so scope to the chip button.
    expect(screen.getByRole('button', { name: 'Terrain' })).toBeTruthy();
    expect(screen.getByText('Trick Room')).toBeTruthy();
    expect(screen.getByText('Gravity')).toBeTruthy();
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

  it('dispatches TOGGLE_TRICK_ROOM, TOGGLE_GRAVITY, and SET_SPREAD_TARGET on the respective clicks', () => {
    const dispatch = vi.fn();
    render(<ArenaBattlefieldRow state={sampleState} dispatch={dispatch} />);

    fireEvent.click(screen.getByText('Trick Room'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_TRICK_ROOM' });

    fireEvent.click(screen.getByText('Gravity'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_GRAVITY' });

    fireEvent.click(screen.getByText('Spread'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SPREAD_TARGET', payload: true });
  });
});
