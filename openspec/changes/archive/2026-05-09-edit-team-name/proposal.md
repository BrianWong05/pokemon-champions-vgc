## Why

Currently, team names are fixed upon creation. Users need the ability to rename their teams to keep their collections organized.

## What Changes

- Add a rename/edit icon or action on the team detail page to modify the team name.
- Implement an inline edit or modal flow to update the team name in the database.

## Capabilities

### New Capabilities
- `edit-team-name`: Provides functionality to update an existing team's name.

### Modified Capabilities

## Impact

- `src/pages/TeamDetail/index.tsx`: Update UI to support renaming the team.
- `src/hooks/useTeams.ts`: Expose or update the team renaming functionality.
