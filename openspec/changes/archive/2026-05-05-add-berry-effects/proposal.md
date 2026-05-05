## Why

Currently, damage calculations do not accurately reflect the effects of type-resist berries (like Chople Berry, Shuca Berry) or damage-reducing berries (like Sitrus Berry or Figy Berry recovery impacts, though primarily we focus on damage modifiers here). These berries are extremely common in competitive VGC, and missing their effects leads to inaccurate damage and survival projections.

## What Changes

- Add support for type-resist berries (e.g., Chople Berry, Babiri Berry) to reduce super-effective damage calculations.
- Leverage the existing `@smogon/calc` item support which natively handles these berries if passed correctly.
- Add specific integration tests for berry damage reductions to ensure the calculator outputs the correct modified ranges.

## Capabilities

### New Capabilities
- `berry-mechanics`: Handling the calculation logic and damage modifiers for berries.

### Modified Capabilities
- `damage-calculation-logic`: Ensure that `@smogon/calc` processes the defender's berry correctly when evaluating incoming super-effective damage.

## Impact

- **Damage Engine Wrapper**: The underlying `@smogon/calc` engine requires accurate item mapping. As long as the item is passed correctly to the `Pokemon` object, `@smogon/calc` handles the math. We just need to verify our wrapper properly translates these item names.
- **Testing**: We will need tests specifically checking super-effective hits against targets holding the corresponding resist berry.