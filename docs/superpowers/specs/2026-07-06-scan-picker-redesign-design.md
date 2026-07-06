# Scan-modal Pokémon correction UI — design

**Date:** 2026-07-06 · **Status:** Approved · **Scope:** two files, visual-only

## Problem

When the team scan misidentifies a Pokémon, the correction UI is too small to
use: candidate chips are 40px sprites with 10px truncated labels, the picker
trigger is a 12px underline link, and the "pick by image" grid is six columns
of 36px unlabeled sprites (names only in hover tooltips).

## Decision (with user)

Keep the visual-matching grid paradigm (the picker exists for matching what
you saw in-game, not name lookup) — make everything bigger and labeled.

## Changes

`src/features/scan/ScanTeamModal.tsx` (candidate row):
- Candidate chips: 56px sprite in an inset tile (`rounded-lg bg-inset
  border-line`); selected = `ring-2 ring-accent bg-accent-soft` tile + accent
  name. Name on its own 12px `ink-2` line (truncate ~5.5rem); confidence on a
  separate 10px `ink-4` line.
- Trigger: underline link → secondary button (`bg-inset border border-line-2
  text-ink-2 hover:bg-raise rounded-lg px-3 py-1.5 text-sm font-semibold`),
  labels "Choose another Pokémon" / "Choose Pokémon" / "Close picker".

`src/features/scan/PokemonImagePicker.tsx`:
- Container `bg-card border border-line rounded-xl p-3`.
- Search input: standard app input (h-10, `bg-inset border-line-2 rounded-lg`,
  `placeholder:text-ink-4`, accent focus border).
- Grid: `grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 max-h-72`;
  cells = 64px sprite + 11px name caption (truncated, centered); selected =
  `bg-accent-soft ring-2 ring-accent` + accent caption; hover `bg-raise`.
- MAX_RESULTS 60 cap + hint unchanged. Props/behavior unchanged.

## Verification

`npm test` (247/46) + `npm run build` clean; preview screenshot of an open
picker at desktop and 375px.
