## Context

Serebii's Regulation M-A page uses a table where regional forms and base forms share the same name text but are distinguished by their type icons and sprites. The existing scraper misses these distinctions because it ignores everything except the name text in the 4th column (`cells[3]`).

## Goals / Non-Goals

**Goals:**
- Extract name from `cells[3]`.
- Extract types from image filenames in `cells[4]`.
- Correcty match base forms, regional forms (Alola, Galar, Hisui, Paldea), and Mega evolutions.
- Populate `format_pokemon` with the correct `pokemon_id`.

**Non-Goals:**
- Scrape entire move pools or other stats (already handled by other scripts).
- Update the base `pokemon` table (this is a format legality script only).

## Decisions

- **Type Extraction**: For each row, iterate through `<img>` tags in `cells[4]`. Extract the filename (e.g., `fire.gif` -> `fire`).
- **Matching Strategy**:
    1. Extract base name (e.g., "Ninetales").
    2. Extract types from Serebii (e.g., `['ice', 'fairy']`).
    3. Construct a query to find a Pokémon where `identifier LIKE 'basename%'` AND its types match the Serebii types exactly (order-independent).
    4. Handle Megas by checking if the name contains "Mega" or the image path contains "-m". Serebii lists Megas with their own rows and names like "Mega Venusaur".
- **Database Connection**: Reuse the existing `sqlite3` connection to `vgc_pokemon.db`.
- **Normalization**: Map Serebii type strings/filenames to the lowercase type identifiers in the database.

## Risks / Trade-offs

- **[Risk]** Identifier matching (`LIKE 'basename%'`) might return multiple results → **[Mitigation]** The type filter should narrow it down to a single record in 99% of cases.
- **[Risk]** Type icons might change or be missing → **[Mitigation]** Use text as a fallback or log failures for manual inspection.
