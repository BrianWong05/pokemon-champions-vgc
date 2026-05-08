## ADDED Requirements

### Requirement: Last Respects Power Calculation
The system SHALL calculate the base power of 'Last Respects' dynamically based on the number of fainted Pokémon in the user's team. The base power starts at 50 and increases by 50 for each fainted Pokémon.

#### Scenario: Calculating Last Respects power
- **WHEN** 'Last Respects' is selected and 3 Pokémon in the user's team have fainted
- **THEN** the base power SHALL be calculated as 50 + (3 * 50) = 200.
