// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { WheelPicker, RANK_OPTIONS } from './WheelPicker';

const ROW = 28; // must match WheelPicker's row height

// Drive the wheel the way a flick settles: set the scroll offset, fire scroll,
// then let the settle timer fire so it emits exactly once.
function flickTo(el: HTMLElement, index: number) {
  el.scrollTop = index * ROW;
  fireEvent.scroll(el);
  act(() => { vi.advanceTimersByTime(150); });
}

it('emits the settled index once when a flick comes to rest', () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  render(<WheelPicker label="Spe rank" options={RANK_OPTIONS} index={6} onChange={onChange} />);
  const wheel = screen.getByLabelText('Spe rank') as HTMLElement;

  flickTo(wheel, 9);                 // RANK_OPTIONS index 9 = stage +3
  vi.useRealTimers();

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenLastCalledWith(9);
});

it('does not re-emit when scrolled back to the current index', () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  render(<WheelPicker label="Spe rank" options={RANK_OPTIONS} index={6} onChange={onChange} />);
  const wheel = screen.getByLabelText('Spe rank') as HTMLElement;

  flickTo(wheel, 6);                 // same as current — no change
  vi.useRealTimers();

  expect(onChange).not.toHaveBeenCalled();
});
