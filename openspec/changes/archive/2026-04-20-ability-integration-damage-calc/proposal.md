## Why

Pokémon abilities can significantly impact damage calculations in VGC (e.g., Huge Power, Guts). The current calculator does not account for these modifiers, leading to inaccurate results for competitive players.

## What Changes

- Fetch and display legal abilities for selected Pokémon.
- Allow users to select an active ability for both Attacker and Defender.
- Implement a multiplier system to apply ability-based stat modifiers (e.g., Attack x2 for Huge Power).
- Integrate ability modifiers into the core damage formula.

## Capabilities

### New Capabilities
- `ability-damage-integration`: UI and logic for handling ability-based damage modifiers.

### Modified Capabilities
- `damage-calculation-logic`: Integrate ability modifiers into the standard stat and damage calculation pipeline.

## Impact

- `src/pages/DamageCalculator/index.tsx`: Component refactoring for state and UI.
- `src/utils/damage.ts`: Utility updates for ability-based multipliers.
- `src/db/schema.ts`: Ensure abilities and junction tables are used correctly.
- `src/components/organisms/PokemonPanel.tsx`: UI updates for ability selection.
