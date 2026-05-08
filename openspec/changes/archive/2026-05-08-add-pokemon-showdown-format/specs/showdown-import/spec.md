## ADDED Requirements

### Requirement: Showdown Format Parsing
The system SHALL parse a standard Pokémon Showdown export string into its constituent parts: Species, Item, Ability, Nature, EVs, IVs, and Moves.

#### Scenario: Parse a complete set
- **WHEN** a valid Showdown export string (e.g., "Amoonguss @ Sitrus Berry\nAbility: Regenerator\nLevel: 50\nEVs: 252 HP / 156 Def / 100 SpD\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Spore\n- Rage Powder\n- Pollen Puff\n- Protect") is provided
- **THEN** the system SHALL correctly identify all listed attributes.

#### Scenario: Handle missing fields
- **WHEN** a Showdown export string is missing optional fields (like IVs or Item)
- **THEN** the system SHALL use default values (e.g., 31 IVs, no Item) for those fields.

### Requirement: Multi-Pokémon Parsing
The system SHALL be able to identify and parse the first Pokémon found in a text block, even if the block contains multiple sets or leading/trailing whitespace.

#### Scenario: Parse from a team export
- **WHEN** a text block containing multiple Pokémon sets is provided
- **THEN** the system SHALL parse the first set detected in the text.

### Requirement: Stat and Nature Mapping
The system SHALL correctly map Showdown stat names (HP, Atk, Def, SpA, SpD, Spe) and Nature names to the internal application representation.

#### Scenario: Mapping EVs and IVs
- **WHEN** the export string contains "EVs: 252 HP / 4 SpD / 252 Spe"
- **THEN** the system SHALL map these values to the corresponding internal stat objects.
