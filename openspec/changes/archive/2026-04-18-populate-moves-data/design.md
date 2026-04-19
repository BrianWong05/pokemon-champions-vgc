## Context

The current `moves` table schema lacks localized names and doesn't fully align with the data available from PokeAPI. We need a robust extraction script and a schema update to support competitive VGC move-sets and damage calculation.

## Goals / Non-Goals

**Goals:**
- Refactor the `moves` table schema for localization (En, Ja, Zh).
- Implement an automated extraction script `scripts/populate_moves.py`.
- Filter move methods to "level-up", "machine", and "tutor" for VGC optimization.
- Ensure the database is populated with accurate move stats (power, accuracy, pp).

**Non-Goals:**
- Scrambling existing Pokémon data (only updating moves/pokemon_moves).
- Implementing move logic (only data population).

## Decisions

- **Schema Update**:
    - Add `nameEn`, `nameJa`, `nameZh` to `moves`.
    - Change `type` to `typeId` (referencing `types.id`) for better normalization.
    - Ensure `category` aligns with PokeAPI `damage_class_id`.
- **Extraction Logic**:
    - Download CSVs from PokeAPI master branch.
    - Filter `move_names.csv` by language IDs: 9 (En), 1 (Ja), 4 (Zh-Hant).
    - Filter `pokemon_moves.csv` by `version_group_id` (likely the latest, e.g., 20+ for SV) and `pokemon_move_method_id` (1, 3, 4).
- **Tooling**: Use `pandas` for high-performance data joining and `sqlite3` for database persistence.

## Risks / Trade-offs

- **[Risk]** Large move-set data causing DB bloat → **[Mitigation]** Strictly filtering move methods (level-up, TM, tutor) significantly reduces the `pokemon_moves` row count.
- **[Risk]** Breaking existing queries → **[Mitigation]** This is a development-phase refactor; we will update any impacted utility functions.
