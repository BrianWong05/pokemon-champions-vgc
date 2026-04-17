## Why

To accurately track Pokémon VGC legality for different regulations (like Regulation M-A), we need an automated way to populate the `format_pokemon` table. Manually entering hundreds of Pokémon is error-prone and inefficient. Fetching this data directly from a reliable source like Serebii ensures our database is up-to-date and accurate.

## What Changes

- Create a Python script to scrape "Regulation M-A" legal Pokémon from Serebii.
- Automate the process of ensuring the 'Regulation M-A' format exists in the database.
- Map scraped Pokémon names to database IDs using normalization.
- Populate the `format_pokemon` junction table.

## Capabilities

### New Capabilities
- `legality-scraping`: Capability to fetch and synchronize Pokémon battle regulation legality from external web sources into the local database.

### Modified Capabilities
- None.

## Impact

- **Scripts**: A new `scripts/scrape_regulation_m_a.py` script.
- **Database**: The `formats` and `format_pokemon` tables will be populated with data for Regulation M-A.
