## Why

Competitive Pokémon battles frequently involve stat modifications (e.g., Intimidate lowering Attack, Swords Dance raising it). The current Damage Calculator only accounts for base stats, SP, and Nature. Implementing "Stat Stages" (-6 to +6) is essential for accurate VGC damage simulations, allowing users to factor in common buffs and debuffs.

## What Changes

- **Stat Stage State**: Add state to track Attack, Defense, Sp. Atk, Sp. Def, and Speed stages for both Pokémon.
- **Stage Multiplier Logic**: Implement standard Pokémon stage multipliers (e.g., +2 is 2x, -1 is 2/3x).
- **Formula Integration**: Apply stage multipliers to stats after the Nature calculation but before damage rolls.
- **Inline Stage Controllers**: Add compact increment/decrement UI controls to each stat row in the `StatGrid`.
- **Visual Feedback**: Color-coded stage indicators (Green for positive, Red for negative).

## Capabilities

### New Capabilities
- `stat-stage-mechanics`: Logic for tracking and applying fractional multipliers based on Pokémon stat stages (-6 to +6).

### Modified Capabilities
- `interactive-damage-calculator-ui`: Integrate stage controllers into the granular stat grid.

## Impact

- `src/pages/DamageCalculator/index.tsx`: State and reducer updated to manage stages.
- `src/components/molecules/StatGrid.tsx`: Refactored to pass stage state and handlers.
- `src/components/molecules/StatRow.tsx` (within StatGrid): Added stage controller UI.
- `src/utils/damage.ts`: Added `getStageMultiplier` utility.
