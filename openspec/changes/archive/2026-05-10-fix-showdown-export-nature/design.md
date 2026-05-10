## Context
The nature export logic currently appends boost/reduction info. Showdown standard format expects only the nature name.

## Goals / Non-Goals

**Goals:**
- Update `formatShowdownSet` to export only "[Nature] Nature".

**Non-Goals:**
- Removing nature info entirely.

## Decisions

- **Logic:** Simplify the nature formatting line in `formatShowdownSet`.

## Risks / Trade-offs

- [Risk] Loss of clarity for users who liked the (+/-) notation → Mitigation: This is required for standard Showdown compatibility.
