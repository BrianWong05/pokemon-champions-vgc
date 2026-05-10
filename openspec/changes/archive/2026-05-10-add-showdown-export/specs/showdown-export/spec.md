## ADDED Requirements

### Requirement: Showdown Export Format
The system SHALL support exporting the currently configured Pokémon as a standard Showdown-formatted string.

#### Scenario: Verify export string
- **WHEN** a user configures a Pokémon set and clicks "Export to Showdown"
- **THEN** the system MUST display or copy to clipboard a string in the Showdown text format (e.g., Name @ Item, Nature, EVs, Ability, Moves).
