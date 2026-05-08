## ADDED Requirements

### Requirement: Team Member Import Selection
The UI SHALL provide a way for users to select a specific member from one of their saved teams to import into the Attacker or Defender panel.

#### Scenario: Selecting a team member
- **WHEN** the user selects a team from the "My Teams" dropdown and then clicks on a specific Pokémon from that team
- **THEN** all relevant fields in the calculator panel (Species, Item, Ability, Nature, EVs, IVs, Moves) SHALL be automatically updated to match the selected team member's configuration.

#### Scenario: Reactive recalculation after team import
- **WHEN** a team member is successfully imported into a calculator panel
- **THEN** all damage results at the top of the dashboard SHALL recalculate immediately to reflect the new configuration.
