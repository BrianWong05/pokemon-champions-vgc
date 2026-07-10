# Opponent scan unique-species assignment — design

**Date:** 2026-07-11  
**Status:** Approved  
**Scope:** Opponent Team Preview confirmation only

## Problem

Each detected opponent slot currently selects its own highest-scoring candidate
independently. When several crops resemble the same Pokémon, multiple slots can
therefore select the same species. The save path deduplicates IDs afterward, but
that silently produces an incomplete roster instead of a valid Team Preview.

## Required behavior

- A confirmed opponent roster must contain at most one instance of each Pokémon ID.
- Initial scan results choose the highest-scoring overall assignment of distinct IDs
  from the ranked candidates, rather than resolving duplicates in slot order.
- An ID selected in one slot is unavailable in every other slot's ranked candidates
  and manual Pokédex picker.
- Clearing or changing the owning slot makes its previous ID available again.
- Saving retains a uniqueness check as defense-in-depth.

Pokémon forms remain distinct when they have distinct database IDs; the invariant is
based on the same exact IDs used by recognition and persistence.

## Design

Add pure roster helpers alongside the Scan Opponent page:

1. A team assignment helper receives the opponent slots and chooses one candidate
   per slot with no repeated IDs. Because a Team Preview has at most six slots and
   each slot exposes a small ranked list, an exhaustive depth-first search is small
   and deterministic. It maximizes total candidate score; ties preserve candidate
   and slot order. A slot may remain unassigned when no unused candidate exists.
2. A helper derives the IDs occupied by all slots except the currently edited slot.
   The correction panel filters those IDs out of its candidate buttons and passes
   them to the Pokédex picker as disabled choices.
3. The entry update path refuses an ID already owned by another slot. This is the
   state-level invariant even if a future UI path bypasses the visual disabling.
4. The existing save-time deduplication remains unchanged as the final guard.

The recognition model, candidate scores, crop detection, and saved-roster format do
not change.

## UI behavior

If Slot 2 contains Incineroar, Incineroar does not appear as a selectable prediction
for Slot 6 and is disabled in Slot 6's Pokédex picker. Editing Slot 2 still shows its
own Incineroar selection. Once Slot 2 changes or clears, Incineroar becomes available
to Slot 6 immediately.

## Error handling

If the available candidate lists cannot supply a unique ID for every detected slot,
the unresolved slot is left empty for manual correction. The app never invents a
low-ranked species outside the recognizer's candidate data and never deletes another
slot's selection implicitly.

## Tests

- The assignment helper replaces duplicate top-1 predictions with the best unique
  overall combination.
- Global assignment beats a greedy slot-order choice in a constructed score case.
- A slot is left empty when all its candidates are already used.
- IDs used by other slots are excluded, while the current slot's own ID remains
  available during editing.
- The state update helper rejects duplicate manual selection and accepts the ID after
  the previous owner changes or clears.
- Existing `opponentIdsFromEntries` behavior remains covered as the save-time guard.

Run the focused Scan Opponent tests, the full Vitest suite, TypeScript checking, and
the production build.
