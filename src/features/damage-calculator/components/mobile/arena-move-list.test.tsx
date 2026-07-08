// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { ArenaMoveList } from './ArenaMoveList';

const move = (nameEn: string, typeId: number, damageClassId: number, power: number | null) =>
  ({ nameEn, nameZh: null, typeId, damageClassId, power } as any);

const side = {
  moves: [move('Power Gem', 6, 3, 80), null, null, null],
  activeMoveIndex: 0,
} as any;
const results = [{ minPercent: 62, maxPercent: 74, moveType: 6 } as any, null, null, null];

it('shows name, base power and percent for a filled slot', () => {
  render(<ArenaMoveList side={side} results={results} onSelect={() => {}} onEdit={() => {}} />);
  expect(screen.getByText('Power Gem')).toBeTruthy();
  expect(screen.getByText('80')).toBeTruthy();       // base power
  expect(screen.getByText('62–74%')).toBeTruthy();
});

it('calls onSelect with the row index', () => {
  const onSelect = vi.fn();
  render(<ArenaMoveList side={side} results={results} onSelect={onSelect} onEdit={() => {}} />);
  fireEvent.click(screen.getByText('Power Gem'));
  expect(onSelect).toHaveBeenCalledWith(0);
});
