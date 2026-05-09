## MODIFIED Requirements

### Requirement: Show Benchmark Grid
Each Pokémon entry SHALL display the base speed stat, its English and Chinese names, and four calculated Speed benchmarks: Max+, Max, Neutral, and Min-, organized in a compact, space-efficient card format within a responsive grid.

#### Scenario: Localized Name Visibility
- **WHEN** a Pokémon entry is rendered in the compact card
- **THEN** it SHALL display both its English name and its Chinese name (if available).

#### Scenario: Compact Grid Layout
- **WHEN** the Speed Tier page is viewed on a desktop screen
- **THEN** each tier section SHALL display Pokémon in a multi-column grid layout (up to 4 columns) to maximize information density.

#### Scenario: Responsive Adaptation
- **WHEN** the screen width is reduced to mobile size
- **THEN** the grid SHALL automatically transition to a single-column layout for readability.
