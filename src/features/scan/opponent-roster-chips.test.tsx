// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OpponentRosterChips from './OpponentRosterChips';

describe('OpponentRosterChips', () => {
  it('renders one ? placeholder per unrevealed slot (up to 6)', () => {
    const byId = new Map([[445, { id: 445, nameEn: 'Garchomp' } as any]]);
    render(<OpponentRosterChips roster={[445]} byId={byId} onPick={() => {}} onClear={() => {}} />);
    // 1 known + 5 unknown placeholders
    expect(screen.getAllByLabelText('Unrevealed opponent slot').length).toBe(5);
  });
});
