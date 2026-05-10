## Context
The user wants to export the currently selected Pokémon set from the Damage Calculator into the standard Showdown format. This requires mapping the current state (Pokemon, Moves, EVs, Nature, Ability, Item) back into text.

## Goals / Non-Goals

**Goals:**
- Provide a clear "Export" action in the UI.
- Ensure the exported text is valid Showdown-format.

**Non-Goals:**
- Handling complex multi-Pokémon teams; focus on single-set export first.

## Decisions

- **UI:** Integrate the export trigger in the `PokemonConfigForm` or `PokemonPanel`.
- **Logic:** Create a `formatShowdownExport` utility function.

## Risks / Trade-offs

- [Risk] Formatting edge cases (missing data/bad names) → Mitigation: Ensure utility handles partial/null values gracefully.
