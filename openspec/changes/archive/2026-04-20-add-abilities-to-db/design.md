## Context

We need to add ability information to the existing Pokémon database. This involves a schema update to support the new data and a Python-based seeding script to populate it from external CSV files.

## Goals / Non-Goals

**Goals:**
- Implement Drizzle schema for `abilities` and `pokemon_abilities`.
- Create a Python script using pandas to fetch and merge PokeAPI data.
- Seed the SQLite database with ability names in English, Japanese, and Traditional Chinese.

**Non-Goals:**
- Add ability descriptions (focusing on names only for now).
- Add other battle-related data (e.g., items, natures) in this change.

## Decisions

### 1. Schema Structure
- `abilities` table stores the core ability data.
- `pokemon_abilities` junction table connects Pokémon and abilities, including `is_hidden` and `slot` attributes.
- Using `name_en`, `name_ja`, `name_zh` for multilingual support.

### 2. Python Script Logic
- Use `pandas` for efficient merging of `abilities.csv`, `ability_names.csv`, and `pokemon_abilities.csv`.
- Merge using `ability_id` and filter `local_language_id` (4=zh, 9=en, 11=ja).
- Use `sqlite3` and `INSERT OR REPLACE` to ensure idempotency.
- Join with the existing `pokemon` table in `vgc_pokemon.db` to only seed abilities for tracked Pokémon.

### 3. Language Selection
- Language IDs: English=9, Japanese=11, Traditional Chinese=4 (standard for VGC).

## Risks / Trade-offs

- **[Risk]** Large CSV data download. → **Mitigation**: Download only required CSVs from PokeAPI repository.
- **[Risk]** Duplicate entries. → **Mitigation**: Use primary key constraints and `INSERT OR REPLACE`.
- **[Risk]** Traditional Chinese (4) might be missing for newer abilities. → **Mitigation**: Handle missing data gracefully, fallback to English if necessary.

## Migration Plan

1. Update `src/db/schema.ts`.
2. Generate and run Drizzle migration.
3. Run `scripts/populate_abilities.py` to seed data.
