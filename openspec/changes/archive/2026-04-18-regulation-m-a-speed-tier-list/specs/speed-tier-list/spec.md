## ADDED Requirements

### Requirement: Display Speed Tiers
The Speed Tier List page SHALL group Pokémon by their Base Speed in descending order.

#### Scenario: Base Speed Grouping
- **WHEN** Pokémon with Base Speeds of 135, 100, and 135 are provided
- **THEN** The UI displays a "Base 135" section followed by a "Base 100" section, with both 135 Pokémon grouped together.

### Requirement: Show Benchmark Grid
Each Pokémon entry SHALL display four calculated Speed benchmarks: Max+, Max, Neutral, and Min-.

#### Scenario: Column Grid Visibility
- **WHEN** A Pokémon entry is rendered
- **THEN** A 4-column grid or table displays the values computed by `stat-calculation-utils`.

### Requirement: Display Pokémon Visuals
The Speed Tier List SHALL display the local thumbnail for each Pokémon.

#### Scenario: Thumbnail Source
- **WHEN** A Pokémon with ID `123` is rendered
- **THEN** The image source is set to `/images/pokemon/thumbnails/123.png`.
