## Context
Keyboard navigation in search dropdowns does not currently scroll the view when the highlighted item goes out of bounds.

## Goals / Non-Goals

**Goals:**
- Highlighted items should always be fully visible in the scroll container.

**Non-Goals:**
- Changing existing mouse behavior.

## Decisions

- **Logic:** Use `useRef` to get the container element and check the position of the active item to call `scrollIntoView` or set `scrollTop`.

## Risks / Trade-offs

- [Risk] Performance impact of frequent scroll updates → Mitigation: Use standard `scrollIntoView` or `scrollTop` logic.
