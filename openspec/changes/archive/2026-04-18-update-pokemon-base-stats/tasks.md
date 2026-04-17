## 1. Schema Updates

- [x] 1.1 Update `src/db/schema.ts` to rename/add base stat columns to the `pokemon` table.

## 2. Migrations

- [x] 2.1 Run `npx drizzle-kit generate` to create the migration file.
- [x] 2.2 Run `npx drizzle-kit push` to update the local SQLite database.

## 3. Seeding Script (Not Needed)

- [x] 3.1 Script for base data populating is handled by `scripts/extract_pokeapi_data.py`.
- [x] 3.2 Database verified with correct base stat values.
