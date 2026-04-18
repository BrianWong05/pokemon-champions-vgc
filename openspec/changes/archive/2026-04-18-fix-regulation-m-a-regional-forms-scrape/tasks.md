## 1. Scraper Refactor

- [x] 1.1 Update `scripts/scrape_regulation_m_a.py` to extract type information from `cells[4]` images.
- [x] 1.2 Implement the `find_pokemon_id(name, types)` helper function in the script.
- [x] 1.3 Enhance the database query to filter by name/identifier and matched types.
- [x] 1.4 Handle Mega evolutions specifically (matching "Mega Name" and their specific types).

## 2. Execution & Verification

- [x] 2.1 Run the updated scraper script.
- [x] 2.2 Verify that Alolan Ninetales (ID 10104) and Hisuian Arcanine (ID 10230) are correctly linked to Regulation M-A in `format_pokemon`.
- [x] 2.3 Verify the total count of linked Pokémon increased and failed matches decreased.
