// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect } from 'vitest';
import { ArenaSpeedCompareView } from './ArenaSpeedCompareView';

const compare = {
  yours: { actual: 153, scarf: 229, tailwind: 306 },
  tiers: [
    { label: 'Max+ scarf', value: 253, outcome: 'outsped' as const },
    { label: 'Uninvested', value: 122, outcome: 'faster' as const },
  ],
};
const props = {
  compare, layout: 'columns' as const, youName: 'Glimmora', oppName: 'Garchomp',
  oppBaseSpe: 102, youStage: 0, oppStage: 0, onYouStage: () => {}, onOppStage: () => {},
  formula: '153 = floor((101 + 20 + 32) × 1.0)',
};

it('renders the mode buttons and the live formula', () => {
  render(<ArenaSpeedCompareView {...props} />);
  expect(screen.getByText('153')).toBeTruthy();            // Actual value
  expect(screen.getByText(/153 = floor/)).toBeTruthy();    // formula
});

it('switching to Scarf recomputes tier outcomes against 229', () => {
  render(<ArenaSpeedCompareView {...props} />);
  fireEvent.click(screen.getByText('Scarf'));
  // 229 > 122 → Faster; 229 < 253 → Outsped
  expect(screen.getAllByText('Faster').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Outsped').length).toBeGreaterThan(0);
});
