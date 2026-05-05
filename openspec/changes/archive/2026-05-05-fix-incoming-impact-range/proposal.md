## Why

The current "INCOMING IMPACT RANGE" displayed in the UI does not perfectly align with the damage range string (desc) output by the underlying `@smogon/calc` engine. This causes confusion for users as the detailed description might show different minimum or maximum roll values than the prominent visual range. Relying directly on the Smogon engine's calculated damage range array ensures consistency across the application.

## What Changes

- Update the Damage Result calculation utilities to extract and expose the exact 16-roll damage array provided by `@smogon/calc`.
- Modify the UI components displaying the incoming impact range to derive their minimum and maximum percentages directly from the Smogon output, rather than relying on disparate calculations.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `interactive-damage-calculator-ui`: The UI requirement for displaying the damage range needs to specify that it must reflect the exact min/max bounds of the Smogon output array.
- `damage-calculation-logic`: The calculation logic requirement needs to explicitly dictate that the damage output returned to the UI includes the exact Smogon damage rolls.

## Impact

- **Results Display**: The central damage range output component will update its source of truth.
- **Damage Utilities**: The `calculateSmogonDamage` (or equivalent) wrapper functions will need to ensure the raw damage array or the specific min/max bounds from the array are passed down to the components rendering the impact range.