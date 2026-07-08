// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaFieldConditions } from './ArenaFieldConditions';
import type { CalcState } from '@/features/damage-calculator/hooks/useCalculatorState';

const sampleState = {
  weather: 'None',
  terrain: 'None',
  isSpreadTarget: false,
  isFairyAura: false,
  isDarkAura: false,
  isAuraBreak: false,
  isGravity: false,
  isTrickRoom: false,
} as unknown as CalcState;

describe('ArenaFieldConditions', () => {
  it('collapses the body when the header is clicked', () => {
    render(<ArenaFieldConditions state={sampleState} dispatch={() => {}} />);
    expect(screen.getByText('Weather')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /field conditions/i }));
    expect(screen.queryByText('Weather')).toBeNull();
  });

  it('Trick Room chip dispatches TOGGLE_TRICK_ROOM', () => {
    const dispatch = vi.fn();
    render(<ArenaFieldConditions state={sampleState} dispatch={dispatch} />);
    fireEvent.click(screen.getByText('Trick Room'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_TRICK_ROOM' });
  });
});
