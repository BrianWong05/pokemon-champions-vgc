## Context

We need to populate the `format_pokemon` table for Regulation M-A. The source of truth is Serebii. The database `vgc_pokemon.db` already has the schema for `formats` and `format_pokemon`.

## Goals / Non-Goals

**Goals:**
- Fetch Regulation M-A Pokémon names from Serebii.
- Link these Pokémon to the Regulation M-A format in SQLite.
- Handle potential Cloudflare blocking.
- Log failures for Pokémon not found in the local database.

**Non-Goals:**
- Scouring multiple sources for legality.
- Handling real-time updates (this is a one-time or manual-trigger script).
- Scraping move legality or item restrictions.

## Decisions

- **Language**: Python 3.
- **Libraries**: `requests` for HTTP, `BeautifulSoup4` for parsing, `sqlite3` for database.
- **Scraping Strategy**: 
  - Target `https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml`.
  - Use a modern Chrome User-Agent header.
  - Parse `<td>` or `<a>` tags containing Pokémon names within the "Usable Pokémon" section.
- **Matching Strategy**:
  - Normalize names by lowercasing and stripping.
  - Perform a SQL query: `SELECT id FROM pokemon WHERE LOWER(name_en) = ? OR LOWER(identifier) = ?`.
- **Database Strategy**:
  - Use `INSERT OR IGNORE` for both format and junction records to ensure idempotency.

## Risks / Trade-offs

- **[Risk]** Serebii changes HTML structure. → **[Mitigation]** Use specific enough CSS selectors or tag patterns, and verify manually if extraction fails.
- **[Risk]** Name mismatches (e.g., "Tapu Koko" vs "tapu-koko"). → **[Mitigation]** Implement flexible matching (checking both `name_en` and `identifier`) and log failures.
