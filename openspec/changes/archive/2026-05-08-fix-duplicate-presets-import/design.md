## Context

The `scripts/add_showdown_preset.mjs` script is used to bulk import Pokémon showdown presets into the application's database. Currently, it performs blind inserts, leading to duplicate entries if the script is run multiple times or with overlapping data.

## Goals / Non-Goals

**Goals:**
- Add an existence check before insertion to the `add_showdown_preset.mjs` script.
- Ensure the uniqueness check covers Pokémon identity and all configuration parameters (nature, ability, item, moves).

**Non-Goals:**
- Removing existing duplicates from the database (this is a deduplication-during-import fix).

## Decisions

### 1. Uniqueness Criteria
The script will define a unique preset by the following combination of fields:
- `pokemon_name`
- `nature`
- `ability`
- `item`
- Sorted list of `moves`
- `evs` (as a JSON string or comparable object)

### 2. Implementation: Database Query
Before insertion, the script will execute a `SELECT` query to find an existing record matching these fields.
- **Rationale**: Direct database validation is the most reliable way to enforce this check during the import process.

## Risks / Trade-offs

- **Risk**: Performance impact for large imports.
- **Mitigation**: Using indexed columns for the query should maintain performance.
