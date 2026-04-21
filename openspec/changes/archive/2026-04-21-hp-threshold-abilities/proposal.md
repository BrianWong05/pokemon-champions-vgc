## Why

Currently, the damage calculator does not account for abilities that trigger based on the Pokémon's current HP percentage (e.g., Multiscale, Blaze, Defeatist). Implementing these thresholds is essential for accurate competitive VGC simulations, especially when combined with the recently added HP percentage controls.

## What Changes

- Update `getBasePowerModifier`, `getStatModifier`, and `getFinalDamageModifier` signatures in `src/utils/damage.ts` to accept current HP percentages.
- Implement logic for defender-side thresholds (e.g., Multiscale/Shadow Shield at 100% HP).
- Implement logic for attacker-side boosts (e.g., Blaze/Torrent/Overgrow/Swarm at <= 33.33% HP).
- Implement logic for attacker-side penalties (e.g., Defeatist at <= 50% HP).
- Update the calculation pipeline in `DamageCalculator/index.tsx` to pass the required HP data.
- Add visual indicators in the Results section to signal when an HP-relative ability has triggered.

## Capabilities

### New Capabilities
- `hp-relative-abilities`: Logic for identifying and applying modifiers based on HP thresholds.

### Modified Capabilities
- `damage-calculation-logic`: Update utility signatures and pipeline to support HP-based inputs.
- `multi-move-damage-display`: Add visual feedback for triggered HP-relative abilities.

## Impact

- `src/utils/damage.ts`: Modifier function updates and new ability math.
- `src/pages/DamageCalculator/index.tsx`: Pipeline data flow update.
- `src/components/organisms/ResultsPanel.tsx`: Visual triggering indicator.
