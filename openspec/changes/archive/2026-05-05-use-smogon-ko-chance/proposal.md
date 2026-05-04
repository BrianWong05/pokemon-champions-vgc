## Why

Currently, the Damage Calculator UI uses a custom logic to display KO chances ("GUARANTEED KO", "POSSIBLE KO", or "SURVIVAL") based on our own `currentHpValue` calculations in `ResultsPanel`. However, `@smogon/calc` natively computes sophisticated KO chances incorporating damage rolls, recovery items, hazard damage, etc. To ensure accurate KO calculations matching Pokémon Showdown, we need to extract and display the KO chance text directly from the `@smogon/calc` result's `kochance()` or `desc()` method.

## What Changes

- Update `DamageResult` interface to include `koChanceText: string`.
- Modify `computeResults` in `DamageCalculator/index.tsx` to extract KO chance from `result.kochance().text`.
- Update `ResultsPanel.tsx` to render the extracted Smogon KO chance text instead of manually computing it.
- Update `MoveResultColumn` pill styles to map the new text strings to the appropriate colors (e.g., green, yellow, red).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `damage-calculation`: Update the UI requirement to use the native KO chance string provided by `@smogon/calc` instead of custom survival calculations.

## Impact

- `src/pages/DamageCalculator/index.tsx` (Damage calculation logic)
- `src/components/organisms/ResultsPanel.tsx` (Results UI)
