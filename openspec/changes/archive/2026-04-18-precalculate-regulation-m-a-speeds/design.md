## Context

The Speed Tier component currently calculates benchmark values dynamically. By storing these values in a dedicated `calculated_speeds` table, we can simplify queries and ensure all parts of the application use the same computed values. This is especially useful for the Regulation M-A format.

## Goals / Non-Goals

**Goals:**
- Design the `calculated_speeds` table schema.
- Implement a script to calculate and store benchmarks for Regulation M-A Pokémon.
- Ensure the seeding script is idempotent (safe to run multiple times).

**Non-Goals:**
- Updating the frontend to use the new table (this will be a separate change).
- Calculating speeds for Pokémon not in Regulation M-A (can be added later if needed).

## Decisions

- **Table Structure**: `calculated_speeds` will have columns for `pokemonId` (foreign key), `maxPlus`, `maxNeutral`, `uninvested`, and `minMinus`.
- **Seeding Script**: `scripts/seed-calculated-speeds.ts` will use `better-sqlite3` and `drizzle-orm`. It will join `pokemon`, `format_pokemon`, and `formats` to find relevant Pokémon.
- **Idempotency**: The seeding script will use Drizzle's `onConflictDoUpdate()` to handle existing records.
- **Formulas**:
  - `maxPlus`: `Math.floor((baseSpeed + 52) * 1.1)`
  - `maxNeutral`: `baseSpeed + 52`
  - `uninvested`: `baseSpeed + 20`
  - `minMinus`: `Math.floor((baseSpeed + 20) * 0.9)`

## Risks / Trade-offs

- **[Risk]** Data desync if `baseSpeed` changes in the `pokemon` table → **[Mitigation]** Re-run the seeding script whenever `baseSpeed` is updated.
- **[Risk]** Complexity of migrations → **[Mitigation]** Use `drizzle-kit` for standard migration generation.
