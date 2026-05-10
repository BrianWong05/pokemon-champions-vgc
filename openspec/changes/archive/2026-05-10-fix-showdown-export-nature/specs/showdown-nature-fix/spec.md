## ADDED Requirements

### Requirement: Standard Showdown Nature Format
The system SHALL export the Pokémon nature in the standard "[Nature] Nature" format without including redundant boost/reduction information.

#### Scenario: Verify nature format
- **WHEN** a user exports a Pokémon set
- **THEN** the nature line MUST read as "Modest Nature" instead of "Modest (+SPA, -ATK) Nature".
