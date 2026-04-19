## Context

In Pokémon, a Nature modifies stats by boosting one and hindering another. The current implementation uses a global multiplier which is incorrect. We need to move this logic to be per-stat and ensure it follows the standard 1.1x / 0.9x rules.

## Goals / Non-Goals

**Goals:**
- Replace global nature state with per-stat `boostedStat` and `hinderedStat` markers.
- Implement UI toggles (+ / -) for Atk, Def, SpA, SpD, and Spe.
- Ensure only one stat can be boosted and one hindered at any time.
- Correctly apply 1.1x and 0.9x multipliers in the `StatGrid`.

**Non-Goals:**
- Applying Nature to HP (against game mechanics).
- Supporting custom multiplier values (hardcoded 1.1 and 0.9).

## Decisions

- **State Model**: Update `SideState` to include `boostedStat: string | null` and `hinderedStat: string | null`.
- **Toggle Logic**:
    - Clicking `+` on a stat: Sets it as `boostedStat`. If it was `hinderedStat`, clears `hinderedStat`.
    - Clicking `-` on a stat: Sets it as `hinderedStat`. If it was `boostedStat`, clears `boostedStat`.
    - Clicking an active toggle again: Sets the respective marker to `null`.
- **Stat Calculation**: The `StatRow` will determine its own multiplier based on whether its key matches `boostedStat` or `hinderedStat`.
- **UI Design**: Use small, square buttons next to the SP input. Active `+` will have a subtle red background; active `-` will have a subtle blue background.

## Risks / Trade-offs

- **[Risk]** Confusing UI if icons are too small → **[Mitigation]** Use clear color coding and hover tooltips if necessary.
- **[Risk]** State synchronization between panels → **[Mitigation]** The main reducer in `DamageCalculatorPage` will handle the logic to keep both side's states clean.
