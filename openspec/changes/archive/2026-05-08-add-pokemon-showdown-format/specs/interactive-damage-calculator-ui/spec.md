## ADDED Requirements

### Requirement: Showdown Import Trigger
The system SHALL provide an "Import Showdown" action within the Attacker and Defender configuration panels.

#### Scenario: Opening the import interface
- **WHEN** the user clicks the "Import Showdown" button
- **THEN** the system SHALL display a text input area for pasting the Showdown export.

### Requirement: Batch State Update on Import
The system SHALL update all relevant Pokémon fields (Species, Item, Ability, Nature, EVs, IVs, Moves) simultaneously when a valid Showdown set is imported.

#### Scenario: Successful batch update
- **WHEN** a valid set is pasted and the "Import" confirmation is clicked
- **THEN** the Attacker or Defender panel SHALL immediately reflect all the data from the imported set.
- **AND** the damage results SHALL recalculate automatically.
