## Why

To support move selection and damage calculation in the VGC app, we need to populate the `moves` and `pokemon_moves` tables with data from PokeAPI. The current database has these tables defined but they are empty. A dedicated extraction script will ensure we have localized names, base stats, and valid move-sets for all Pokémon.

## What Changes

- Create a new Python script `scripts/populate_moves.py` to handle the moves data extraction and insertion.
- **BREAKING**: Refactor the `moves` table schema in `src/db/schema.ts` to include localized names (`nameEn`, `nameJa`, `nameZh`) and align with PokeAPI data fields.
- Download and join `moves.csv`, `move_names.csv`, and `pokemon_moves.csv` from PokeAPI.
- Implement localized name extraction (English, Japanese, Traditional Chinese) for moves.
- Filter Pokémon move-sets to include only "level-up", "machine", and "tutor" methods to optimize database size.
- Use `INSERT OR REPLACE` and `INSERT OR IGNORE` to safely populate the database.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `pokeapi-csv-extraction`: Extend the CSV extraction logic to support moves, localized move names, and filtered move-sets.
- `vgc-data-schema`: Define the requirements for populating the `moves` and `pokemon_moves` tables.

## Impact

- `scripts/populate_moves.py`: New script for move data management.
- `vgc_pokemon.db`: `moves` and `pokemon_moves` tables will be populated.
- App Functionality: Enables move selection in the Damage Calculator and other future features.
