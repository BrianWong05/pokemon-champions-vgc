## Why

Certain Pokémon moves (e.g., Bullet Seed, Icicle Spear, Population Bomb) hit multiple times in a single turn. The current calculator assumes a single hit or uses a default, which prevents accurate damage assessment for multi-hit scenarios common in VGC.

## What Changes

- Add a "Hits" selector to the move input row for moves that are tagged as multi-hit.
- Update the damage calculation logic to multiply the result by the selected number of hits (or pass the hit count to the engine).
- Ensure the UI only shows the hit selector when a multi-hit move is selected.

## Capabilities

### New Capabilities
- `multi-hit-move-selection`: Provides a UI control to specify the number of hits (usually 2-5 or a fixed number) for multi-hit moves.

### Modified Capabilities
- `move-selection-integration`: Extend the move selection data structure to support a `hits` property.
- `damage-calculation-logic`: Update the engine integration to account for the number of hits.

## Impact

- `src/components/organisms/PokemonPanel.tsx`: Will need to render the hit selector.
- `src/components/molecules/MoveSearchSelect.tsx`: May need updates to identify multi-hit moves.
- `src/utils/damage.ts`: Must incorporate the hit count into the Smogon calc parameters.
