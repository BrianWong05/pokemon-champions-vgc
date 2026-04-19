## Context

The Damage Calculator currently requires users to manually select the type effectiveness multiplier. We have the necessary data (move type and defender types) to automate this.

## Goals / Non-Goals

**Goals:**
- Automate type effectiveness calculation.
- Display the result clearly in the UI.
- Support dual-type Pokémon.

**Non-Goals:**
- Handling "type-immunity" abilities (like Levitate or Water Absorb) in this phase.
- Handling items that change effectiveness (like Air Balloon).

## Decisions

- **Database Table**: A new `type_efficacy` table will be added with columns: `damageTypeId`, `targetTypeId`, and `damageFactor` (integer, e.g., 50, 100, 200).
- **Seeding**: We will create a Python or Node script to fetch the PokeAPI CSV and populate this table.
- **Data Fetching**: The `DamageCalculatorPage` will fetch the entire efficacy table on mount and store it in a lookup map for instant calculations.
- **Total Multiplier**: The total effectiveness will be calculated as `(factor1 / 100) * (factor2 / 100)`.

## Risks / Trade-offs

- **[Risk]** Type chart complexity → **[Mitigation]** The Pokémon type chart is a static 18x18 matrix. We will implement it as a Record of Records for O(1) lookups.
- **[Risk]** Missing type data for defenders → **[Mitigation]** The `SELECT_POKEMON` action for the defender already stores `type1` and `type2`. We will ensure these are always present.
