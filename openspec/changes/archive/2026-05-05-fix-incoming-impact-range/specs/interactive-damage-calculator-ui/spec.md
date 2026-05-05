## ADDED Requirements

### Requirement: Native Impact Range Display
The UI SHALL display the incoming impact range using the exact minimum and maximum percentage bounds extracted from the `@smogon/calc` engine, rather than performing independent damage boundary calculations.

#### Scenario: Displaying calculated bounds
- **WHEN** the Results Panel renders a damage calculation
- **THEN** it SHALL format and display the minimum and maximum percentage bounds exactly as provided by the damage utility wrapper (derived from Smogon).