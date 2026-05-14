## Context
The Damage Calculator's `PokemonConfigForm` allows users to configure stats, but lacks a quick clear/reset option for SP/EV points.

## Goals / Non-Goals

**Goals:**
- Add a "Reset Stats" button to the UI.
- Update the state to set all SP values to 0.

## Decisions

- **UI Placement:** The button should be placed in the `StatGrid` summary footer, next to the total SP display, for easy access.
- **State Management:** Add a `RESET_STATS` case to the `pokemonReducer` in `usePokemonEditor.ts`.

## Risks / Trade-offs

- [Risk] Accidental reset → Mitigation: Optional confirmation dialog or distinct styling to prevent accidental clicks.
