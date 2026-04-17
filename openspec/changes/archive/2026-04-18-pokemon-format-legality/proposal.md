## Why

Currently, the VGC Pokémon database tracks Pokémon attributes like stats and localized names, but it lacks information about which Pokémon are legal in specific ranked battle formats (e.g., Regulation M-A). To build a useful VGC tool, we need to manage format-specific legality rules for Pokémon.

## What Changes

- Add a `formats` table to track different VGC regulations and their metadata.
- Add a `format_pokemon` junction table to map Pokémon to the formats where they are legal.
- Support composite primary keys and foreign key constraints with cascade deletions for these new tables.
- Update the Drizzle ORM schema and generate corresponding SQLite migration scripts.

## Capabilities

### New Capabilities
- `format-legality`: Defines the requirements for storing and managing battle format definitions and Pokémon legality within those formats.

### Modified Capabilities
- `vgc-data-schema`: The core data schema will be expanded to include relationships with format legality data.

## Impact

- **Database**: New tables and migrations in SQLite.
- **ORM**: Additions to `src/db/schema.ts`.
- **Data Integrity**: New foreign key constraints and composite keys to prevent duplicate legality records.
