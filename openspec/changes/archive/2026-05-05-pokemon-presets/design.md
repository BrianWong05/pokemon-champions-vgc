## Context

The Damage Calculator currently requires users to manually input all fields (Species, Nature, EVs, Item, Ability, Moves) to evaluate a scenario. In the VGC context, certain meta Pokemon have standard spreads and sets. Providing these as presets will reduce manual data entry and improve efficiency.

## Goals / Non-Goals

**Goals:**
- Provide a curated list of standard VGC Pokemon presets.
- Add a dropdown or selection UI component to choose a preset.
- Automatically populate the Damage Calculator form state when a preset is chosen.

**Non-Goals:**
- Allowing users to save their own custom presets (this can be a future feature, but for now we'll stick to hardcoded standard presets).
- Dynamic fetching of presets from an external API (we will use a local data structure for simplicity).

## Decisions

- **Data Storage**: Presets will be stored in a constant TypeScript file (`src/utils/pokemon-presets.ts`) exporting an array of preset objects. This avoids the complexity of database migrations or network requests for this initial feature.
- **Data Structure**: A `PokemonPreset` type will be defined, containing fields compatible with the existing `PokemonState` or smogon-calc's Pokemon constructor (species name, item, nature, evs, ivs, moves).
- **UI Integration**: A new `<select>` dropdown will be added near the top of the Pokemon input area (attacker/defender) to pick a preset. Selecting a preset will trigger a state update that overwrites the current Pokemon's details.

## Risks / Trade-offs

- **Risk**: Hardcoded presets may become outdated as the meta shifts.
  - **Mitigation**: Keep the preset list small and focused on very stable meta staples initially. Updating the constants file is trivial in the future.
- **Trade-off**: Overwriting state. If a user has partially filled out a set and then clicks a preset, their manual work is lost.
  - **Mitigation**: This is standard behavior for presets. We could add a confirmation prompt, but for a fast calculator, that might be annoying. We'll proceed with simple overwrite for speed.