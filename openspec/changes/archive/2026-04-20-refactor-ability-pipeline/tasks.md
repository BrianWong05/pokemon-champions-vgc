## 1. Logic Implementation (src/utils/damage.ts)

- [x] 1.1 Implement `getBasePowerModifier` with support for Fairy Aura, Dark Aura, Tough Claws, Technician, and Strong Jaw.
- [x] 1.2 Implement `getStatModifier` with support for Huge Power, Pure Power, Fur Coat, and Guts.
- [x] 1.3 Implement `getFinalDamageModifier` with support for Thick Fat, Solid Rock, Filter, Prism Armor, Fluffy, and Water Bubble.
- [x] 1.4 Refactor `calculateDamage` to accept the new modifier pipeline.

## 2. Component Refactoring (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Update `computeResults` to follow the multi-stage formula pipeline.
- [x] 2.2 Ensure selected abilities for both P1 and P2 are correctly passed to the three modifier functions.

## 3. Verification

- [x] 3.1 Verify Technician correctly boosts low-power moves.
- [x] 3.2 Verify Huge Power correctly doubles the calculated Attack stat.
- [x] 3.3 Verify Thick Fat correctly halves damage from Fire and Ice moves.
- [x] 3.4 Verify that ability changes in the UI trigger real-time recalculations.
