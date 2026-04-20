## Context

The VGC format is primarily Double Battles, where spread moves (hitting both opponents) are extremely common. The damage formula for these moves includes a 0.75x multiplier if more than one target is present. Our current calculator only simulates single-target interactions.

## Goals / Non-Goals

**Goals:**
- Provide a UI toggle for "Spread Target" mode.
- Apply a 0.75x multiplier to damage when the toggle is active.
- Ensure the multiplier is applied at the correct stage of the formula.

**Non-Goals:**
- Automating the toggle based on move target data (keeping it manual for now to allow for "one partner fainted" scenarios).
- Handling "Helping Hand" or other double-battle specific boosts in this change.

## Decisions

### 1. State and UI Location
We will add `isSpreadTarget` to the `CalcState` in `DamageCalculator/index.tsx`. The UI toggle will be placed in the `DamageCalculatorTemplate` within the "Field Weather" section, which we'll rename or group as "Field Conditions".

### 2. Utility Function
A new function `getSpreadModifier(isSpreadTarget: boolean): number` will be added to `src/utils/damage.ts`.
- `true` -> `0.75`
- `false` -> `1.0`

### 3. Pipeline Integration
In `computeResults`, the multiplier will be applied as follows:
`Damage = Math.floor(BaseDamage * getSpreadModifier(isSpreadTarget))`
This occurs after the base damage is calculated from attacker/defender stats and move power.

## Risks / Trade-offs

- **[Risk]** Users might forget to toggle the switch. -> **Mitigation**: Clear labeling and high-contrast toggle state in the UI.
- **[Trade-off]** Manual vs Auto-detection. -> **Decision**: Manual toggle is preferred in VGC because if one opponent faints, the move deals 100% damage to the remaining target.
