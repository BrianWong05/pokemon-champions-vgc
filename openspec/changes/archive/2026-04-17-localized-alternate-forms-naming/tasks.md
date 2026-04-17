## 1. Core Logic Implementation

- [x] 1.1 Create the form localization mapping dictionary in `scripts/extract_pokeapi_data.py`
- [x] 1.2 Implement the `localize_form_name` function to construct names for English, Japanese, and Chinese
- [x] 1.3 Integrate the localization function into the main data transformation pipeline
- [x] 1.4 Apply the function to all non-default Pokémon forms or those with form-specific identifiers

## 2. Verification

- [x] 2.1 Run the extraction script and verify `vgc_pokemon.db` is updated
- [x] 2.2 Query Mega forms (e.g., Charizard) to ensure names are constructed correctly (e.g., "Mega Charizard X")
- [x] 2.3 Query Regional forms (e.g., Vulpix) to ensure "Alolan Vulpix" or equivalent is present
- [x] 2.4 Verify fallback behavior for forms without a specific mapping
