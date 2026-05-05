## Context

The UI currently displays an "INCOMING IMPACT RANGE" string representing the expected damage bounds (e.g. `(45% - 55%)`). However, users have reported that this range does not always match the damage range string (desc) generated directly by `@smogon/calc`. This discrepancy occurs because the UI calculates its own percentage range bounds instead of relying on the raw damage numbers array (`damage`) output by the Smogon engine.

## Goals / Non-Goals

**Goals:**
- Ensure the UI's damage range perfectly aligns with `@smogon/calc`'s output.
- Update the calculation utilities to pass the specific min/max bounds (or the entire damage array) from the Smogon result to the UI.
- Update the `ResultsPanel` to render these Smogon-provided bounds.

**Non-Goals:**
- We are not changing the visual layout or styling of the impact range component. We are simply updating the data source it relies on.

## Decisions

- **Data Source**: We will use `result.damage` (which is typically an array of 16 possible damage numbers) from the `@smogon/calc` `Result` object.
- **Conversion to Percentage**: We will convert the minimum (`damage[0]`) and maximum (`damage[damage.length - 1]`) damage numbers into percentages relative to the defender's maximum HP, matching the logic Smogon uses internally for its description string.
- **Data Plumbing**: The `calculateSmogonDamage` utility (or the mapping layer above it) will expose these calculated minimum and maximum percentages explicitly in the returned `DamageResult` object.

## Risks / Trade-offs

- [Risk] `@smogon/calc` sometimes returns a single number instead of an array if the damage is fixed (e.g., Dragon Rage, Sonic Boom).
  - *Mitigation*: Ensure the mapping logic gracefully handles `result.damage` being a number or an array.