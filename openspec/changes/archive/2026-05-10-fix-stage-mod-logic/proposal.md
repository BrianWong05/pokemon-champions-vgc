## Why
Stage boosts and reductions in the damage calculator are not correctly updating the Pokémon's stats, leading to inaccurate damage calculations.

## What Changes
- Investigate and fix the `SET_STAT_STAGE` reducer action to ensure correct state updates.
- Verify that stat modifiers correctly integrate with damage-calc utils.

## Capabilities

### New Capabilities
- `stage-modification-fix`: Addressing the failure of Pokémon stage modifiers.

### Modified Capabilities
- 

## Impact
- Fixes damage calculation accuracy.
