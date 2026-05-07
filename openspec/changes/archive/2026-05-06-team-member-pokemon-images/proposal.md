## Why

Team member cards in the team detail view are currently missing the Pokémon's visual representation, making it harder to quickly identify members at a glance.

## What Changes

- Integrate the `PokemonImage` component into the team member card layout.
- Ensure the image correctly resolves for each Pokémon in the saved team configuration.

## Capabilities

### New Capabilities
- `team-member-image-display`: Visualizing Pokémon sprites on team member cards.

### Modified Capabilities

## Impact

- **UI Components**: Update to the team member card in `TeamDetailPage`.
- **Assets**: Utilizing the existing `PokemonImage` component and the `/images/pokemon/thumbnails/` asset path.
