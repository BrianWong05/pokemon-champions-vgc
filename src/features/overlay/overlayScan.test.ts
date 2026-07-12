import { describe, it, expect } from 'vitest';
import { routeScan } from './overlayScan';
import type { SlotResult } from '../scan/types';

const slot = (candidates: Array<{ id: number; score: number }>, side?: 'player' | 'opponent'): SlotResult =>
  ({ box: { x: 0, y: 10, w: 100, h: 40 }, candidates, side });

describe('routeScan', () => {
  it('team mode with candidates -> confirm view with the slots', () => {
    const slots = [slot([{ id: 445, score: 0.9 }])];
    expect(routeScan('team', slots)).toEqual({ view: 'confirm', slots });
  });

  it('team mode with zero identified slots -> empty error', () => {
    expect(routeScan('team', [slot([])])).toEqual({ view: 'error', reason: 'empty' });
  });

  it('battle frames are not scan-routed -> battle error', () => {
    const slots = [slot([{ id: 445, score: 0.9 }], 'opponent')];
    expect(routeScan('battle', slots)).toEqual({ view: 'error', reason: 'battle' });
  });

  it('null mode -> empty error', () => {
    expect(routeScan(null, [])).toEqual({ view: 'error', reason: 'empty' });
  });
});
