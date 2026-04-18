## Why

While the speed tiers are grouped by base speed, showing the base speed directly in each Pokémon's row provides immediate clarity and context for users, especially when comparing different Pokémon within the same tier or looking at a specific row.

## What Changes

- Update `StatGridItem` to accept and display a `baseSpeed` property.
- Update `TierSection` grid header to include a "Base" column label.
- Refactor the grid column layout to accommodate the new "Base" column while maintaining responsiveness and 12-column alignment.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `speed-tier-list`: Enhanced display logic to include base speed values in individual rows.

## Impact

- `src/components/molecules/StatGridItem.tsx`: Props and UI updated.
- `src/components/organisms/TierSection.tsx`: Header and layout updated.
