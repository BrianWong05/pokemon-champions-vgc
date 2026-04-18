## Context

The `EvSpConverterPage` manages a set of 6 stat values. Currently, each stat can be adjusted independently up to 252, but there is no check to ensure the total sum stays within the 510 limit.

## Goals / Non-Goals

**Goals:**
- Enforce a 510 EV cap across all stats.
- Provide a smooth user experience when the cap is reached (capping the increment).

**Non-Goals:**
- Allowing the user to intentionally exceed 510.

## Decisions

- **Capping Logic**: The `handleSpreadChange` function (or equivalent) in `EvSpConverterPage` will be updated. When a stat is changed:
    1. Calculate the current sum of all OTHER stats.
    2. Determine the maximum allowed value for the CURRENT stat (`510 - sumOfOthers`).
    3. Cap the new value to the minimum of `(requestedValue, 252, maxAllowed)`.
- **Stat Rows**: The `StatConverterRow` and its child atoms (`StatInput`, `StatSlider`) already receive an `onChange` handler. No changes should be needed to the atoms themselves if the parent handles the capping.

## Risks / Trade-offs

- **[Risk]** User confusion when input "stops" moving → **[Mitigation]** The progress bar already shows the total; the capping logic should feel natural as it matches the physical limit of the system.
