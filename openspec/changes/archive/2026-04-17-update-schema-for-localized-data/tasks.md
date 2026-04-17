## 1. Schema Update

- [x] 1.1 Add `name_en`, `name_ja`, `name_zh` to the `pokemon` table in `src/db/schema.ts`
- [x] 1.2 Add the `types` table to `src/db/schema.ts`
- [x] 1.3 Add the `pokemon_forms` table to `src/db/schema.ts`
- [x] 1.4 Configure any new relationships for the added tables

## 2. Migration Generation

- [x] 2.1 Run `drizzle-kit generate` to create the migration SQL for the schema changes
- [x] 2.2 Verify the generated SQL migration includes all table and column additions
- [x] 2.3 Ensure the migration reflects the state produced by the Python script

## 3. Verification

- [x] 3.1 Run `drizzle-kit push` or verify the current database structure matches the updated Drizzle schema
- [x] 3.2 Perform a test query using Drizzle ORM to access localized Pokémon names
- [x] 3.3 Verify that `pokemon_forms` and `types` data is accessible via Drizzle
