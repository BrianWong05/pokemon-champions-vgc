## Context

Alternate Pokémon forms are identified in `pokemon.csv` by suffixes in their `identifier` (e.g., `-mega`, `-alola`). Since `pokemon_species_names.csv` only provides translations for the base species, localized names for these forms must be constructed programmatically in the extraction script.

## Goals / Non-Goals

**Goals:**
- Implement a robust name construction function in `scripts/extract_pokeapi_data.py`.
- Map common form identifiers to their localized prefixes/suffixes.
- Ensure fallback to the base name for unrecognized forms.

**Non-Goals:**
- Manually translating every single form (automation is key).
- Modifying the Drizzle schema (column names already support localized strings).

## Decisions

- **Decision**: Use a Python dictionary to store form-specific localization rules.
  - **Rationale**: Easy to extend with new regions or form types.
- **Decision**: Process names after merging the base species name into the main DataFrame.
  - **Rationale**: Allows the script to use the already joined localized base names as the starting point for construction.

## Risks / Trade-offs

- [Risk] **Inconsistent Suffixes** → **Mitigation**: Use regular expressions or string splitting to isolate the primary form modifier from the identifier.
- [Risk] **Over-construction** → **Mitigation**: Only apply transformation logic if `is_default` is 0 or if specific keywords are found in the identifier.
