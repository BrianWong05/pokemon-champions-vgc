## Why

Some moves have dynamic base power that changes based on battle conditions (e.g., 'Last Respects' gains power for each fainted Pokémon on the user's team). Currently, the damage calculator only supports fixed-power moves, leading to incorrect damage assessments for these Pokémon.

## What Changes

- Introduce a mechanism to calculate and apply modifiers to the base power of specific moves dynamically.
- Update the damage calculation pipeline to account for move power modifiers.

## Capabilities

### New Capabilities
- `dynamic-move-power`: Capability to adjust base move power based on battle state (fainted team members, etc.).

### Modified Capabilities
- `damage-calculation-logic`: Include move power calculations in the main calculation pipeline.

## Impact

- `src/utils/damage.ts`: Logic for calculating dynamic power for specific moves.
- Calculator UI: Will correctly display recalculated damage based on dynamic move power.
