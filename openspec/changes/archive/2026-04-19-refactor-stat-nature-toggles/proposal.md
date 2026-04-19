## Why

The current "Nature" implementation in the Damage Calculator applies a single multiplier to all stats globally, which is inaccurate. In Pokémon, a Nature boosts exactly one stat by 1.1x and hinders exactly one stat by 0.9x. We need to refactor this to support granular, per-stat Nature selection that adheres to game mechanics.

## What Changes

- **Nature Refactor**: Remove the global Nature dropdown for both Pokémon.
- **Inline Toggles**: Add `+` (1.1x) and `-` (0.9x) toggle buttons to each stat row (excluding HP) in the `StatGrid`.
- **Game Logic Enforcement**: Implement mutual exclusivity. Only one stat can be boosted and one can be hindered at a time. Selecting a new boost replaces the previous one.
- **Formula Update**: Update the stat calculation to apply the multiplier specific to the stat's Nature status.
- **UI Refinement**: Clear visual indicators for boosted (e.g., Red) and hindered (e.g., Blue) stats.

## Capabilities

### New Capabilities
- `granular-nature-selection`: Precise control over boosted and hindered stats following Pokémon game rules.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Replace the global nature dropdown with inline stat modifiers.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State and reducer refactor to track `boostedStat` and `hinderedStat`.
- `src/components/molecules/StatGrid.tsx`: Updated to include toggle UI and handle per-stat multipliers.
- `src/components/organisms/PokemonPanel.tsx`: Remove global nature dropdown.
- `src/utils/damage.ts`: Minor adjustment to ensure multiplier application remains performant.
