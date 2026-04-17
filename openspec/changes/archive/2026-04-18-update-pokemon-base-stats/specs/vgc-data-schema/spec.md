## MODIFIED Requirements

### Requirement: Pokémon stats storage
The system SHALL store Pokémon base stats (`baseHp`, `baseAttack`, `baseDefense`, `baseSpAtk`, `baseSpDef`, `baseSpeed`) as integers.

#### Scenario: Validating base stats
- **WHEN** a Pokémon is added to the database with a base HP of 100
- **THEN** the value SHALL be stored accurately as an integer in the `baseHp` column.
