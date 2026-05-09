## Why

Users often want to copy just one specific Pokémon configuration from a team to share or use elsewhere, rather than exporting the entire team. Providing an individual export button on each Pokémon card improves flexibility.

## What Changes

- Add an "Export" button to each Pokémon member card in the `TeamDetailPage`.
- Trigger a "Copy to Clipboard" action for that specific Pokémon's Showdown string.
- Provide visual feedback (e.g., a "Copied!" toast or tooltip) when the individual export is successful.

## Capabilities

### New Capabilities
- `individual-showdown-export`: Allows users to export a single Pokémon's configuration in Showdown format directly from the team detail view.

### Modified Capabilities

## Impact

- `src/pages/TeamDetail/index.tsx`: UI update to include the export button in the member card.
- `src/utils/showdown-formatter.ts`: Already contains `formatShowdownSet`, which will be reused.
