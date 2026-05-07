## MODIFIED Requirements

### Requirement: Adding Members to a Team
The system SHALL allow users to add up to 6 configured Pokémon to a team.

#### Scenario: Adding a Pokémon via Detailed Editor
- **WHEN** the user clicks "Add Pokémon" on a team with fewer than 6 members
- **THEN** a search interface appears to select a base Pokémon.
- **AND** once selected, a detailed editor opens to configure moves, items, and stats.

#### Scenario: Adding to a full team
- **WHEN** the user attempts to add a Pokémon to a team that already has 6 members
- **THEN** the system prevents the addition and displays an error message or disabled state.

### Requirement: Editing and Removing Team Members
The system SHALL allow users to manage the members of a saved team.

#### Scenario: Editing a member
- **WHEN** the user clicks "Edit" on a Pokémon in the team view
- **THEN** the detailed editor opens with the current configuration pre-loaded.
- **AND** modifications are saved back to the team.

#### Scenario: Removing a member
- **WHEN** the user clicks "Remove" on a Pokémon in the team view
- **THEN** the Pokémon is removed from the team and the updated team is saved.
