## ADDED Requirements

### Requirement: Item Selection Field
The UI SHALL provide a selection mechanism (dropdown or autocomplete) for assigning a hold item to the Attacker and the Defender.

#### Scenario: Selecting an item
- **WHEN** the user interacts with the item selection field
- **THEN** they SHALL be able to select from a list of valid competitive items.

## MODIFIED Requirements

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