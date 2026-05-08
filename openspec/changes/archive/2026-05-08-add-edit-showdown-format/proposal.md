## Why

Users want the flexibility to not only import new teams but to edit individual Pokémon using the Showdown format in the existing team member editor. This provides a faster, more familiar workflow for experienced users managing their teams.

## What Changes

- Add an "Import/Edit Showdown" button to the Team Member Editor Modal.
- Enhance the Showdown Import logic to populate the editor state for existing team members, not just for new team slots.
- Ensure the state updates correctly preserve Pokémon order and existing team structure.

## Capabilities

### New Capabilities
- `editor-showdown-import`: Capability to parse and apply Showdown format sets directly within the team member editor.

### Modified Capabilities
- `team-member-editor`: Enhance the editor modal to support importing Showdown data for editing.

## Impact

- **UI**: Added "Import/Edit" action in the Team Member Editor.
- **State Management**: Integrate parsing logic into the existing editor state flow.
