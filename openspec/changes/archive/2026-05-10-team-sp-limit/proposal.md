## Why
Currently, the SP limit of 66 is likely enforced globally or implicitly. The user wants this constraint to be explicitly applied *only* when editing a Pokémon within a team, and not in the standalone Damage Calculator.

## What Changes
- Introduce a prop (e.g., `enforceSpLimit`) to `PokemonConfigForm` and `StatGrid`.
- Conditionally render the SP limit UI and enforcement logic based on this prop.

## Capabilities

### New Capabilities
- `sp-limit-constraint`: Enforcing a team-specific SP limit.

### Modified Capabilities
- 

## Impact
- Teams will strictly enforce 66 SP max.
- Damage Calculator will allow unrestricted SP (or different limits).
