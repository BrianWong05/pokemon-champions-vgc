## 1. Setup

- [x] 1.1 Install `@smogon/calc` as a dependency

## 2. Integration

- [x] 2.1 Implement mapping functions to convert application state (Pokemon types, stats, abilities, items, moves, EVs/IVs) to `@smogon/calc`'s `Pokemon` and `Move` objects.
- [x] 2.2 Implement mapping functions to convert application weather and field state to `@smogon/calc`'s `Field` object.
- [x] 2.3 Refactor the existing `calculateDamage` utility to wrap the `@smogon/calc` API using the mapped objects.
- [x] 2.4 Update React components that invoke damage calculations to handle the returned result format from `@smogon/calc`.

## 3. Cleanup and Verification

- [x] 3.1 Remove deprecated custom mathematical formulas for damage, abilities, and modifiers.
- [x] 3.2 Run test cases or manual verification to ensure damage calculations match official game mechanics correctly.
