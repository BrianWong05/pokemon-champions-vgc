## 1. Schema Update

- [x] 1.1 Add `calculated_speeds` table to `src/db/schema.ts`.
- [x] 1.2 Run `npx drizzle-kit generate` to create the migration.
- [x] 1.3 Run `npx drizzle-kit push --force` to apply the migration.

## 2. Seeding Script

- [x] 2.1 Create `scripts/seed-calculated-speeds.ts` to calculate and store benchmarks for Regulation M-A Pokémon.
- [x] 2.2 Implement Drizzle's `onConflictDoUpdate()` in the seeding script.
- [x] 2.3 Run the seeding script and verify progress logs.

## 3. Verification

- [x] 3.1 Verify the data exists in the `calculated_speeds` table using `sqlite3`.
