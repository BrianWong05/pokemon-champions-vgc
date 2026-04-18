## ADDED Requirements

### Requirement: Direct database access for speed data
The system SHALL provide a mechanism to fetch Pokémon speed data directly from the `calculated_speeds` table using Drizzle ORM.

#### Scenario: Successful data retrieval
- **WHEN** the component initiates a query for Regulation M-A speed tiers
- **THEN** the system SHALL return a flat list of Pokémon containing `id`, `name`, `baseSpeed`, `maxPlus`, `maxNeutral`, `uninvested`, and `minMinus`.

### Requirement: Filter by Regulation M-A
The data fetching logic MUST strictly filter Pokémon based on their legality in the "Regulation M-A" format.

#### Scenario: Format filtering
- **WHEN** querying for speed tiers
- **THEN** only Pokémon linked to the "Regulation M-A" format via `format_pokemon` SHALL be included in the results.
