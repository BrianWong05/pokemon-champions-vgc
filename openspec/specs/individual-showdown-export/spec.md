## ADDED Requirements

### Requirement: Export Individual Pokémon
The system SHALL allow users to export a single Pokémon's configuration from the Team Detail page in Showdown format.

#### Scenario: Successful individual export
- **WHEN** user clicks the "Export" button on a Pokémon member card
- **THEN** the system generates the Showdown text for that specific Pokémon
- **AND** the text is copied to the system clipboard
- **AND** the button text changes to "Copied!" for 2 seconds
