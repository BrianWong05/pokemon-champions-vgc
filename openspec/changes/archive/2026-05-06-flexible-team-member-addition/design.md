## Context

The Team Management feature was recently implemented but is currently limited to adding Pokémon from pre-calculated presets. Users want the same depth of configuration as the Damage Calculator (stats, moves, items, abilities) when building their teams.

## Goals / Non-Goals

**Goals:**
- Enable detailed Pokémon configuration within the Team Builder.
- Reuse existing logic and components from the Damage Calculator to ensure consistency.
- Support both starting from a base Pokémon and modifying existing team members.

**Non-Goals:**
- Changing the underlying team storage schema (the existing JSON `configuration` field in `team_members` is flexible enough).
- Implementing full team validation (e.g., duplicate items) in this phase.

## Decisions

- **Shared Configuration State**: Extract the state logic and reducers from `DamageCalculatorPage` into a reusable hook or utility if possible, or create a specialized `usePokemonEditor` hook.
- **UI Architecture**:
    - Use a Modal in `TeamDetailPage` for "detailed editing".
    - The Modal will contain a version of `PokemonPanel` (from the Damage Calculator) tailored for team building (excluding damage-calc specific fields like stat stages or side effects like Reflect).
- **Entry Points**: 
    - Replace the "Add from Preset" select with a "Add Pokémon" flow that starts with a search.
    - Add an "Edit" button to each team member card that opens the detailed editor.

## Risks / Trade-offs

- **[Risk] Component Bloat** → `PokemonPanel` is large. Refactoring it to be more modular will be necessary to reuse it effectively without bringing along damage-calc baggage.
- **[Risk] Data Sync** → Ensuring that changes made in the editor are correctly mapped back to the `PokemonPreset` interface used by the team storage.
