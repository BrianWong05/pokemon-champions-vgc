## Context

The current `getAbilityModifier` is too limited. Pokémon mechanics require modifiers to be applied at specific calculation steps to remain accurate.

## Goals / Non-Goals

**Goals:**
- Implement `getBasePowerModifier`, `getStatModifier`, and `getFinalDamageModifier`.
- Support key abilities: Fairy Aura, Technician, Huge Power, Fur Coat, Thick Fat, Solid Rock, etc.
- Refactor the `DamageCalculator` pipeline to use these stages.

**Non-Goals:**
- Exhaustive implementation of all 200+ abilities (focus on common VGC staples).
- Handling weather/terrain effects (out of scope for this refactor).

## Decisions

### 1. Three-Stage Modifier Architecture
Instead of one function, we'll use three specialized functions in `src/utils/damage.ts`:
- `getBasePowerModifier(attackerAbility, moveType, basePower, etc.)`
- `getStatModifier(ability, statKey, role)`
- `getFinalDamageModifier(defenderAbility, attackerAbility, moveType, effectiveness)`

### 2. Integration into Formula
The pipeline in `DamageCalculator` will follow this flow:
1. `modifiedPower = floor(basePower * getBasePowerModifier)`
2. `attackerStat = floor(calculateStat(...) * getStatModifier)`
3. `baseDamage = floor(floor((22 * modifiedPower * attackerStat / defenderStat) / 50) + 2)`
4. `finalDamage = floor(baseDamage * stab * effectiveness * getFinalDamageModifier)`

### 3. Scalable Switch Statements
Each modifier function will use a `switch(ability.toLowerCase())` statement for performance and readability, making it easy to add more abilities later.

## Risks / Trade-offs

- **[Risk]** Complex ability interactions (e.g., Mold Breaker). → **Mitigation**: Focus on stat/damage modifiers first; advanced interactions will be handled in future changes.
- **[Trade-off]** Code duplication in switch cases. → **Mitigation**: Use fall-through cases for abilities with identical effects (e.g., Huge Power/Pure Power).
