## Why

The current Regulation M-A scraping script only uses the Pokémon's English name to match records in the database. However, Serebii lists regional forms (e.g., Alolan Ninetales, Hisuian Arcanine) using their base form name (e.g., "Ninetales", "Arcanine"), which causes the script to either skip these forms or incorrectly link the base form only. This results in an incomplete and inaccurate Regulation M-A Pokémon list.

## What Changes

- Modify `scripts/scrape_regulation_m_a.py` to extract both the Pokémon name and its types from the Serebii table.
- Implement enhanced database matching logic that uses both name and types to disambiguate and correctly identify regional forms and Mega evolutions.
- Ensure that multiple forms of the same Pokémon (e.g., Charizard and its Megas, Ninetales and Alolan Ninetales) are all correctly linked to the format.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `pokeapi-csv-extraction`: (Indirectly) The scraping logic that consumes the database must be robust enough to handle form variations.
- `vgc-data-schema`: (Indirectly) The format-to-pokemon relationship must accurately reflect the specific form legal in the format.

## Impact

- `scripts/scrape_regulation_m_a.py`: Major refactor of the parsing and matching logic.
- Database (`format_pokemon` table): Will be populated with correct and complete form-specific data for Regulation M-A.
