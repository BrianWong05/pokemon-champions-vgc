## Why

Currently, alternate Pokémon forms (like Mega, Alola, Galar, etc.) in the database default to the base species' localized name because `pokemon_species_names.csv` only covers the base species. This change is needed to provide accurate, localized names for all Pokémon forms across supported languages (English, Japanese, Traditional Chinese).

## What Changes

- **Localization Logic**: Implement form name construction logic in the data extraction script.
- **Form Mapping**: Add a mapping of common form identifiers (e.g., `-mega`, `-alola`) to their localized equivalents.
- **Data Transformation**: Ensure all non-default Pokémon forms receive correctly formatted localized names.

## Capabilities

### Modified Capabilities
- `multilingual-pokemon-data`: Update to handle systematic construction of form names for alternate Pokémon forms.

## Impact

- **Database**: Updated `pokemon` table with correct localized names for alternate forms.
- **Script**: Modification to `scripts/extract_pokeapi_data.py`.
