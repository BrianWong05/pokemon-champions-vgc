## Why

Currently, the application only identifies a subset of multi-strike (multihit) moves, and it doesn't strictly enforce or guide the user on the correct min/max hit limits for each move in the Damage Calculator. Accurate multi-strike data is critical for competitive Pokémon damage calculations.

## What Changes

- Update the application's multi-strike move detection logic to include all moves from the latest generations (up to Gen 9).
- Implement metadata for each multi-strike move defining its minimum and maximum hit counts.
- Ensure the Damage Calculator UI reflects these limits when a multi-strike move is selected.

## Capabilities

### New Capabilities
- `multistrike-move-metadata`: Provides a comprehensive registry of multi-strike moves with their hit count constraints (min/max).

### Modified Capabilities

## Impact

- `src/utils/damage.ts`: Update `isMultiHitMove` and implement hit limit retrieval.
- `src/components/organisms/PokemonPanel.tsx`: Update the hit count input to use the correct limits based on the selected move.
