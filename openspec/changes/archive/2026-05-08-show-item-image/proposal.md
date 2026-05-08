## Why

Currently, team cards on the "My Teams" page display the held item of each Pokémon as a truncated text string next to the Pokémon's icon. This is less visually appealing and harder to recognize quickly than using the actual item sprites. Using item images will provide a more intuitive and professional-looking overview of a team's composition.

## What Changes

- Replace the text-based item name display in the team cards on the "My Teams" page (`src/pages/Teams/index.tsx`) with the `ItemImage` component.
- Ensure the `ItemImage` is properly sized and aligned next to the Pokémon image within the member slot.
- Add a tooltip to the `ItemImage` to show the item name on hover, maintaining accessibility and clarity.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `team-management`: Update the team card rendering requirements to specify using item images instead of truncated text names.

## Impact

- `src/pages/Teams/index.tsx`: UI update to use `ItemImage`.
- Visual consistency across the application by using item sprites in team overviews.
