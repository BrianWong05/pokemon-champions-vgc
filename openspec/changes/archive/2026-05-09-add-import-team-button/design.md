## Context

The `TeamsPage` currently only allows creation of a new team via a local form. Users frequently have Showdown-formatted teams that they want to import without manual creation.

## Goals / Non-Goals

**Goals:**
- Expose an "Import Team" button on the `TeamsPage`.
- Reuse `TeamShowdownImportModal` to perform the import.
- Handle team creation upon successful import.

**Non-Goals:**
- Creating an entirely new import logic (reuse existing `TeamShowdownImportModal`).

## Decisions

- **Reuse Modal:** Use `TeamShowdownImportModal` from `src/components/organisms/`.
- **Integration:** Add state to `TeamsPage` to toggle the modal, and pass the `handleImportTeamShowdown` logic (to be implemented/adapted in `TeamsPage`).

## Risks / Trade-offs

- **Duplication of Import Logic:** The `handleImportTeamShowdown` logic is currently in `TeamDetailPage`.
    - [Risk] Duplicating import logic between `TeamDetailPage` and `TeamsPage`.
    - [Mitigation] Refactor the import logic into a custom hook (e.g., `useTeamShowdownImport.ts`) if possible, or keep it minimal in `TeamsPage` if simple enough.
