## Context
The current search implementation uses `slice(0, 10)` and `slice(0, 15)` which restricts discoverability.

## Goals / Non-Goals

**Goals:**
- Increase or remove the limit to ensure all relevant items are discoverable.

## Decisions

- **Logic:** Increase the slice limit to 50 or remove it entirely, as the current list sizes should be manageable.

## Risks / Trade-offs

- [Risk] Dropdown rendering performance with too many nodes → Mitigation: Test with a high number of results (e.g., searching for "a").
