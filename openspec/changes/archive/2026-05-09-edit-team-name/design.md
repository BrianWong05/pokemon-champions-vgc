## Context

The current `TeamDetailPage` displays the team name but provides no way to modify it after creation. Users must rely on the initial name.

## Goals / Non-Goals

**Goals:**
- Provide a simple way to edit the team name on the Team Detail page.
- Update the team name in the database via the existing `updateTeam` hook function.

**Non-Goals:**
- Renaming teams from the list view (TeamsPage).

## Decisions

- **UI Pattern:** Add an "edit" icon next to the team name header that switches the text to an input field, or replaces it with a simple modal. Inline editing is preferred for simplicity and better UX.
- **Backend:** Reuse the existing `updateTeam` method from `useTeams` (it currently updates the name and re-saves members). Note that `updateTeam` expects members. I might need to make sure I pass the current members list back to it unchanged.

## Risks / Trade-offs

- **Re-saving members:** Since `updateTeam` re-saves all members, renaming a team incurs a cost to update the team-members table.
    - [Risk] Unnecessary database writes.
    - [Mitigation] Acceptable for now as a simple implementation, refactor later if performance becomes an issue.
