## Context
The user wants to standardize the export experience. The individual Pokémon cards in the team view should open the `ShowdownExportModal`.

## Goals / Non-Goals

**Goals:**
- Use `ShowdownExportModal` for single team member exports.
- Remove direct clipboard copy from `TeamMemberGrid`.

**Non-Goals:**
- Modifying the full team export flow (which uses `TeamExportModal`).

## Decisions

- **State Management:** Add `exportText` and `exportSingle` modal state to `useTeamDetail`.

## Risks / Trade-offs

- None identified.
