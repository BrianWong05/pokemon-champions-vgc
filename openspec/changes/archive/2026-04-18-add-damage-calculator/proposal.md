## Why

Competitive Pokémon players need to calculate potential damage outcomes to make strategic decisions during battle. Since Pokémon Champions uses a custom "SP" stat system instead of traditional EVs, existing online damage calculators are incompatible. Providing a native, interactive damage calculator that supports the custom stat formulas is essential for the competitive VGC community.

## What Changes

- Create a new interactive Damage Calculator page at `/calc`.
- Implement custom stat calculation logic for Pokémon Champions (Level 50 VGC).
- Implement the standard competitive damage formula with support for STAB and Type Effectiveness.
- Build a responsive 3-column UI (Attacker, Defender, Results) using Tailwind CSS.
- Provide a visual HP bar to represent damage ranges.

## Capabilities

### New Capabilities
- `damage-calculation-logic`: Mathematical implementation of the custom stat formulas and the VGC damage equation.
- `interactive-damage-calculator-ui`: A reactive UI for setting up attack/defense scenarios and viewing outcomes.

### Modified Capabilities
- None

## Impact

- `src/pages/DamageCalculator/`: New directory for the calculator page and its sub-components.
- `src/utils/damage.ts`: New utility file for calculation logic.
- `src/App.tsx`: Routing update to include the `/calc` path.
