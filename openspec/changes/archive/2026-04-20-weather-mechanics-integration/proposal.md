## Why

Weather conditions (Sun, Rain, Sandstorm, Snow) are foundational to Pokémon VGC strategy, significantly altering move types, base power, and Pokémon stats. The current calculator lacks this functionality, leading to incomplete damage results.

## What Changes

- Add a global `activeWeather` state to the Damage Calculator.
- Implement a "Field Conditions" UI section with toggle buttons for weather selection.
- Update `getModifiedMoveType` to handle "Weather Ball" type changes.
- Update `getBasePowerModifier` to double "Weather Ball" power in active weather.
- Create `getWeatherDamageModifier` to apply multipliers for Fire/Water moves in Sun/Rain.
- Update `getStatModifier` to apply Sp. Def boosts for Rock-types in Sand and Defense boosts for Ice-types in Snow.

## Capabilities

### New Capabilities
- `weather-mechanics`: Multi-stage weather modifiers (Type, Power, Stat, Damage).

### Modified Capabilities
- `damage-calculation-logic`: Integrate weather modifiers into the core calculation pipeline.

## Impact

- `src/pages/DamageCalculator/index.tsx`: Component state, UI, and pipeline refactoring.
- `src/utils/damage.ts`: New utility functions for weather-based multipliers.
