## Why

The item images are currently not displaying correctly in the team view and the Pokémon edit modal. This is likely due to an issue with path resolution or how the item image components are consuming the item data.

## What Changes

- Identify why the item images are failing to load in `TeamDetailPage` and `TeamMemberEditorModal`.
- Fix the component logic or image asset references to ensure correct display.

## Capabilities

### New Capabilities

### Modified Capabilities
- `team-management`: Fix image display requirements for saved teams.

## Impact

- **UI**: Team member cards and the edit modal will correctly render item images.
- **Assets**: Potentially updating `src/components/atoms/ItemImage.tsx` or how it's used.
