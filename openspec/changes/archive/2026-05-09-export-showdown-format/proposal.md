## Why

Exporting the entire team in Showdown format is essential for sharing teams in competitive communities (e.g., Smogon/VGC forums). Currently, there is no way to export the team.

## What Changes

- Add a button to export the team in Pokemon Showdown format.
- Implement the logic to convert team data into the Showdown export text format.

## Capabilities

### New Capabilities
- `showdown-export`: Provides the ability to copy the team configuration to the clipboard in a valid Pokemon Showdown export format.

### Modified Capabilities

## Impact

- `src/components/TeamBuilder/` (UI): Add export button.
- `src/utils/showdown-formatter.ts`: New utility to handle the conversion.
