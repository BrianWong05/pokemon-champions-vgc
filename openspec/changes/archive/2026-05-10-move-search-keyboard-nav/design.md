## Context
The `MoveSearchSelect` component is a reusable dropdown for filtering moves. It needs the same keyboard interaction as the `PokemonSearchSelect`.

## Goals / Non-Goals

**Goals:**
- Enable ArrowDown/ArrowUp to highlight moves.
- Enable Enter key to select the highlighted move.

**Non-Goals:**
- Changing existing mouse behavior.

## Decisions

- **Logic:** Reuse the keyboard handling pattern implemented in `PokemonSearchSelect`.

## Risks / Trade-offs

- None identified.
