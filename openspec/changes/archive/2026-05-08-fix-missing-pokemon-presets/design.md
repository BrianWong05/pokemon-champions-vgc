## Context

Currently, the interactive damage calculator allows manual configuration of a Pokémon's stats, nature, item, and moves. Players frequently test against standard VGC sets, which makes manual entry tedious and error-prone. We need a way to quickly load predefined or popular VGC sets (presets) directly from the calculator UI.

## Goals / Non-Goals

**Goals:**
- Provide a UI mechanism to browse and select available presets for a specific Pokémon.
- Automatically populate the calculator's state (EVs, IVs, Nature, Hold Item, Ability, Moves) when a preset is selected.
- Provide clear feedback on which preset is currently loaded.

**Non-Goals:**
- Allowing users to create, save, or manage their own custom presets (out of scope for this change).
- Sourcing the preset data dynamically from a live external API (we assume preset data is available in the current data structure).

## Decisions

1. **Preset Selection UI:**
   - We will integrate a preset selection button (e.g., a "Sets" or "?" button) next to the `PokemonSearchSelect` component or within the Pokémon configuration panel.
   - **Rationale:** This places the preset selection immediately contextual to the selected Pokémon.
   - **Alternatives:** A separate panel for presets was considered but rejected because it would clutter the UI and break the flow of configuring a specific Pokémon.

2. **Presentation of Presets:**
   - Clicking the preset button will display a dropdown menu or a modal dialog listing the available presets for the currently selected Pokémon.
   - **Rationale:** A dropdown or modal keeps the main interface clean while providing enough space to show the preset names (e.g., "Standard Support", "Choice Specs Attacker").

3. **Applying Presets:**
   - Selecting a preset will dispatch an action to update all relevant fields in the calculator state at once.
   - **Rationale:** Ensures that the calculator correctly reflects the complete set of stats and moves without intermediate inconsistent states.

## Risks / Trade-offs

- **[Risk]** The selected Pokémon might not have any predefined presets available.
  - **Mitigation:** The preset button should be disabled, hidden, or show a clear "No presets available" message if the preset data list for that Pokémon is empty.
- **[Risk]** Overwriting user input.
  - **Mitigation:** Applying a preset explicitly overwrites the current configuration. This is expected behavior, but we should ensure the UI clearly indicates that a new preset has been loaded.
