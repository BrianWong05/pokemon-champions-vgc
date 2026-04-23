## Purpose
Define logic for identifying, fetching, and naming competitive alternate Pokémon forms from PokeAPI data.

## ADDED Requirements

### Requirement: Include Competitive Alternate Forms
The system SHALL include Pokémon forms with IDs > 10000 in the database if they match a defined whitelist of competitive identifiers.
- Whitelist keywords: `-wash`, `-heat`, `-frost`, `-fan`, `-mow`, `-therian`, `-rapid-strike`, `-single-strike`, `-hearthflame`, `-wellspring`, `-cornerstone`, `-crowned`, `-dusk`, `-midnight`, `-mega`, `-mega-x`, `-mega-y`, `-alola`, `-galar`, `-hisui`, `-paldea`.

#### Scenario: Including Rotom-Wash
- **WHEN** the seeder encounters ID 10008 (rotom-wash)
- **THEN** it SHALL NOT ignore the entry and SHALL process it as a distinct Pokémon row.

### Requirement: Standardized Form Naming
The system SHALL format alternate form names for professional display in the search interface.
- Format: `Base Name (Form Name)` (e.g., "Rotom (Wash)", "Urshifu (Rapid Strike)").

#### Scenario: Formatting Rotom-Wash
- **WHEN** the seeder or frontend processes identifier `rotom-wash`
- **THEN** it SHALL produce the display name "Rotom (Wash)".
