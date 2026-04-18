## ADDED Requirements

### Requirement: Pokémon Type Color Mapping
The system SHALL map each of the 18 Pokémon types to their corresponding hex color code as defined in the technical design.

#### Scenario: Visual validation of type color
- **WHEN** a Pokémon of type "Fire" is displayed
- **THEN** the system SHALL use the hex color `#e4613e` for its background.

### Requirement: Type SVG Icon Integration
The system SHALL display the correct SVG icon from the `@icons/` directory for each Pokémon type.

#### Scenario: Loading a type icon
- **WHEN** a "Water" type badge is rendered
- **THEN** the system SHALL load and display the content of `@icons/water.svg`.
