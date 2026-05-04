## Why

Terrains (Electric, Grassy, Misty, Psychic) are fundamental field conditions in VGC that significantly impact damage calculations, type effectiveness, and move properties. Currently, the calculator lacks support for these conditions, preventing accurate simulations for Gen 6+ mechanics.

## What Changes

- **Field State Update**: Add `terrain` field to the global `CalcState` to support 'Electric', 'Grassy', 'Misty', 'Psychic', and 'None'.
- **UI Integration**: Add terrain selection buttons in the `DamageCalculator` field settings panel, styled similarly to Weather and Aura selectors.
- **Logic Refactoring**:
    - Update `mapToSmogonField` in `src/utils/damage.ts` to map the new terrain state to Smogon's `Field` object.
    - Implement terrain-specific damage modifiers (e.g., Grassy Terrain's 0.5x multiplier for Earthquake/Magnitude/Bulldoze).

## Capabilities

### New Capabilities
- `terrain-mechanics`: Global field-wide damage and effect modifications based on active terrain.

### Modified Capabilities
- `weather-mechanics`: Add terrain selection UI alongside weather and aura controls.
- `smogon-calc-integration`: Update the Field mapping logic to support the `terrain` property.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State management and UI for field terrains.
- `src/utils/damage.ts`: Mapping logic for Smogon's `Field` object.
- `src/components/templates/DamageCalculatorTemplate.tsx`: UI layout for terrain selection.
