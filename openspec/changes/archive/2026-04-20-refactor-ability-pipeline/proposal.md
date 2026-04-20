## Why

The current damage calculator uses a single, simplistic multiplier for abilities. Competitive VGC mechanics require abilities to intervene at specific stages: Base Power modification, Stat modification, and Final Damage modification. This refactor is necessary to ensure accuracy for staples like Huge Power, Fairy Aura, and Thick Fat.

## What Changes

- **BREAKING**: Replace the current `getAbilityModifier` with a three-stage pipeline: `getBasePowerModifier`, `getStatModifier`, and `getFinalDamageModifier`.
- Implement logic for 15+ core VGC abilities across these three stages.
- Update the calculation sequence in `DamageCalculator` to apply modifiers in the correct mechanical order (Power -> Stats -> Damage).
- Structure logic to be easily extensible for future ability additions.

## Capabilities

### New Capabilities
- `modular-ability-logic`: Multi-stage ability modifier pipeline (Power, Stats, Final).

### Modified Capabilities
- `damage-calculation-logic`: Integrate the new multi-stage pipeline into the core formula.

## Impact

- `src/utils/damage.ts`: Major refactor of modifier functions and calculation pipeline.
- `src/pages/DamageCalculator/index.tsx`: Update `computeResults` to use the new multi-stage logic.
