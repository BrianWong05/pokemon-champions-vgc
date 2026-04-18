## ADDED Requirements

### Requirement: Modal Content Coverage
The system SHALL display all 6 base stats, types, and other available forms of a Pokémon within the detail modal.

#### Scenario: Opening the modal
- **WHEN** a user clicks on a Pokémon in the Speed Tier List
- **THEN** a modal window SHALL open containing the Pokémon's name, types, a stat grid, and a list of alternative forms.

### Requirement: Interactive Form Selection
The system SHALL allow users to navigate to related Pokémon forms directly from the modal.

#### Scenario: Clicking an alternative form
- **WHEN** a user clicks on a regional variant icon within the modal
- **THEN** the modal SHALL update its content to display the details of that specific variant.

### Requirement: Responsive Modal Design
The modal SHALL adapt its layout to ensure usability on both desktop and mobile devices.

#### Scenario: Mobile viewing
- **WHEN** the modal is opened on a small screen
- **THEN** it SHALL use a vertical scrollable layout for stats and forms.
