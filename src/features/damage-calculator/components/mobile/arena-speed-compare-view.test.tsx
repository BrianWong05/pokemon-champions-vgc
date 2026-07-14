// @vitest-environment jsdom
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
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

it('Trick Room flips the comparison direction: slower still moves first', () => {
  render(<ArenaSpeedCompareView {...props} trickRoom />);
  // youEff (153) < 253 → normally Outsped, but under Trick Room the slower
  // side moves first, so this tier must render Faster.
  const row = screen.getByText('Max+ scarf').closest('div')!;
  expect(within(row).getByText('Faster')).toBeTruthy();
});

it('the Spe rank wheel dispatches the stage (index - 6) via onYouStage', () => {
  vi.useFakeTimers();
  const onYouStage = vi.fn();
  render(<ArenaSpeedCompareView {...props} onYouStage={onYouStage} />);
  const wheel = screen.getAllByLabelText('Spe rank')[0]; // "you" column is first
  wheel.scrollTop = 8 * 28; // RANK_OPTIONS index 8 = stage +2
  fireEvent.scroll(wheel);
  act(() => { vi.advanceTimersByTime(150); });
  vi.useRealTimers();
  expect(onYouStage).toHaveBeenCalledWith(2);
});

it('renders a Spe SP wheel only when onYouSpeSp is supplied', () => {
  const { rerender } = render(<ArenaSpeedCompareView {...props} />);
  expect(screen.queryByLabelText('Spe SP')).toBeNull();
  rerender(<ArenaSpeedCompareView {...props} youSpeSp={12} onYouSpeSp={() => {}} />);
  expect(screen.getByLabelText('Spe SP')).toBeTruthy();
});

it('does not show the Trick Room indicator by default', () => {
  render(<ArenaSpeedCompareView {...props} />);
  expect(screen.queryByText(/Trick Room/i)).toBeNull();
});

it('shows the Trick Room indicator when trickRoom is true', () => {
  render(<ArenaSpeedCompareView {...props} trickRoom />);
  expect(screen.getByText(/Trick Room/i)).toBeTruthy();
});
