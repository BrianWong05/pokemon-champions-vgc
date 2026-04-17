## ADDED Requirements

### Requirement: Serebii HTML Acquisition
The system SHALL fetch the HTML content from the Serebii Regulation M-A page using a realistic User-Agent to avoid blocking.

#### Scenario: Successful HTML fetch
- **WHEN** the script executes with a valid User-Agent
- **THEN** it SHALL receive a 200 OK response from Serebii.

#### Scenario: Blocked by Cloudflare
- **WHEN** the server returns a non-200 status code
- **THEN** the script SHALL print an error message and exit.

### Requirement: Battle Format Initialization
The system SHALL ensure the 'Regulation M-A' format exists in the `formats` table before processing Pokémon.

#### Scenario: Format does not exist
- **WHEN** the script starts
- **THEN** it SHALL insert 'Regulation M-A' into the `formats` table if it is missing.

### Requirement: Pokémon Legality Extraction
The system SHALL extract all "Usable Pokémon" names from the fetched Serebii HTML.

#### Scenario: Parsing Pokémon names
- **WHEN** the HTML is processed by BeautifulSoup
- **THEN** it SHALL identify and collect all Pokémon names listed as usable.

### Requirement: Name Normalization and Matching
The system SHALL normalize extracted names and match them against the `pokemon` table in the database.

#### Scenario: Matching a Pokémon
- **WHEN** a name like "Bulbasaur" is extracted
- **THEN** the system SHALL match it against the database using case-insensitive normalization to find its `id`.

#### Scenario: Failed match logging
- **WHEN** a name cannot be matched to a database record
- **THEN** the system SHALL log the failure for manual review.

### Requirement: Legality Record Insertion
The system SHALL insert records into the `format_pokemon` table linking the regulation format to the matched Pokémon.

#### Scenario: Inserting a mapping
- **WHEN** a Pokémon ID is found for Regulation M-A
- **THEN** the system SHALL insert an `INSERT OR IGNORE` record into `format_pokemon`.
