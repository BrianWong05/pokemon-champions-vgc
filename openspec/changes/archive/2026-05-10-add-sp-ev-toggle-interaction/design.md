## Context
The SP/EV total display is currently read-only. We want to enable interaction by adding an `onClick` handler.

## Goals / Non-Goals

**Goals:**
- Enable toggling `isEvMode` when clicking the SP/EV summary footer.

## Decisions

- **UI:** Attach `onClick` to the summary section containing the SP/EV text.

## Risks / Trade-offs
- [Risk] Accidental toggling → Mitigation: Ensure it's clear that this area is interactive (perhaps add a hover effect or pointer cursor).
