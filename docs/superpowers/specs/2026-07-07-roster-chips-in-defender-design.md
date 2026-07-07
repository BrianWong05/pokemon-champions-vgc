# Roster Chips in the Defender Panel

Date: 2026-07-07
Branch: feat/roster-chips-in-panel
Status: Design approved — ready for implementation planning

## Goal

Relocate the battle-roster UI from the floating bottom-right strip (which
overlaps the Defender card's Move row on mobile) into the Defender panel's
header space, on both layouts. Purely presentational — no storage, mask,
modal, or lifecycle changes.

## Decisions

- **Tap = set as defender** (single action; the popover is deleted). Loading
  an opponent mon as ATTACKER remains available through the battle-scan
  modal rows — just not from the chips.
- **Slot prop, roster-agnostic templates.** The calculator page composes
  `<OpponentRosterChips …/>` once and passes it down as
  `defenderExtra?: React.ReactNode`: mobile `ArenaCalculator` →
  `ArenaMonCard` (rendered in the Defender card's header area); desktop
  `DefenderPanel` header area. Neither template imports roster types.
- **Active-chip highlight:** the chip whose id matches the CURRENT defender
  species gets the selected ring (`activeId` prop from the page's calc
  state).
- The ✕ (clear roster / end battle) moves into the chip row's end.
- No roster → the slot is empty and nothing renders (both layouts).

## Component

`OpponentRosterChips` (replaces `OpponentRosterStrip` — old component and
its popover deleted):
`{ roster: number[], byId: Map<number, PokemonBaseStats>, activeId?: number | null, onPick: (id: number) => void, onClear: () => void }`
Compact horizontal row: "Opp" label, small sprites (`PokemonImage`, ~w-8),
`overflow-x-auto` when cramped, ✕ at the end. Tap a chip → `onPick(id)` →
the page's existing `handleLoadDefender(id)` (100% HP, saved builds apply —
unchanged).

## Error handling / edge cases

- Chip species missing from the current format's `pokemonList`
  (`byId.get` undefined): render the sprite by id with a fallback name;
  `handleLoadDefender`'s existing `find` guard already no-ops the tap.
- Defender panel with no Pokémon selected yet: chips still render (that's
  the primary pick-from-six use case).

## Testing

No component-test infra (established project decision): `npx tsc --noEmit`
clean, full `npm test` green (unchanged logic), and a browser check of both
layouts — chips inside the Defender panel, no overlap with the Move row,
tap loads the defender with highlight, ✕ clears, nothing renders without a
roster.

## Out of scope

- Any change to roster storage, masks, scan modal, or confirm flow.
- Attacker-side chips or a second chip row.
- Keeping the floating strip in any form.
