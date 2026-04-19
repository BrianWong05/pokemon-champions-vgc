## 1. Database Schema & Seeding

- [x] 1.1 Add `type_efficacy` table to `src/db/schema.ts`.
- [x] 1.2 Generate and apply migrations (`drizzle-kit generate/push`).
- [x] 1.3 Create a script to fetch `type_efficacy.csv` and populate the table.

## 2. Data & Logic

- [x] 2.1 Implement data fetching in `DamageCalculatorPage` to load the efficacy chart.
- [x] 2.2 Implement the `getEffectiveness` utility using the database data.

## 3. Page & Reducer Updates

- [x] 3.1 Update `DamageCalculatorPage` results logic to automatically compute effectiveness based on move type and defender types.
- [x] 3.2 Integrate the automated effectiveness into the damage formula.

## 4. UI Refactoring

- [x] 4.1 Refactor `DefenderPanel.tsx` to remove the manual effectiveness dropdown.
- [x] 4.2 Add a read-only effectiveness display (badge) in the `DefenderPanel` or `ResultsPanel`.

## 5. Verification

- [x] 5.1 Verify that switching the defender to a different Pokémon (e.g., Garchomp) correctly updates effectiveness for various move types.
- [x] 5.2 Ensure dual-type calculations (e.g., 4x or 0.25x) are accurate.
