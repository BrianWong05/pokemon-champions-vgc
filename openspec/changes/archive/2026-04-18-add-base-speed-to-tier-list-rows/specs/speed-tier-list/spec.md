## MODIFIED Requirements

### Requirement: Show Benchmark Grid
Each Pokémon entry SHALL display the base speed stat and four calculated Speed benchmarks: Max+, Max, Neutral, and Min-.

#### Scenario: Row Content Visibility
- **WHEN** a Pokémon entry is rendered
- **THEN** it SHALL display the Pokémon's base speed followed by the four calculated benchmarks.

#### Scenario: Grid Column Alignment
- **WHEN** the Speed Tier List is rendered
- **THEN** the header labels (Pokemon, Base, Max+, Max, Neutral, Min-) SHALL align vertically with their corresponding values in the rows below.
