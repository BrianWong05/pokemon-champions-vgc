## Why

Certain Pokémon abilities (e.g., Pixilate, Refrigerate, Liquid Voice) modify the type of a move before damage calculation occurs. The current pipeline calculates STAB and effectiveness based on the move's original type, which results in incorrect damage for these abilities. Additionally, "-ate" abilities provide a 1.2x power boost that must be accounted for.

## What Changes

- Implement `getModifiedMoveType` to handle type conversion (e.g., Normal -> Fairy for Pixilate).
- Refactor the calculation pipeline to use the modified type for STAB, Base Power boosts, and Type Effectiveness.
- Update `getBasePowerModifier` to apply the 1.2x boost for "-ate" abilities.
- Update the results UI to indicate when a move's type has been modified by an ability.

## Capabilities

### New Capabilities
- `type-changing-ability-logic`: Logic for converting move types based on attacker abilities.

### Modified Capabilities
- `damage-calculation-logic`: Update pipeline sequence to handle modified types for STAB and effectiveness.
- `multi-move-damage-display`: Add visual indicator for modified move types in the results.

## Impact

- `src/utils/damage.ts`: New utility functions and updated modifier logic.
- `src/pages/DamageCalculator/index.tsx`: Pipeline integration and state passing.
- `src/components/organisms/ResultsPanel.tsx`: UI updates for type feedback.
