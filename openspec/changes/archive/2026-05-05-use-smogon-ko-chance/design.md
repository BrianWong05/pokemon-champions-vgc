## Context

The `ResultsPanel` component currently uses a rudimentary logic to determine survival ("GUARANTEED KO", "POSSIBLE KO", or "SURVIVAL") based solely on checking the max and min damage percentages against the remaining HP percentage of the target. However, `@smogon/calc` returns a highly accurate, pre-computed KO chance text string via its `result.kochance().text` API or the end of its `desc()` string. Relying on Smogon's KO string ensures accuracy with complex mechanics like hazard damage, weather, status, or recovery items.

## Goals / Non-Goals

**Goals:**
- Replace the custom, manual KO chance evaluation logic in `ResultsPanel`.
- Extract the KO chance string from the `@smogon/calc` Result object natively.
- Safely handle edge cases such as missing descriptions or immunity scenarios by falling back gracefully.
- Re-style the UI pill components in `MoveResultColumn` to display these strings using the correct conditional colors.

**Non-Goals:**
- Implement complex hazard/status toggle tracking in the UI (only utilizing what the calculator currently processes).
- Redesign the layout of `ResultsPanel`.

## Decisions

1. **Extracting KO Chance Text**:
   - `result.desc()` returns a long string detailing the calc parameters, terminating in ` -- <KO Chance>`.
   - `result.kochance().text` provides the isolated KO chance. We will use `result.kochance().text` primarily, with a fallback to string manipulation of `desc()` if necessary, but `result.kochance().text` is generally the standard API for this.
   - We will append this string to the `DamageResult` interface as `koChanceText`.

2. **UI Rendering**:
   - In `ResultsPanel.tsx`, the current logic:
     ```tsx
     const isGuaranteedKO = minDamage >= currentHpValue;
     const isPossibleKO = maxDamage >= currentHpValue && !isGuaranteedKO;
     ```
     Will be removed.
   - The UI pill text will directly use `impactResult.koChanceText` if available.
   - The pill color logic will be adjusted to rely on keywords within the string:
     - `includes('guaranteed') && includes('OHKO')` -> Red (Danger)
     - `includes('possible') || includes('OHKO')` -> Yellow (Warning)
     - Otherwise -> Green (Safe/Survival)

## Risks / Trade-offs

- **Risk**: `@smogon/calc` might change its text format in future versions.
  - *Mitigation*: We will perform loose substring matching (`includes()`) rather than exact equality matching to determine UI styling colors.
- **Risk**: Extracting `.text` fails for immune moves.
  - *Mitigation*: Ensure the assignment happens conditionally (`if (!isImmune)`) and defaults to `"Guaranteed Survival"` or similar.
