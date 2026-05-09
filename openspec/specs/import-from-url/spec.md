## ADDED Requirements

### Requirement: Fetch Showdown text from URL
The system SHALL be able to fetch and extract Showdown-formatted team text from a valid pokepast.es or victoryroadvgc.com URL.

#### Scenario: Successful Pokepaste fetch
- **WHEN** user enters a valid pokepast.es URL (e.g., `https://pokepast.es/xxxxx`)
- **THEN** the system fetches the raw text from `https://pokepast.es/xxxxx/raw`
- **AND** populates the import textarea with the result

#### Scenario: Successful Victory Road fetch
- **WHEN** user enters a valid victoryroadvgc.com/pastes URL
- **THEN** the system fetches the page content
- **AND** extracts the Showdown text block
- **AND** populates the import textarea with the result

#### Scenario: Invalid URL error
- **WHEN** user enters a URL from an unsupported domain
- **THEN** the system displays an error message: "Unsupported paste source."

#### Scenario: Fetch failure error
- **WHEN** the system fails to fetch the URL (e.g., due to network error or CORS)
- **THEN** the system displays an error message: "Failed to fetch team data. Please copy and paste manually."
