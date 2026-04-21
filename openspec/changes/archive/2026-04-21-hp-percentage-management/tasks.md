## 1. Logic and Pipeline (src/utils/damage.ts)

- [x] 1.1 Update `getBasePowerModifier` signature to include `attackerHpPercent`.
- [x] 1.2 Update `calculateDamage` or `DamageResult` to prep for HP-based logic. (No specific logic needed in calculateDamage yet, but signature is ready).

## 2. State Management (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Update `SideState` to include `hpPercent: number` (default 100).
- [x] 2.2 Add `SET_HP_PERCENT` action to `calcReducer`.
- [x] 2.3 Pass `attackerHpPercent` through the `computeResults` pipeline to the modifier functions.

## 3. UI Implementation - Setup (src/components/organisms/PokemonPanel.tsx)

- [x] 3.1 Update `PokemonPanelProps` to include `hpPercent` and `onHpPercentChange`.
- [x] 3.2 Add the Current HP % slider and numeric input UI below the HP stat row.
- [x] 3.3 Implement the dynamic "XX / YY HP" raw value display.

## 4. UI Implementation - Results (src/components/organisms/ResultsPanel.tsx)

- [x] 4.1 Update `ResultsPanelProps` to include `p1HpPercent` and `p2HpPercent`.
- [x] 4.2 Update KO evaluation logic to use calculated Current HP instead of Max HP.
- [x] 4.3 Refactor the visual HP bar to start at the current HP percentage and subtract damage from that point.

## 5. Verification

- [x] 5.1 Verify that adjusting the Defender's HP % correctly updates KO probability (e.g., from Survival to Guaranteed KO).
- [x] 5.2 Verify that visual HP bar start points are accurate.
