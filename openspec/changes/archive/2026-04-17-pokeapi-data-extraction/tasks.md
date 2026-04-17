## 1. Setup

- [x] 1.1 Create `scripts/extract_pokeapi_data.py`
- [x] 1.2 Install Python dependencies (`pandas`, `requests`)

## 2. CSV Extraction & Transformation

- [x] 2.1 Fetch CSVs from PokeAPI GitHub repository
- [x] 2.2 Join `pokemon`, `pokemon_species`, and localized name tables
- [x] 2.3 Pivot and merge stats into the Pokémon DataFrame
- [x] 2.4 Process types and associate them with Pokémon entries

## 3. Database Creation

- [x] 3.1 Define SQLite schema for the `pokemon` table
- [x] 3.2 Insert processed data into `vgc_pokemon.db`
- [x] 3.3 Create secondary tables for types and forms if necessary

## 4. Verification

- [x] 4.1 Run the script and verify `vgc_pokemon.db` creation
- [x] 4.2 Query Pokémon stats and localized names to ensure data integrity
- [x] 4.3 Verify that all alternate forms are correctly captured
