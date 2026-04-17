## Why

The project requires high-quality, localized Pokémon data for a VGC website. Manually sourcing this data is inefficient, so an automated extraction process from the PokeAPI GitHub CSVs is needed to create a single, optimized source of truth.

## What Changes

- **Data Extraction**: Implement a Python script to fetch and parse raw CSV files from the PokeAPI repository.
- **Multilingual Support**: Capture names in English, Japanese, and Traditional Chinese.
- **Data Integration**: Merge Pokémon stats, types, and forms into a relational SQLite schema.
- **Form Support**: Ensure all regional variants and alternate forms are included.

## Capabilities

### New Capabilities
- `pokeapi-csv-extraction`: Scripted extraction and transformation of PokeAPI CSV data.
- `multilingual-pokemon-data`: Database support for localized names and descriptions.

### Modified Capabilities
<!-- None -->

## Impact

- **Database**: Creates `vgc_pokemon.db` as a new data artifact.
- **Dependencies**: Adds `pandas` and `requests` for data processing and fetching.
- **Automation**: Establishes a reproducible pipeline for updating Pokémon data.
