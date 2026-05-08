## ADDED Requirements

### Requirement: Display nature stat modifiers
The system SHALL display the stat modifiers (boosted and hindered) for the currently selected nature in the Pokémon editor.

#### Scenario: Display nature modifiers
- **WHEN** user selects a nature in the dropdown
- **THEN** the system displays the boosted and hindered stats next to the dropdown in the format "(+<Stat>, -<Stat>)"
- **AND** boosted stats are styled green and hindered stats are styled red
