## Why

Entering Pokémon data (EVs, IVs, Moves, Items, Natures) manually into the damage calculator is time-consuming and prone to error. Pokémon Showdown is the industry standard for teambuilding, and allowing users to paste sets in the Showdown export format will significantly improve the user experience and speed of calculation.

## What Changes

- Add a new "Import Showdown" button to the Attacker and Defender panels in the damage calculator.
- Implement a parser that translates Showdown export text (e.g., "Amoonguss @ Sitrus Berry...") into the internal application state.
- Update the UI to handle the population of multiple fields (Species, Item, Ability, Nature, EVs, IVs, Moves) simultaneously from a single import action.

## Capabilities

### New Capabilities
- `showdown-import`: Logic and parsing requirements for converting Pokémon Showdown export strings into valid application data structures.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Add the user interface elements (buttons, modals/textareas) required to trigger and process the Showdown import.

## Impact

- **UI**: New components for the import interface.
- **State Management**: New actions to batch update Pokémon state.
- **Utility**: New parsing logic for the Showdown format.
