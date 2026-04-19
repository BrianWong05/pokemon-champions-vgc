## MODIFIED Requirements

### Requirement: Pokémon stats storage
The system SHALL store Pokémon base stats (`baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, `baseSpeed`) as integers.

#### Scenario: Validating base stats
- **WHEN** a Pokémon is added to the database with a base HP of 100
- **THEN** the value SHALL be stored accurately as an integer in the `baseHp` column.
## ADDED Requirements

### Requirement: Pre-calculated Pokémon speed storage
The system SHALL support storing pre-calculated speed benchmarks for competitive play in the `calculated_speeds` table.

#### Scenario: Pre-calculated stats for competitive play
- **WHEN** a record is added to the `calculated_speeds` table
- **THEN** the system SHALL store the corresponding `maxPlus`, `maxNeutral`, `uninvested`, and `minMinus` values as integers.
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
