## 1. Schema Refactor

- [x] 1.1 Update `moves` table definition in `src/db/schema.ts` to include `nameEn`, `nameJa`, `nameZh`, and use normalized IDs.
- [x] 1.2 Run `npx drizzle-kit generate` to create the migration.
- [x] 1.3 Run `npx drizzle-kit push --force` to apply the changes to the SQLite database.

## 2. Extraction Script

- [x] 2.1 Create `scripts/populate_moves.py` and implement PokeAPI CSV fetching logic.
- [x] 2.2 Implement localized name merging (En, Ja, Zh) using pandas.
- [x] 2.3 Implement move-set filtering (level-up, machine, tutor).
- [x] 2.4 Add database insertion logic using `INSERT OR REPLACE` and `INSERT OR IGNORE`.

## 3. Verification

- [x] 3.1 Execute the script and verify console output for success counts.
- [x] 3.2 Verify the `moves` table contains localized data for common moves (e.g., 'Tackle').
- [x] 3.3 Verify `pokemon_moves` contains accurate move associations for legal Pokémon.
