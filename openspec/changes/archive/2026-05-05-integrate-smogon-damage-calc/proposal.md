## Why

The current application requires a robust, standardized damage calculator engine. The `@smogon/calc` package provides a battle-tested, accurate, and community-maintained engine used by the official Pokemon Showdown damage calculator. Integrating it will ensure accurate damage calculations, saving time over building a custom engine and improving reliability.

## What Changes

- Add `@smogon/calc` as a dependency.
- Refactor existing custom damage calculation logic to use `@smogon/calc`.
- Update state or mapping logic to ensure that UI components pass the correct data structure into `@smogon/calc` to compute damage.

## Capabilities

### New Capabilities
- `smogon-calc-integration`: Integrating `@smogon/calc` engine to perform damage calculations, replacing custom logic where applicable.

### Modified Capabilities
- `damage-calculation-logic`: Adapting this capability to use `@smogon/calc` instead of custom calculation formulas.

## Impact

- `package.json` will have a new dependency.
- Existing utility functions for damage calculations will be replaced or modified to act as adapters for `@smogon/calc`.
