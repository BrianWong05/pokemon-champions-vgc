## Why

The current EV converter allows the total sum of EVs to exceed the VGC limit of 510. This leads to invalid spreads and an confusing user experience. Enforcing the 510 total EV limit ensures that players build valid competitive spreads and provides immediate feedback when the limit is reached.

## What Changes

- Implement validation logic in the `EvSpConverterPage` to prevent the total EV sum from exceeding 510.
- When a user adjusts a stat, calculate the remaining EV pool and cap the new value accordingly.
- Ensure both the numeric input and the slider respect the global limit.

## Capabilities

### New Capabilities
- `global-stat-limit-enforcement`: Logic to enforce a maximum sum across multiple numeric inputs.

### Modified Capabilities
- `ev-sp-conversion-logic`: Refine the logic to include global validation against the 510 EV limit.

## Impact

- `src/pages/EvSpConverter/index.tsx`: Updated state management logic to handle global limit enforcement.
