## Why
The team detail page's single Pokémon export currently copies directly to the clipboard, which is inconsistent with the Damage Calculator's new modal-based export flow.

## What Changes
- Add an `exportSingle` modal to `useTeamDetail`.
- Store the export text in state.
- Update `TeamMemberGrid` to trigger the modal.
- Include `ShowdownExportModal` in `TeamDetailPage`.

## Capabilities

### New Capabilities
- `team-member-export-modal`: Providing a modal UI for individual team member exports.

### Modified Capabilities
- `showdown-export`: Applying the modal pattern to the team management domain.

## Impact
- Improved consistency in export patterns across the app.
