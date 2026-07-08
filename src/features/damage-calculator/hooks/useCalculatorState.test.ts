import { describe, it, expect } from 'vitest';
import { calcReducer, initialState } from './useCalculatorState';

describe('trick room', () => {
  it('defaults off and toggles', () => {
    expect(initialState.isTrickRoom).toBe(false);
    const next = calcReducer(initialState, { type: 'TOGGLE_TRICK_ROOM' } as any);
    expect(next.isTrickRoom).toBe(true);
  });
});
