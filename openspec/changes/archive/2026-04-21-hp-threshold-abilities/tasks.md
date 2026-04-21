## 1. Logic and Pipeline (src/utils/damage.ts)

- [x] 1.1 Update `getModifiedMoveType`, `getBasePowerModifier`, `getStatModifier`, and `getFinalDamageModifier` signatures.
- [x] 1.2 Implement Multiscale/Shadow Shield logic in `getFinalDamageModifier`.
- [x] 1.3 Implement Starter ability logic (Blaze, etc.) in `getBasePowerModifier`.
- [x] 1.4 Implement Defeatist logic in `getStatModifier`.
- [x] 1.5 Update `DamageResult` and `calculateDamage` to track and return `triggeredAbilities`.

## 2. Component Refactoring (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Pass `attacker.hpPercent` and `defender.hpPercent` to all modifier functions in `computeResults`.
- [x] 2.2 Aggregate triggered abilities from all pipeline stages into the final result.

## 3. UI Implementation (src/components/organisms/ResultsPanel.tsx)

- [x] 3.1 Update the results card to render badges for `triggeredAbilities` (e.g., "Multiscale Active!").

## 4. Verification

- [x] 4.1 Verify Multiscale applies 0.5x only at 100% HP.
- [x] 4.2 Verify Blaze applies 1.5x only at <= 33.33% HP.
- [x] 4.3 Verify Defeatist applies 0.5x penalty only at <= 50% HP.
- [x] 4.4 Verify UI badges appear correctly when abilities trigger.
