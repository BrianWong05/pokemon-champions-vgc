## Why

The current database only contains base forms of Pokémon, missing many competitive alternate forms (e.g., Rotom-Wash, Urshifu-Rapid-Strike, Landorus-Therian) that are essential for VGC. Including these forms with their unique stats, types, and identifiers is critical for accurate damage calculations and team building.

## What Changes

- **Update Python Seeder**: Modify `extract_pokeapi_data.py` to include Pokémon with IDs > 10000 and implement a filter for VGC-relevant forms.
- **Name Formatting**: Implement a naming utility in both the seeder (for DB consistency) and frontend (for searchability) to format identifiers like `rotom-wash` into "Rotom (Wash)".
- **Frontend Search**: Ensure the `DamageCalculator` search dropdown can handle searching by both base name and form name (e.g., "Wash" finds Rotom-Wash).
- **Image Integration**: Verify that the frontend correctly uses the database ID (>10000) to fetch the correct form-specific thumbnail images.

## Capabilities

### New Capabilities
- `alternate-form-management`: Logic for identifying, naming, and displaying alternate Pokémon forms.

### Modified Capabilities
- `searchable-pokemon-selection`: Update search logic to include form-specific keywords.
- `vgc-data-schema`: Ensure the schema supports distinct rows for alternate forms.

## Impact

- `scripts/extract_pokeapi_data.py`: Logic changes for form filtering and naming.
- `src/components/molecules/PokemonSearchSelect.tsx`: UI and search logic updates.
- `src/pages/DamageCalculator/index.tsx`: Ensure form data is correctly handled in state.
