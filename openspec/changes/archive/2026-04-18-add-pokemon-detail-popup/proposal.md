## Why

The Speed Tier List currently only shows speed-related benchmarks. Users need a way to see the full profile of a Pokémon (all base stats, types, and other forms) without leaving the context of the list. A modal popup provides this detailed information quickly and keeps the user engaged with the primary tool.

## What Changes

- Implement a modal component (`PokemonDetailModal`) to display comprehensive Pokémon information.
- Update `StatGridItem` to be clickable, triggering the detail modal.
- Add a new data fetching query to retrieve full base stats and related forms (Alola, Galar, Hisui, Paldea, Megas) for a specific Pokémon.
- Display types and other available forms in the modal.

## Capabilities

### New Capabilities
- `pokemon-detail-modal`: A UI component for displaying full Pokémon profiles including stats, types, and forms.

### Modified Capabilities
- `speed-tier-list`: Enhanced interaction to allow users to view detailed Pokémon info from the list.

## Impact

- `src/components/organisms/PokemonDetailModal.tsx`: New component.
- `src/pages/SpeedTierList/index.tsx`: Updated to manage modal state and data fetching.
- `src/components/molecules/StatGridItem.tsx`: Updated to handle click events.
