## Why
The current direct-to-clipboard export behavior is less user-friendly than a dedicated modal where users can view and copy the Showdown-formatted text, consistent with other team management flows.

## What Changes
- Create a `ShowdownExportModal` component.
- Trigger this modal when clicking "Export" instead of copying directly to the clipboard.
- Update `PokemonConfigForm` to include the modal.

## Capabilities

### New Capabilities
- `modal-export-interface`: Introducing a modal-based UI for data exporting.

### Modified Capabilities
- `showdown-export`: Changing the export interaction pattern.

## Impact
- Improved UX for copying Showdown text.
- Added a new modal component.
