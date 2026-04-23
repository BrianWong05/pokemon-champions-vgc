## MODIFIED Requirements

### Requirement: Searchable Pokémon Filter
The system SHALL provide a search field that filters the list of available Pokémon based on English name, Chinese name, or alternate form identifiers.

#### Scenario: Filtering by form name
- **WHEN** the user types "Wash" into the search field
- **THEN** Pokémon with "Wash" in their name or form identifier (e.g., Rotom (Wash)) SHALL be displayed in the dropdown.
