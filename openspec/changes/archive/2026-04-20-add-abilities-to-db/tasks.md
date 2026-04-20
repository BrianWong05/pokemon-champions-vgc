## 1. Schema Update

- [x] 1.1 Update `src/db/schema.ts` to include `abilities` and `pokemon_abilities` tables.
- [x] 1.2 Generate and run Drizzle migration to update the SQLite database.

## 2. Seeding Script Development

- [x] 2.1 Create `scripts/populate_abilities.py` using `pandas` for data extraction and merging.
- [x] 2.2 Implement SQLite insertion logic using `INSERT OR REPLACE` for `abilities` and `INSERT OR IGNORE` for the junction table.
- [x] 2.3 Add logic to filter Pokémon from the `vgc_pokemon.db` to only seed relevant abilities.

## 3. Data Seeding and Verification

- [x] 3.1 Run `scripts/populate_abilities.py` to seed the database.
- [x] 3.2 Verify the data by querying the `abilities` and `pokemon_abilities` tables.
- [x] 3.3 Ensure multilingual names (En, Ja, Zh) are correctly populated.

