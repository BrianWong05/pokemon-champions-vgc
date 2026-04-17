## ADDED Requirements

### Requirement: Localized form names
The system SHALL construct localized names for alternate Pokémon forms by applying form-specific prefixes or suffixes to the base species' localized name.

#### Scenario: Constructing Mega form name
- **WHEN** processing an identifier with a `-mega` suffix
- **THEN** the English name SHALL be "Mega " prepended to the base name, and the Japanese name SHALL be "メガ" prepended to the base name.

#### Scenario: Constructing Regional form name
- **WHEN** processing an identifier with an `-alola` suffix
- **THEN** the English name SHALL be "Alolan " prepended to the base name, and the Chinese name SHALL be "阿羅拉的樣子 " prepended to the base name.

#### Scenario: Unrecognized form fallback
- **WHEN** processing an alternate form identifier with an unrecognized suffix
- **THEN** the system SHALL fall back to using the base species' localized name.
