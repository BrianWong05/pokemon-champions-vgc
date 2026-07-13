import type { MergedPlayerScan, PlayerSlot } from './mergePlayerScan';
import type { PlayerScanVocab } from '@/db/repositories/scan.repo';

// ---- edit glue (moved verbatim from PlayerScanPanel; shared by both panels) ----

export interface EditableSlot {
  speciesId: number | null;
  ability: string | null;
  item: string | null;
  moves: (number | null)[];
  sp: number[]; // length 6, [hp,atk,def,spa,spd,spe]
  nature: string;
}

export const toEditable = (slot: PlayerSlot): EditableSlot => ({
  speciesId: slot.species[0]?.id ?? null,
  ability: slot.ability.value,
  item: slot.item.value,
  moves: slot.moves.map((m) => m.value),
  sp: [0, 1, 2, 3, 4, 5].map((i) => slot.statReads[i]?.sp ?? 0),
  nature: slot.nature.name,
});

/** Fold the local edits back onto the merged slots, ready for buildConfigs. */
export function applyEditsToSlots(merged: MergedPlayerScan, edits: Record<number, EditableSlot>): MergedPlayerScan {
  const slots: PlayerSlot[] = merged.slots.map((slot) => {
    const e = edits[slot.slot] ?? toEditable(slot);
    const species = e.speciesId != null ? [{ id: e.speciesId, score: 1 }] : slot.species;
    return {
      ...slot,
      species,
      ability: { ...slot.ability, value: e.ability },
      item: { ...slot.item, value: e.item },
      moves: slot.moves.map((m, i) => ({ ...m, value: e.moves[i] ?? null })),
      statReads: e.sp.map((sp, i) => ({ ...(slot.statReads[i] ?? { stat: null, mult: null, consistent: false }), sp })),
      nature: { ...slot.nature, name: e.nature },
    };
  });
  return { ...merged, slots };
}

// ---- conflict-signal derivation (new; derivable-only) ----

export interface SlotFlags {
  speciesUncertain: boolean;    // species top score < 0.5 (same bar PlayerScanPanel uses)
  speciesDisagreement: boolean; // moves/stats screens read different species
  illegalMoves: number[];       // move indices whose id is not in the species learnset
  badAbility: boolean;          // read ability is not one of the species' abilities
  ambiguousItem: boolean;       // top two item reads are near-tied
  inconsistentSp: number[];     // stat indices whose read failed the stat-math cross-check
}

const SPECIES_DISAGREE_WARNING = 'species disagreement between moves and stats screens';
// ponytail: 0.08 item-tie margin is a calibration knob — widen if Sitrus/Lum-style pairs slip through.
const ITEM_AMBIGUOUS_MARGIN = 0.08;

export function deriveSlotFlags(slot: PlayerSlot, vocab: PlayerScanVocab | null): SlotFlags {
  const speciesId = slot.species[0]?.id ?? null;
  const legalMoveIds = speciesId != null && vocab ? new Set(vocab.movesFor(speciesId).map((m) => m.moveId)) : null;
  const legalAbilities = speciesId != null && vocab ? new Set(vocab.abilitiesFor(speciesId).map((a) => a.key)) : null;

  const illegalMoves: number[] = [];
  slot.moves.forEach((m, i) => { if (m.value != null && legalMoveIds && !legalMoveIds.has(m.value)) illegalMoves.push(i); });

  const inconsistentSp: number[] = [];
  slot.statReads.forEach((s, i) => { if (s && !s.consistent) inconsistentSp.push(i); });

  const opts = slot.item.options;
  const ambiguousItem = opts.length >= 2 && opts[0].score - opts[1].score < ITEM_AMBIGUOUS_MARGIN;

  return {
    speciesUncertain: (slot.species[0]?.score ?? 0) < 0.5,
    speciesDisagreement: slot.warnings.includes(SPECIES_DISAGREE_WARNING),
    illegalMoves,
    badAbility: slot.ability.value != null && !!legalAbilities && !legalAbilities.has(slot.ability.value),
    ambiguousItem,
    inconsistentSp,
  };
}

export const isSlotFlagged = (f: SlotFlags): boolean =>
  f.speciesUncertain || f.speciesDisagreement || f.illegalMoves.length > 0 ||
  f.badAbility || f.ambiguousItem || f.inconsistentSp.length > 0;
