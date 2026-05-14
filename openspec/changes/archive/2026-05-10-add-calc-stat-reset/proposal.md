## Why
Users currently have to manually reset each individual SP/EV field in the Damage Calculator. Providing a "Reset Stats" button would significantly improve user efficiency and match the pattern already established in the EV/SP Converter.

## What Changes
- Add a "Reset Stats" button to the `PokemonConfigForm` or `StatGrid` within the Damage Calculator.
- Implement a `RESET_STATS` action in the `usePokemonEditor` reducer to clear all SP/EV values to zero.

## Capabilities

### New Capabilities
- `stat-reset-action`: Adding the ability to clear all stat allocations (SP/EV) in a single action.

## Impact
- Improved UX for stat optimization in the Damage Calculator.
