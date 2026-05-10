## Context
The user prefers a consistent modal UI for exporting Showdown sets, matching the "My Teams" modal flow.

## Goals / Non-Goals

**Goals:**
- Implement a modal for exporting Showdown text.
- Replace the direct clipboard copy action with modal display.

**Non-Goals:**
- Changing the Showdown formatting logic.

## Decisions

- **UI:** Re-use the existing modal structure (e.g., as seen in `ShowdownImportModal`) for the export display.

## Risks / Trade-offs

- [Risk] Duplicate UI code → Mitigation: Extract common modal styles if possible.
