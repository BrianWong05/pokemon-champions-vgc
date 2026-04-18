## MODIFIED Requirements

### Requirement: Show Benchmark Grid
Each Pokémon entry SHALL display the base speed stat, its English and Chinese names, and four calculated Speed benchmarks: Max+, Max, Neutral, and Min-.

#### Scenario: Localized Name Visibility
- **WHEN** a Pokémon entry is rendered
- **THEN** it SHALL display both its English name and its Chinese name (if available) in the "Pokemon" column.

#### Scenario: Data Integrity
- **WHEN** querying for speed tiers
- **THEN** the system SHALL fetch both `nameEn` and `nameZh` from the Pokémon database table.
