## Context
The `ItemSearchSelect` component needs to support ArrowUp/Down and Enter keys, mirroring the pattern used in `PokemonSearchSelect` and `MoveSearchSelect`.

## Goals / Non-Goals

**Goals:**
- Enable keyboard navigation for the item dropdown.

## Decisions

- **Logic:** Reuse the keyboard handling pattern implemented in previous search components.

## Risks / Trade-offs
- Minimal risk; reusing established component patterns.
