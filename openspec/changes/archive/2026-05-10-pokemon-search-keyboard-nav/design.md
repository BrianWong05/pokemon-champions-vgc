## Context
The `PokemonSearchSelect` component is a reusable dropdown for filtering Pokémon. It needs to handle keydown events for selection navigation.

## Goals / Non-Goals

**Goals:**
- Enable ArrowDown/ArrowUp to highlight items.
- Enable Enter key to select the highlighted item.

**Non-Goals:**
- Changing the existing mouse click behavior.

## Decisions

- **Logic:** Add `onKeyDown` handler to the input or dropdown container. Manage `activeIndex` in the component state.

## Risks / Trade-offs

- [Risk] Conflict with native browser behavior → Mitigation: Ensure `event.preventDefault()` is used when navigation is handled.
