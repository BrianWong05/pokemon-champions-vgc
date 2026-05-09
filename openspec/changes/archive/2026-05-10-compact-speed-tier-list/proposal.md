## Why

The current Speed Tier List layout uses a full-width row for each Pokémon, leading to excessive vertical scrolling and a lot of empty space on larger screens. Users want a more compact and space-efficient view that allows them to see more Pokémon at once.

## What Changes

- **Compact Layout**: Transition from a single-column list to a multi-column grid layout for Pokémon within each Speed Tier section.
- **Card-Based View**: Redesign the individual Pokémon entries into smaller, more compact cards.
- **Responsive Design**: Ensure the grid adapts from 1 column on mobile to 3 or 4 columns on desktop.
- **Visual Optimization**: Minimize padding and font sizes while maintaining readability and clarity of the speed benchmarks.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `speed-tier-list`: Update the Speed Tier List component and its sub-components (`TierSection`, `StatGridItem`) to support a compact grid layout.

## Impact

- **UI Components**: Significant refactoring of `StatGridItem.tsx` and `TierSection.tsx` to switch from a `grid-cols-12` row layout to a flexible card-based layout.
- **User Experience**: Improved information density, allowing users to scan speed tiers much faster without excessive scrolling.
- **Frontend**: CSS/Tailwind adjustments to handle the new responsive grid structure.
