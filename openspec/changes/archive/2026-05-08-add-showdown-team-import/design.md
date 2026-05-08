## Context

We already have a functional `parseShowdownSet` that parses one set. We need to iterate over this for a multi-set import.

## Goals / Non-Goals

**Goals:**
- Add an `importTeamShowdown` utility that splits the input by `\n\n` and calls `parseShowdownSet` for each.
- Add an "Import Team" button to the Teams dashboard.

## Decisions

### 1. Multi-set Parsing
**Decision**: Use double-newline as a delimiter to separate sets, then map each block through the existing parser.
**Rationale**: Showdown standard exports usually separate team members with at least one empty line.

## Risks / Trade-offs

- **[Risk]** Parsing errors in one Pokémon set might break the entire team import.
  - **Mitigation**: Add basic validation to ensure at least some Pokémon were successfully parsed and report errors for those that weren't.
