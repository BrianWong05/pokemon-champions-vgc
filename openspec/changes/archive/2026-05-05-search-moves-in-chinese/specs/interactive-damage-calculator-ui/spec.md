## MODIFIED Requirements

### Requirement: Layout Structure
The UI SHALL use a top-down structure where results are at the top and configuration panels are at the bottom.

#### Scenario: Responsive layout
- **WHEN** viewed on a desktop screen
- **THEN** results SHALL span the full width at the top, and Attacker/Defender panels SHALL be side-by-side below.

### Requirement: Visual HP Bar
The system SHALL provide a large, central visual HP bar representing the defender's remaining health.

#### Scenario: HP bar depletion
- **WHEN** an active move is selected
- **THEN** the HP bar SHALL show the remaining health after the Max Roll of that move, colored by status (Green > 50%, Yellow 20-50%, Red < 20%).

### Requirement: Pokémon-Specific Move Selection
The system SHALL provide 4 distinct move slots for the Attacker, allowing users to build a full move-set. It SHALL display both English and Chinese names for the moves.

#### Scenario: Displaying move slots
- **WHEN** the Attacker panel is rendered
- **THEN** it SHALL display 4 rows or areas for move selection, each displaying the selected move's English and Chinese names (if available).

### Requirement: Item Selection Field
The UI SHALL provide a selection mechanism (dropdown or autocomplete) for assigning a hold item to the Attacker and the Defender.

#### Scenario: Selecting an item
- **WHEN** the user interacts with the item selection field
- **THEN** they SHALL be able to select from a list of valid competitive items.

### Requirement: Reactive Stat Inputs
The UI SHALL update the damage results immediately upon any stat change, including SP slider adjustments, Nature toggle changes, stat stage increments/decrements, Pokémon selection, move selection, active move slot change, or hold item selection.

#### Scenario: Adjusting stat stage
- **WHEN** the user increments the Attack stage
- **THEN** all damage results at the top of the dashboard SHALL recalculate immediately to reflect the new multiplier.

#### Scenario: Toggling nature inline
- **WHEN** the user clicks the `+` button on a stat row
- **THEN** the damage results at the top of the screen SHALL recalculate immediately to reflect the new multiplier.

#### Scenario: Selecting an active move slot
- **WHEN** the user selects a move in slot 3 and makes it active
- **THEN** the damage percentage results SHALL recalculate immediately based on the move in slot 3.

#### Scenario: Changing hold item
- **WHEN** the user changes the hold item for either the Attacker or Defender
- **THEN** the damage percentage results SHALL recalculate immediately to reflect the new item modifier.

### Requirement: Native Impact Range Display
The UI SHALL display the incoming impact range using the exact minimum and maximum percentage bounds extracted from the `@smogon/calc` engine, rather than performing independent damage boundary calculations.

#### Scenario: Displaying calculated bounds
- **WHEN** the Results Panel renders a damage calculation
- **THEN** it SHALL format and display the minimum and maximum percentage bounds exactly as provided by the damage utility wrapper (derived from Smogon).

## ADDED Requirements

### Requirement: Multilingual Move Search
The move selection interface SHALL support searching by both English and Chinese names and SHALL display both in the results list.

#### Scenario: Searching for move in Chinese
- **WHEN** the user types "十萬伏特" in the move search field
- **THEN** the system SHALL display "Thunderbolt" (十萬伏特) in the search results.

#### Scenario: Displaying Chinese name in Assessment
- **WHEN** a move is selected and damage is calculated
- **THEN** the damage assessment list in the Results Panel SHALL display the move's Chinese name alongside its English name.
