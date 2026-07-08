// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { it, expect } from 'vitest';
import { ArenaSpeedCompareView } from './ArenaSpeedCompareView';

const compare = {
  yours: { actual: 153, scarf: 229, tailwind: 306 },
  tiers: [
    { label: 'Max+ scarf', value: 253, outcome: 'outsped' as const },
    { label: 'Uninvested', value: 122, outcome: 'faster' as const },
    // Deliberately WRONG fixture outcome: 153 (actual) > 100 must recompute to
    // Faster, but this field says 'outsped'. A component that trusts
    // tier.outcome instead of recomputing from youEff would render "Outsped"
    // here and fail the assertion below.
    { label: 'Slowpoke', value: 100, outcome: 'outsped' as const },
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

it('recomputes outcome from youEff instead of trusting the tier\'s precomputed outcome', () => {
  render(<ArenaSpeedCompareView {...props} />);
  // Slowpoke's fixture outcome is 'outsped' (deliberately wrong).
  // 153 (actual) > 100 → must render Faster.
  const row = screen.getByText('Slowpoke').closest('div')!;
  expect(within(row).getByText('Faster')).toBeTruthy();
});

it('switching to Scarf recomputes tier outcomes against 229', () => {
  render(<ArenaSpeedCompareView {...props} />);
  fireEvent.click(screen.getByText('Scarf'));
  // 229 > 122 → Faster; 229 < 253 → Outsped
  expect(screen.getAllByText('Faster').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Outsped').length).toBeGreaterThan(0);
});

it('switching to Tailwind recomputes a tier whose fixture outcome is wrong', () => {
  render(<ArenaSpeedCompareView {...props} />);
  fireEvent.click(screen.getByText('Tailwind'));
  // youEff (306) > 253, but the 'Max+ scarf' tier's fixture outcome says
  // 'outsped'. Must recompute to Faster.
  const row = screen.getByText('Max+ scarf').closest('div')!;
  expect(within(row).getByText('Faster')).toBeTruthy();
});
