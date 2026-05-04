## Why

Gravity is a field condition that fundamentally changes battle mechanics by grounding all Pokémon and significantly increasing move accuracy. It is a niche but powerful strategy in VGC that requires accurate damage simulation, particularly for Ground-type moves against Flying-type or Levitate Pokémon.

## What Changes

- **Field State Update**: Add `isGravity` boolean flag to the global `CalcState`.
- **UI Integration**: Add a "Gravity" toggle button in the `DamageCalculator` field settings panel, styled consistently with Aura and Terrain toggles.
- **Logic Refactoring**:
    - Update `mapToSmogonField` in `src/utils/damage.ts` to pass the `isGravity` flag to Smogon's `Field` object.
    - Smogon's engine natively handles the grounding effect and accuracy boost when the Gravity flag is set.

## Capabilities

### New Capabilities
- `gravity-mechanics`: Global field effect that grounds all Pokémon and increases move accuracy.

### Modified Capabilities
- `weather-mechanics`: Add Gravity toggle UI alongside other field controls.
- `smogon-calc-integration`: Update Field mapping to support the `isGravity` property.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State management and UI for Gravity.
- `src/utils/damage.ts`: Mapping logic for Smogon's `Field` object.
- `src/components/templates/DamageCalculatorTemplate.tsx`: UI layout for Gravity toggle.
