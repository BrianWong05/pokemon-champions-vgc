## Context

Users want to use the existing `TeamMemberEditorModal` to import/edit individual Pokémon using the Showdown format, making it easier to adjust specific team members.

## Goals / Non-Goals

**Goals:**
- Provide a UI trigger in the editor modal for importing Showdown data.
- Integrate the import logic so it updates the editor's current state correctly.

## Decisions

### 1. Reusing Modal
**Decision**: Reuse the existing `ShowdownImportModal` inside the `TeamMemberEditorModal`.
**Rationale**: Keeps consistency and avoids UI duplication.

## Risks / Trade-offs

- **[Risk]** Potential for state inconsistency between the form and the importer.
  - **Mitigation**: Ensure the editor properly consumes the imported data structure immediately.
