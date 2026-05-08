## ADDED Requirements

### Requirement: Import team from Teams page
The system SHALL provide an "Import Team" button on the "My Teams" page.

#### Scenario: Display Import button
- **WHEN** user navigates to "My Teams" page
- **THEN** an "Import Team" button is displayed near the "Create New Team" button

#### Scenario: Successful team import
- **WHEN** user clicks "Import Team"
- **AND** user pastes valid Showdown export text
- **AND** user confirms import
- **THEN** a new team is created in the database containing the imported Pokemon
- **AND** the user is navigated to the new team detail page
