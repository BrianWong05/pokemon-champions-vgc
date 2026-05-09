## ADDED Requirements

### Requirement: Fetch Pokémon by Format
The system SHALL retrieve all Pokémon that are legal for a specified format name (e.g., 'Regulation M-A') from the database, ensuring that only officially authorized forms are included.

#### Scenario: Successful fetch for Regulation M-A
- **WHEN** the `fetchRegulationMAPokemonSpeed` function is called
- **THEN** the system executes a Drizzle ORM query joining `pokemon`, `format_pokemon`, and `formats` where `formats.name` equals 'Regulation M-A'.
- **AND** the resulting list SHALL NOT contain any restricted Mega Z or Mega Raichu variants.

### Requirement: Calculate Speed Benchmarks
The system SHALL calculate four speed benchmarks for each retrieved Pokémon using the custom formula: `floor((Base + 20 + SP) * Nature)`.

#### Scenario: Benchmark calculation per Pokémon
- **WHEN** a Pokémon record with `baseSpeed` is retrieved
- **THEN** the system maps over it to produce `maxPlus` (32 SP, 1.1x), `maxNeutral` (32 SP, 1.0x), `uninvested` (0 SP, 1.0x), and `minMinus` (0 SP, 0.9x).

### Requirement: Sort Results by Base Speed
The system SHALL return the processed Pokémon array sorted by their Base Speed in descending order.

#### Scenario: Sorting validation
- **WHEN** the database returns a list of Pokémon
- **THEN** the returned array has the Pokémon with the highest `baseSpeed` at index 0.

### Requirement: Standardized Output Structure
The system SHALL return each Pokémon as an object matching the specified structure.

#### Scenario: Output structure validation
- **WHEN** the data is returned
- **THEN** each object contains `id`, `name`, `baseSpeed`, and a `speeds` object with the four benchmarks.
