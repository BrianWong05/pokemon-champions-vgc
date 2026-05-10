## ADDED Requirements

### Requirement: Single Team Member Export Modal
The system SHALL use the `ShowdownExportModal` when a user attempts to export an individual Pokémon from a team.

#### Scenario: Verify modal trigger
- **WHEN** a user clicks "Export" on a Pokémon card in the team view
- **THEN** the system MUST open a modal with the Showdown-formatted set rather than copying to the clipboard.
