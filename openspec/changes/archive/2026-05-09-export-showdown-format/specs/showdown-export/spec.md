## ADDED Requirements

### Requirement: Generate Showdown Export Text
The system SHALL provide a text block representation of the team configuration formatted in the Pokemon Showdown standard.

#### Scenario: Generate valid Showdown text
- **WHEN** user requests an export of the current team
- **THEN** the system generates a formatted text string including Pokemon name, item, ability, nature, and move set

### Requirement: Copy Export to Clipboard
The system SHALL copy the generated Showdown text to the clipboard when requested.

#### Scenario: Copy to clipboard success
- **WHEN** user clicks the \"Copy to Clipboard\" button in the export modal
- **THEN** the system copies the Showdown text string to the system clipboard
- **AND** the system shows a \"Copied!\" notification
