## MODIFIED Requirements

### Requirement: Pokémon move-set storage
The system SHALL support relationships between Pokémon and their legal moves.

#### Scenario: Storing move-sets
- **WHEN** a move is assigned to a Pokémon
- **THEN** the system SHALL store the relationship in the `pokemon_moves` junction table.

## ADDED Requirements

### Requirement: Localized move storage
The system SHALL store move names in English, Japanese, and Traditional Chinese.

#### Scenario: Fetching move names
- **WHEN** a user queries for a move (e.g., 'Tackle')
- **THEN** the system SHALL return its localized counterparts (e.g., 'たいあたり', '撞擊').
