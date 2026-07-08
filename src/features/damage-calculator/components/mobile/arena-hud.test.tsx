// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ArenaHud } from './ArenaHud';

const side = { selectedId: 1, activeMoveIndex: 0 } as any;
const state = { p1: side, p2: side } as any;
const results = [{ minPercent: 62, maxPercent: 74, minDamage: 10, maxDamage: 12, moveName: 'Tackle' } as any];

const hudProps = {
  state,
  dir: 'p1' as const,
  onSwap: () => {},
  p1Results: results,
  p2Results: results,
  nameOf: () => 'Bulbasaur',
};

describe('ArenaHud roll bar', () => {
  it('renders a roll bar when there is an active result', () => {
    const { container } = render(<ArenaHud {...hudProps} />);
    expect(container.querySelector('[data-testid="hud-roll-bar"]')).toBeTruthy();
  });

  it('does not render a roll bar when there is no active result', () => {
    const emptyProps = { ...hudProps, p1Results: [null], p2Results: [null] };
    const { container } = render(<ArenaHud {...emptyProps} />);
    expect(container.querySelector('[data-testid="hud-roll-bar"]')).toBeNull();
  });
});
