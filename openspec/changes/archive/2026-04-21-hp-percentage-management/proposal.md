## Why

Competitive Pokémon battles (VGC) often involve Pokémon that are not at full health. Simulating damage at non-100% HP is critical for accurate KO predictions and for moves or abilities that depend on current HP (e.g., Eruption, Blaze). Currently, the calculator assumes full health for all KO calculations.

## What Changes

- Add `attackerHpPercent` and `defenderHpPercent` state variables.
- Add UI controls (slider + numeric input) to the Pokémon setup panels to adjust current HP %.
- Display real-time raw HP values (e.g., "75 / 150 HP") based on the percentage and calculated Max HP.
- Update the KO logic in the results section to use current HP instead of Max HP.
- Adjust the visual HP bar in the dashboard to reflect current HP as the starting point.
- Pass HP percentage into the Base Power modifier utility to prep for HP-dependent moves.

## Capabilities

### New Capabilities
- `hp-management`: Logic and UI for managing current Pokémon HP percentages.

### Modified Capabilities
- `damage-calculation-logic`: Update KO evaluation logic to use current HP.
- `multi-move-damage-display`: Update visual HP bar and KO probability messages.

## Impact

- `src/pages/DamageCalculator/index.tsx`: Component state and reducer updates.
- `src/components/organisms/PokemonPanel.tsx`: New UI controls for HP percentage.
- `src/components/organisms/ResultsPanel.tsx`: Updated KO logic and HP bar visualization.
- `src/utils/damage.ts`: Pass HP state to modifier functions.
