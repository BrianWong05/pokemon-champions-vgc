## ADDED Requirements

### Requirement: Manual Type Override
The system SHALL allow users to manually change a Pokémon's primary and secondary types after a species is selected.

#### Scenario: Overriding type to Water (Soak effect)
- **WHEN** a Pokémon is selected (e.g., Groudon)
- **AND** the user changes the Primary Type to "Water"
- **THEN** the system SHALL update the state to reflect the new typing and trigger a recalculation.

### Requirement: Default Type Synchronization
The system SHALL automatically reset a Pokémon's types to its base species defaults whenever a new Pokémon species is selected.

#### Scenario: Selecting a new species
- **WHEN** a user has overridden a Pokémon's types
- **AND** the user selects a different Pokémon species from the search list
- **THEN** the system SHALL overwrite the manual overrides with the new species' default types.
