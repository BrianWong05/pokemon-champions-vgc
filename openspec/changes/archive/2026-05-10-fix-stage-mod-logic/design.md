## Context
Stage modifiers are not updating the calculator state, possibly due to a misaligned reducer action or state integration.

## Goals / Non-Goals

**Goals:**
- Debug and fix stage modification logic.
- Ensure damage calculations reflect these stages.

**Non-Goals:**
- Changing existing damage calculation formulas beyond stage integration.

## Decisions

- **Diagnosis:** Add debug logging to identify payload/routing issues.
- **Resolution:** Correct reducer action if necessary.

## Risks / Trade-offs

- [Risk] Incorrect state update → Mitigation: Rigorous testing in browser console/logs.
