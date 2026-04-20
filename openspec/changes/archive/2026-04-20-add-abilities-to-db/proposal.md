## Why

The current database lacks Pokémon abilities, which are crucial for VGC strategy and damage calculation. Adding abilities and their Pokémon associations will provide essential data for the damage calculator and search features.

## What Changes

- Update Drizzle schema to include `abilities` and `pokemon_abilities` tables.
- Create a Python script to extract, merge, and seed ability data from PokeAPI CSVs.
- Support multilingual ability names (English, Japanese, Traditional Chinese).
- Link abilities to existing Pokémon in the database.

## Capabilities

### New Capabilities
- `pokemon-abilities`: Definition and management of ability data and Pokémon-ability relationships.

### Modified Capabilities
- `vgc-data-schema`: Update schema to include ability-related tables.

## Impact

- `src/db/schema.ts`: Schema updates.
- `scripts/populate_abilities.py`: New seeding script.
- `vgc_pokemon.db`: Database structure and data.
