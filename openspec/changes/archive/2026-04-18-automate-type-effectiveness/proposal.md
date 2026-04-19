## Why

Currently, the type effectiveness multiplier in the Damage Calculator must be manually selected by the user. This is prone to error and inconsistent with modern competitive tools. By automating this calculation based on the move's type and the defender's Pokémon types, we can provide instant, accurate results and improve the overall user experience.

## What Changes

- Create a `type_efficacy` table in the database to store multipliers between Pokémon types.
- Implement a seeding script to fetch data from `type_efficacy.csv` and populate the new table.
- Implement logic in the Damage Calculator to retrieve this data and automatically calculate the effectiveness multiplier (e.g., 0.25x, 0.5x, 1x, 2x, 4x) for a move against a defender.
- Refactor the `DefenderPanel` to display the calculated effectiveness as a read-only badge.

## Capabilities

### New Capabilities
- `automated-type-effectiveness`: Logic to determine damage multipliers based on Pokémon type interactions.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Replace manual effectiveness selection with an automated display.

## Impact

- `src/utils/type-effectiveness.ts`: New utility for type math.
- `src/pages/DamageCalculator/index.tsx`: State logic updated to compute effectiveness.
- `src/components/organisms/DefenderPanel.tsx`: UI updated to show calculated results.
