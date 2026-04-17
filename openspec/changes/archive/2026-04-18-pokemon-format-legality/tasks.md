## 1. Schema Update

- [x] 1.1 Add `formats` table definition to `src/db/schema.ts`
- [x] 1.2 Add `format_pokemon` table definition to `src/db/schema.ts` with composite primary key and foreign keys
- [x] 1.3 Add relations for `formats` and `format_pokemon` in `src/db/schema.ts`
- [x] 1.4 Update `pokemonRelations` in `src/db/schema.ts` to include `format_pokemon`

## 2. Migration Generation

- [x] 2.1 Create a new SQL migration file in `drizzle/migrations/`
- [x] 2.2 Write `CREATE TABLE formats` SQL statement with constraints
- [x] 2.3 Write `CREATE TABLE format_pokemon` SQL statement with composite PK and foreign keys (ON DELETE CASCADE)

## 3. Verification

- [x] 3.1 Run `npm run test:db` (or equivalent) to verify schema changes don't break existing tests
- [x] 3.2 Manually verify the SQL migration syntax is compatible with SQLite
