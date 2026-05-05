## Why

The damage calculator currently does not support Pokémon hold items. Hold items (like Choice Band, Life Orb, Assault Vest, etc.) have a massive impact on damage calculations and are central to competitive Pokémon VGC. Without hold items, the calculator produces inaccurate damage ranges in real-world scenarios.

## What Changes

- Introduce a new Hold Item selection field in the calculator UI.
- Implement the logic to apply hold item modifiers to damage calculations (base damage, attacking stats, defending stats).
- Update the damage calculation engine to integrate item multipliers.
- Add support for common damage-modifying items (e.g., Choice Band, Choice Specs, Life Orb, Expert Belt, Type-enhancing items, Assault Vest, Eviolite).

## Capabilities

### New Capabilities
- `hold-item-mechanics`: Logic for how different hold items modify Pokémon stats, move damage, and damage calculation formulas.

### Modified Capabilities
- `damage-calculation-logic`: Requires updating the damage formula to include item modifiers.
- `interactive-damage-calculator-ui`: Requires adding the hold item selection to the UI.

## Impact

- **UI**: Add a new dropdown or input field for items in the Pokémon details pane.
- **Damage Math**: The utility functions handling stat and damage calculations will need to ingest an `item` property.
- **Data**: We might need a small set of supported items and their specific multipliers.