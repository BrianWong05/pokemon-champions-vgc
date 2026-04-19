## Why

The current Damage Calculator UI uses a generic card layout that is not optimized for competitive Pokémon workflows. By refactoring the UI to a "Showdown-style" row-based grid, we can present Base Stats, SP (Stat Points), and Total Stats more clearly, making it easier for players to build and compare spreads.

## What Changes

- Refactor `StatControlGroup` to a compact grid layout (Label, Base, SP, Total).
- Update `AttackerPanel` and `DefenderPanel` to align stats in a vertical stack matching the reference image.
- Implement a "Total SP" counter at the bottom of the stat grid (Max 66).
- Integrate `TypeBadge` components directly into the selection header.
- Maintain the custom Pokémon Champions stat formulas while adopting the professional layout.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `interactive-damage-calculator-ui`: Refactor the UI to follow a compact, row-based grid for stat management.

## Impact

- `src/components/molecules/StatControlGroup.tsx`: Layout refactored to row-based grid.
- `src/components/organisms/AttackerPanel.tsx` & `DefenderPanel.tsx`: UI rearranged for better density and clarity.
- `src/pages/DamageCalculator/index.tsx`: Updated to handle total SP calculations per side.
