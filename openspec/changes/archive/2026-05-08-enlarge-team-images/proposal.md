## Why

The current Pokémon icons in the team overview card are small (`w-6 h-6`), making them difficult to recognize at a glance. Enlarging these Pokémon images will improve the visual prominence of the team's composition while maintaining the established 2x3 grid structure. The user has specifically requested to enlarge only the Pokémon images and not the item images.

## What Changes

- Increase the size of `PokemonImage` in the team cards on the "My Teams" page.
- Maintain the 2x3 grid layout and the existing card dimensions.
- Keep `ItemImage` at its current size (`w-6 h-6`).
- Ensure the images remain centered and properly spaced within their grid cells.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `team-management`: Update the team card rendering requirements to specify larger image sizes for Pokémon.

## Impact

- `src/pages/Teams/index.tsx`: UI styling update for `PokemonImage` component.
