## Why

The `scripts/add_showdown_preset.mjs` script currently imports Pokémon presets without checking for existing entries, leading to duplicate entries in the database. This consumes unnecessary storage and makes managing preset data difficult.

## What Changes

- Implement a uniqueness check in `scripts/add_showdown_preset.mjs` before inserting a new preset.
- The check should ensure that a preset with the same Pokémon, nature, ability, item, and move set already exists.

## Capabilities

### New Capabilities
- `preset-deduplication`: Capability to prevent the insertion of identical Pokémon preset configurations.

### Modified Capabilities
- None.

## Impact

- `scripts/add_showdown_preset.mjs`: Script logic modified to query existing presets before insertion.
- `Database`: Fewer duplicate entries generated during import.
