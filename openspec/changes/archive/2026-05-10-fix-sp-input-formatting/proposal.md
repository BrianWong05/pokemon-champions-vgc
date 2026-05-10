## Why
The SP numeric input fields incorrectly allow leading zeros (e.g., '01' instead of '1'), which is poor UX for stat configuration.

## What Changes
- Refactor the `onChange` handler for numeric inputs in `StatRow` to parse the input as an integer correctly.

## Capabilities

### New Capabilities
- `sp-input-fix`: Correcting numeric input formatting.

### Modified Capabilities
- 

## Impact
- Fixes stat input behavior in the Damage Calculator.
