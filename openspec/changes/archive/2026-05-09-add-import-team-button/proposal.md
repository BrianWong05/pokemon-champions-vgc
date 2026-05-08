## Why

Users often need to import teams from other sources (e.g., Showdown exports) directly from the "My Teams" page without navigating to a specific team first. This improves workflow efficiency.

## What Changes

- Add an "Import Team" button beside the "Create New Team" button on the `src/pages/Teams` page.
- Integrate the existing `TeamShowdownImportModal` into the `TeamsPage` component.

## Capabilities

### New Capabilities
- `teams-page-import`: Allows users to import teams in Showdown format directly from the team list view.

### Modified Capabilities

## Impact

- `src/pages/Teams/index.tsx`: Update UI to include the new button and modal.
