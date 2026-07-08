// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArenaSideConditions } from './ArenaSideConditions';

const base = { isReflect: false, isLightScreen: false, isHelpingHand: false, isTailwind: false } as any;

describe('ArenaSideConditions', () => {
  it('attacker shows Tailwind + Helping Hand and dispatches toggle', () => {
    const dispatch = vi.fn();
    render(<ArenaSideConditions side={base} which="p1" dispatch={dispatch} />);
    expect(screen.getByText('Tailwind')).toBeTruthy();
    fireEvent.click(screen.getByText('Helping Hand'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDE_EFFECT', payload: { side: 'p1', effect: 'isHelpingHand' } });
  });

  it('defender shows Reflect + Light Screen', () => {
    render(<ArenaSideConditions side={base} which="p2" dispatch={() => {}} />);
    expect(screen.getByText('Reflect')).toBeTruthy();
    expect(screen.getByText('Light Screen')).toBeTruthy();
  });
});
