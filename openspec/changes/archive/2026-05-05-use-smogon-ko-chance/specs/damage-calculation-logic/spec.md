## ADDED Requirements

### Requirement: Native KO Chance String Usage
The system SHALL display the exact KO chance string provided by `@smogon/calc` (e.g., "guaranteed 3HKO", "possible 2HKO") in place of manually computed survival indicators.

#### Scenario: Displaying a guaranteed KO
- **WHEN** a damage calculation results in a guaranteed knockout
- **THEN** the UI SHALL extract and display the string containing "guaranteed OHKO" from the Smogon result.

#### Scenario: Displaying a possible KO
- **WHEN** a damage calculation has a chance to knockout
- **THEN** the UI SHALL extract and display the string containing "possible OHKO" or similar chance text.

#### Scenario: Immunity fallback
- **WHEN** a move results in 0 damage (immunity)
- **THEN** the UI SHALL gracefully default to displaying "Survival" or "--".
