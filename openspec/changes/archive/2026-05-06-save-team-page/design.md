## Context

We have existing functionality to configure a single Pokémon's stats, moves, item, and ability. However, the core of VGC is building a team of 6 Pokémon. Users currently have no way to gather their configured Pokémon into a single, cohesive team and save that configuration for later use or reference. 

## Goals / Non-Goals

**Goals:**
- Provide a dedicated UI (`/teams`) to manage teams.
- Allow users to assemble a team of up to 6 configured Pokémon.
- Save teams to local storage/database so they persist across sessions.
- Allow editing and deleting saved teams.

**Non-Goals:**
- Sharing teams online (via URL or server).
- Team validation against specific VGC rulesets (legality checking beyond basic selection limits).
- Importing/exporting teams to Showdown format (can be a separate feature later).

## Decisions

- **Data Storage**: We will use the existing local database setup (Drizzle over sql.js/sqlite WASM, or IndexedDB if not fully set up) to store `teams` and `team_members`. If a `vgc_pokemon.db` schema allows it, we will add tables for teams. Wait, checking `src/db/schema.ts`, we might need to add `teams` and `team_pokemon` tables. 
- **Team Model**: A team has an `id`, `name`, `createdAt`, `updatedAt`. A team member links a `team_id` to a `pokemon_id` (or stores a full copy of the Pokémon configuration). Given Pokémon configurations can be complex, it's safer to store the actual configuration as JSON or separate relational fields to avoid changes to a "preset" breaking a saved team. For simplicity initially, a team will store a list of Pokémon configurations.
- **UI Architecture**: A `/teams` route containing a list of saved teams and a "Create New Team" button. The detail view `/teams/:id` allows adding Pokémon. To add a Pokémon, we can open a modal that searches existing configurations or allows creating a new one on the fly.

## Risks / Trade-offs

- **[Risk] Schema complexity** → We must ensure the new tables for teams align well with the existing schema and don't overcomplicate data fetching. We will store team member references if they are strong entities, or embedded JSON if they are value objects.
- **[Risk] State management** → Keeping the active team state in sync with the database. Mitigation: use custom hooks to abstract the team persistence logic.
