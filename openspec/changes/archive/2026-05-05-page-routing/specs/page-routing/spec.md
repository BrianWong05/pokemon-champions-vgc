## ADDED Requirements

### Requirement: Application Routing
The system SHALL provide distinct URLs for different tools within the application.

#### Scenario: Navigate to Damage Calculator
- **WHEN** the user visits the root URL (`/`)
- **THEN** the system displays the Damage Calculator tool

#### Scenario: Navigate to EV/SP Converter
- **WHEN** the user visits `/ev-converter`
- **THEN** the system displays the EV/SP Converter tool

#### Scenario: Navigate to Speed Tier List
- **WHEN** the user visits `/speed-tiers`
- **THEN** the system displays the Speed Tier List tool

### Requirement: Global Navigation Menu
The system SHALL provide a persistent navigation menu accessible from any view.

#### Scenario: Switch tools via navigation menu
- **WHEN** the user clicks a link in the navigation menu
- **THEN** the URL updates and the corresponding tool is rendered without a full page reload

### Requirement: Fallback Routing
The system SHALL handle unrecognized URLs gracefully.

#### Scenario: Navigate to unknown route
- **WHEN** the user visits an invalid URL (e.g., `/unknown-page`)
- **THEN** the system displays a "404 Not Found" view or redirects to the root URL