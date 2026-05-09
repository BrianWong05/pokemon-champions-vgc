## Context

Regulation M-A is the primary competitive format used in the application. Currently, several custom Mega evolution variants (Mega Z and Mega Raichu) are listed as legal in this format. The user has requested their removal to align with the actual regulation rules.

## Goals / Non-Goals

**Goals:**
- Remove Mega Z Pokémon (Absol, Garchomp, Lucario) from Regulation M-A.
- Remove Mega Raichu X and Mega Raichu Y from Regulation M-A.
- Ensure the database state is consistent across `format_pokemon` and related tables.

**Non-Goals:**
- Deleting the Pokémon records themselves from the `pokemon` table (they should remain in the database, just not legal in this format).
- Modifying other battle formats.

## Decisions

### 1. Direct Database Cleanup via Script
Instead of modifying the scraper (which might re-add them if the source is "dirty"), we will create a one-time migration script or run direct SQL commands to remove these specific links. This is the most surgical approach.

**Rationale**: The scraping logic for Regulation M-A might be complex or rely on external sources that are not easily updated. A direct cleanup ensures immediate correctness.

### 2. Targeting by ID
We will use the specific database IDs identified:
- 10307 (Absol-Mega-Z)
- 10309 (Garchomp-Mega-Z)
- 10310 (Lucario-Mega-Z)
- 10304 (Raichu-Mega-X)
- 10305 (Raichu-Mega-Y)

**Rationale**: IDs are stable and unambiguous compared to strings which might have localization or formatting variations.

### 3. Verification through existing UI
After removal, we will verify the changes by checking the Speed Tier List and Damage Calculator pages, ensuring these Pokémon no longer appear in the results.

## Risks / Trade-offs

- **[Risk]** The scraper might re-add these Pokémon if it's run again in the future.
- **[Mitigation]** We should document these removals in the scraping script or add a "blacklist" feature to the scraper if it's frequently used.
