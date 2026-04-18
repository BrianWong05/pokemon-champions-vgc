## MODIFIED Requirements

### Requirement: Show Benchmark Grid
Each Pokémon entry SHALL display four calculated Speed benchmarks: Max+, Max, Neutral, and Min-.

#### Scenario: Column Grid Visibility
- **WHEN** a Pokémon entry is rendered
- **THEN** a 4-column grid or table displays the values fetched directly from the `calculated_speeds` database table, with no additional frontend mathematical computation.
