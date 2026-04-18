## Why

The current Pokémon type display uses generic background colors and lacks visual icons, which makes the UI less intuitive and inaccurate to the game's branding. Providing specific SVG icons and correct hex colors for each type will improve both the aesthetic and functional clarity of the Pokémon details.

## What Changes

- Implement a `TypeBadge` component that displays an SVG icon and the type name.
- Define a project-wide color mapping for all 18 Pokémon types based on accurate game data.
- Update the `@icons` alias to provide convenient access to type SVGs.
- Refactor the `PokemonDetailModal` to use the new `TypeBadge` components.

## Capabilities

### New Capabilities
- `type-specific-icons`: Integration of custom SVG icons for all Pokémon types.

### Modified Capabilities
- `pokemon-detail-modal`: Refined styling to use accurate type colors and icons.

## Impact

- `src/components/atoms/TypeBadge.tsx`: New component.
- `src/assets/icons/`: Directory containing all type SVGs.
- `src/pages/PokemonDetailModal.tsx`: Updated to use the new badge component.
