## Why

Currently, damage modifiers for auras like Fairy Aura and Dark Aura are handled as individual Pokémon abilities. However, these auras are field-wide effects that provide a 1.33x boost to their respective move types for *any* Pokémon on the field, even those that do not possess the ability themselves (as long as the ability bearer is present). Separating these into a dedicated field-level state ensures accurate damage calculation for all field participants.

## What Changes

- **Field State Update**: Add `isFairyAura`, `isDarkAura`, and `isAuraBreak` to the global `CalcState`.
- **UI Integration**: Add toggles for these field auras in the `DamageCalculator` dashboard (likely near the Weather selection).
- **Logic Refactoring**:
    - Remove Aura logic from `getBasePowerModifier` in `src/utils/damage.ts`.
    - Update `mapToSmogonField` to incorporate these new field-wide flags.
    - Ensure the `@smogon/calc` `Field` constructor receives these values.

## Capabilities

### New Capabilities
- `field-auras`: Global field-wide damage modifiers for Dark and Fairy move types.

### Modified Capabilities
- `weather-mechanics`: Extend field state to include aura effects alongside weather.
- `smogon-calc-integration`: Update the Field mapping logic to support aura flags.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State management and UI for field auras.
- `src/utils/damage.ts`: Mapping logic for Smogon's `Field` object.
