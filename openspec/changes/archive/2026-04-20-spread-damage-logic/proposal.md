## Why

In Pokémon VGC (Double Battles), moves that target multiple Pokémon deal reduced damage (0.75x) to maintain balance. Currently, the damage calculator lacks a mechanism to toggle between single-target and multi-target (spread) damage, leading to inaccurate calculations for common moves like Rock Slide or Dazzling Gleam.

## What Changes

- Add a global `isSpreadTarget` boolean state to the Damage Calculator.
- Implement a UI toggle button group in the "Field Weather" or "Field Conditions" section to select between "Single Target" and "Spread / Double Target".
- Integrate a `getSpreadModifier` utility into the damage calculation pipeline.
- Apply the spread modifier (0.75x) right after the Base Damage calculation.

## Capabilities

### New Capabilities
- `spread-damage-mechanics`: Multi-target damage reduction logic and UI.

### Modified Capabilities
- `damage-calculation-logic`: Integrate spread modifier into the core damage formula.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State management and pipeline update.
- `src/components/templates/DamageCalculatorTemplate.tsx`: UI toggle for field conditions.
- `src/utils/damage.ts`: New utility function for spread damage.
