import { describe, it, expect } from 'vitest';
import type { PlayerSlot } from './mergePlayerScan';
import type { PlayerScanVocab } from '@/db/repositories/scan.repo';
import { toEditable, applyEditsToSlots, deriveSlotFlags, isSlotFlagged } from './playerScanFlags';

// Minimal PlayerSlot factory — only the fields the helpers read.
function slot(over: Partial<PlayerSlot> = {}): PlayerSlot {
  return {
    slot: 0,
    species: [{ id: 445, score: 0.9 }],
    ability: { value: 'Rough Skin', options: [{ value: 'Rough Skin', score: 0.9 }], confident: true },
    item: { value: 'Sitrus Berry', options: [{ value: 'Sitrus Berry', score: 0.9 }], confident: true },
    moves: [
      { value: 100, options: [], confident: true },
      { value: null, options: [], confident: false },
      { value: null, options: [], confident: false },
      { value: null, options: [], confident: false },
    ],
    statReads: [
      { stat: 200, sp: 20, mult: null, consistent: true },
      { stat: 150, sp: 10, mult: 1, consistent: true },
      { stat: 100, sp: 0, mult: 1, consistent: true },
      { stat: 90, sp: 0, mult: 1, consistent: true },
      { stat: 110, sp: 0, mult: 1, consistent: true },
      { stat: 120, sp: 0, mult: 1, consistent: true },
    ],
    nature: { name: 'Adamant', confident: true },
    warnings: [],
    ...over,
  };
}

// Fake vocab: species 445 knows move 100 and ability 'Rough Skin'.
const vocab = {
  movesFor: (id: number) => (id === 445 ? [{ moveId: 100 }] : []),
  abilitiesFor: (id: number) => (id === 445 ? [{ key: 'Rough Skin' }] : []),
  items: [],
} as unknown as PlayerScanVocab;

describe('applyEditsToSlots', () => {
  it('pins the edited species with score 1 and threads field edits', () => {
    const merged = { lang: 'en' as const, slots: [slot()], warnings: [] };
    const edits = { 0: { ...toEditable(slot()), speciesId: 130, ability: 'Intimidate', sp: [4, 252, 0, 0, 0, 252] } };
    const out = applyEditsToSlots(merged, edits);
    expect(out.slots[0].species).toEqual([{ id: 130, score: 1 }]);
    expect(out.slots[0].ability.value).toBe('Intimidate');
    expect(out.slots[0].statReads[1].sp).toBe(252);
  });
});

describe('deriveSlotFlags', () => {
  it('is clean when everything reads legal and confident', () => {
    expect(isSlotFlagged(deriveSlotFlags(slot(), vocab))).toBe(false);
  });
  it('flags an illegal move for the current species', () => {
    const f = deriveSlotFlags(slot({ moves: [{ value: 999, options: [], confident: true }, ...slot().moves.slice(1)] }), vocab);
    expect(f.illegalMoves).toEqual([0]);
    expect(isSlotFlagged(f)).toBe(true);
  });
  it('flags an off-species ability', () => {
    expect(deriveSlotFlags(slot({ ability: { value: 'Levitate', options: [], confident: true } }), vocab).badAbility).toBe(true);
  });
  it('flags a low-confidence species and a cross-screen disagreement', () => {
    expect(deriveSlotFlags(slot({ species: [{ id: 445, score: 0.3 }] }), vocab).speciesUncertain).toBe(true);
    expect(deriveSlotFlags(slot({ warnings: ['species disagreement between moves and stats screens'] }), vocab).speciesDisagreement).toBe(true);
  });
  it('flags near-tied item options and an inconsistent stat row', () => {
    const amb = deriveSlotFlags(slot({ item: { value: 'Sitrus Berry', options: [{ value: 'Sitrus Berry', score: 0.5 }, { value: 'Lum Berry', score: 0.48 }], confident: false } }), vocab);
    expect(amb.ambiguousItem).toBe(true);
    const bad = slot();
    bad.statReads[1] = { ...bad.statReads[1], consistent: false };
    expect(deriveSlotFlags(bad, vocab).inconsistentSp).toEqual([1]);
  });
});
