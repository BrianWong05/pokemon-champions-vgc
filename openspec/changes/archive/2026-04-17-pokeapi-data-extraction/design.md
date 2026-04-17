## Context

The system needs to fetch raw CSV data from the PokeAPI GitHub repository, process it, and store it in an optimized SQLite database for the Pokémon VGC website.

## Goals / Non-Goals

**Goals:**
- Extract Pokémon names in English, Japanese, and Traditional Chinese.
- Extract Pokémon types (primary and secondary).
- Extract base stats (HP, Atk, Def, Spa, Spd, Spe).
- Include all forms (mega, regional variants, etc.).
- Create a relational SQLite schema for efficient querying.

**Non-Goals:**
- Extracting move data (this is covered in a separate change).
- Extracting ability data.
- Building a full REST API (database focus).

## Decisions

- **Decision**: Use `pandas` for data manipulation.
  - **Rationale**: Pandas provides powerful tools for joining, filtering, and pivoting CSV data, making the complex merging logic easier to maintain.
- **Decision**: Fetch CSVs via raw GitHub URLs.
  - **Rationale**: Direct access to the `master` branch ensures the script always has the latest official data without cloning the entire repository.
- **Decision**: Store all stats as integers in the `pokemon` table.
  - **Rationale**: Consistent with Pokémon game mechanics and improves query performance.

## Risks / Trade-offs

- [Risk] **GitHub Rate Limiting** → **Mitigation**: Fetch and cache CSVs locally before processing.
- [Risk] **Schema Changes in PokeAPI** → **Mitigation**: Use fixed column references and add basic validation to the extraction script.
