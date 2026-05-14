## ADDED Requirements

### Requirement: Summary Footer Toggle
The system SHALL toggle between SP and EV stat management modes when the user clicks the "Total SP Used" or "Total EV Used" summary text.

#### Scenario: Verify toggle
- **WHEN** a user clicks on the SP/EV summary footer
- **THEN** the system MUST toggle the current stat display mode (`isEvMode`).
