## 1. Type Definitions

- [x] 1.1 Update `DamageResult` interface in `src/pages/DamageCalculator/index.tsx` to include an optional `koChanceText` string.

## 2. Core Calculation Logic

- [x] 2.1 Update `computeResults` in `src/pages/DamageCalculator/index.tsx` to extract the `kochance().text` string from the `@smogon/calc` result object.
- [x] 2.2 Handle fallback/immunity cases: if `isImmune` is true, set `koChanceText` to something like "Survival" or "--".

## 3. UI Component Updates

- [x] 3.1 Refactor `ResultsPanel` to pass `impactResult.koChanceText` into the pill displays.
- [x] 3.2 Update `ResultsPanel` to rely on keyword matching from `koChanceText` (e.g., 'guaranteed', 'possible', 'OHKO') to determine the color of the pill (Green, Yellow, Red) instead of the previous `isGuaranteedKO` / `isPossibleKO` logic.
- [x] 3.3 Apply the same logic to the `MoveResultColumn` component's pill colors.
