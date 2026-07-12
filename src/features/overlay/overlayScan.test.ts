import { describe, it, expect } from 'vitest';
import { routeScan } from './overlayScan';
import type { SlotResult } from '../scan/types';

const box = (x: number) => ({ x, y: 10, w: 100, h: 40 });
const slot = (over: Partial<SlotResult>): SlotResult => ({ box: box(0), candidates: [], ...over });

describe('routeScan', () => {
  it('team mode with candidates -> confirm view with the slots', () => {
    const slots = [slot({ candidates: [{ id: 445, score: 0.9 }] })];
    expect(routeScan('team', slots)).toEqual({ view: 'confirm', slots });
  });

  it('team mode with zero identified slots -> empty error', () => {
    expect(routeScan('team', [slot({})])).toEqual({ view: 'error', reason: 'empty' });
  });

  it('battle mode -> left-most opponent is defender, both HP entries kept', () => {
    const slots = [
      slot({ box: box(900), side: 'opponent', candidates: [{ id: 823, score: 0.8 }], hpPercent: 100 }),
      slot({ box: box(500), side: 'opponent', candidates: [{ id: 445, score: 0.9 }], hpPercent: 56 }),
      slot({ box: box(100), side: 'player', candidates: [{ id: 970, score: 0.9 }], hpPercent: 80 }),
    ];
    expect(routeScan('battle', slots)).toEqual({
      view: 'calc',
      defenderId: 445,
      hpPercent: 56,
      hpEntries: [{ id: 445, hpPercent: 56 }, { id: 823, hpPercent: 100 }],
    });
  });

  it('battle slot without hp -> hpPercent null', () => {
    const slots = [slot({ side: 'opponent', candidates: [{ id: 445, score: 0.9 }] })];
    expect(routeScan('battle', slots)).toMatchObject({ view: 'calc', defenderId: 445, hpPercent: null });
  });

  it('battle mode with no identified opponents -> no-roster-match error', () => {
    const slots = [slot({ side: 'opponent', candidates: [] })];
    expect(routeScan('battle', slots)).toEqual({ view: 'error', reason: 'no-roster-match' });
  });

  it('null mode -> empty error', () => {
    expect(routeScan(null, [])).toEqual({ view: 'error', reason: 'empty' });
  });
});
