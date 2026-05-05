## 1. Update Damage Calculation Utilities

- [x] 1.1 In `src/utils/damage.ts` (or equivalent file), update the `calculateSmogonDamage` function to extract the min and max damage rolls from the `result.damage` property.
- [x] 1.2 Convert these raw damage numbers into percentages of the defender's maximum HP.
- [x] 1.3 Ensure the `DamageResult` interface and returned object include the raw damage array or the specific `minPercent` and `maxPercent` properties derived directly from the Smogon rolls.

## 2. Update UI Components

- [x] 2.1 Locate the component displaying the "INCOMING IMPACT RANGE" (likely `ResultsPanel` or a similar component in `src/components/organisms/`).
- [x] 2.2 Modify the component to use the newly provided `minPercent` and `maxPercent` from the `DamageResult` object instead of its own independent calculation.

## 3. Verification

- [x] 3.1 Verify that the displayed "INCOMING IMPACT RANGE" bounds match the minimum and maximum percentages shown in the `@smogon/calc` descriptive string perfectly.