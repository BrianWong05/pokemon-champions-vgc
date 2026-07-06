// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NavRail } from './NavRail';
import { RegPill } from './RegPill';

describe('NavRail', () => {
  it('renders one icon button per tab with aria-labels, no text labels', () => {
    render(<NavRail active="calc" />);
    expect(screen.getByLabelText('Calculator')).toBeTruthy();
    expect(screen.getByLabelText('Teams')).toBeTruthy();
    expect(screen.getByLabelText('EV/SP')).toBeTruthy();
    expect(screen.getByLabelText('Speed tiers')).toBeTruthy();
    expect(screen.queryByText('Calculator')).toBeNull();
  });

  it('marks the active tab and reports clicks', () => {
    const onChange = vi.fn();
    const { container } = render(<NavRail active="calc" onChange={onChange} />);
    const calcButton = container.querySelector('button[aria-label="Calculator"]');
    expect(calcButton?.getAttribute('aria-current')).toBe('page');
    const teamsButton = container.querySelector('button[aria-label="Teams"]');
    fireEvent.click(teamsButton!);
    expect(onChange).toHaveBeenCalledWith('teams');
  });

  it('renders the bottom slot', () => {
    render(<NavRail active="calc" bottom={<span>bottom-slot</span>} />);
    expect(screen.getByText('bottom-slot')).toBeTruthy();
  });
});

describe('RegPill compact', () => {
  it('renders only the short code', () => {
    render(<RegPill value="Reg M-B" compact />);
    expect(screen.getByText('M-B')).toBeTruthy();
    expect(screen.queryByText('Reg M-B')).toBeNull();
  });

  it('strips full "Regulation" prefix in compact mode', () => {
    render(<RegPill value="Regulation M-B" compact />);
    // Note: no afterEach cleanup, so use getAllByText to handle multiple renders
    expect(screen.getAllByText('M-B').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/ulation/)).toBeNull();
  });
});
