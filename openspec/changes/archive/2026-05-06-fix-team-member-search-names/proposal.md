## Why

When adding a Pokémon to a team, the search dropdown in the `TeamDetailPage` displays entries without names, making it impossible for users to identify which Pokémon they are selecting.

## What Changes

- Identify why the Pokémon name is not being rendered in the search results within `PokemonSearchSelect`.
- Ensure the label or name field is correctly accessed and displayed in the dropdown items.

## Capabilities

### New Capabilities

### Modified Capabilities
- `team-management`: Fix search display requirements for team building.

## Impact

- **UI**: Team member search results will correctly show Pokémon names.
- **Components**: Likely updating `src/components/molecules/PokemonSearchSelect.tsx` or its usage in `TeamDetailPage`.
