## ADDED Requirements

### Requirement: Pokémon format definitions
The system SHALL maintain a `formats` table to store VGC battle regulation metadata, including name, optional description, and an active status flag.

#### Scenario: Creating a new battle format
- **WHEN** a battle format named "Regulation M-A" is added
- **THEN** it SHALL be stored with its description and `is_active` set to true.

### Requirement: Pokémon legality tracking
The system SHALL maintain a `format_pokemon` junction table to map Pokémon to specific battle formats using a composite primary key.

#### Scenario: Adding Pokémon to a format
- **WHEN** a Pokémon is linked to the "Regulation M-A" format
- **THEN** a unique entry in the `format_pokemon` table SHALL be created.

### Requirement: Referential integrity for legality
The system SHALL enforce foreign key constraints with ON DELETE CASCADE for the `format_pokemon` table to ensure data consistency when formats or Pokémon are deleted.

#### Scenario: Deleting a format
- **WHEN** a battle format is deleted from the `formats` table
- **THEN** all associated records in the `format_pokemon` table SHALL be automatically removed.
