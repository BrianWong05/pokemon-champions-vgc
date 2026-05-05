## MODIFIED Requirements

### Requirement: Item Parameter Integration
The damage calculation utilities SHALL accept an `item` property for both the Attacker and Defender and pass it through to the underlying engine, ensuring that item-specific effects like type-resist berries are natively processed.

#### Scenario: Passing item to Smogon calc
- **WHEN** `calculateDamage` or an equivalent wrapper is called with an `item` on the attacker
- **THEN** it SHALL initialize the `@smogon/calc` `Pokemon` object with the specified `item`.

#### Scenario: Passing berry to Defender
- **WHEN** the wrapper is called with a berry `item` on the defender
- **THEN** the `@smogon/calc` `Pokemon` object SHALL receive that berry, allowing the engine to calculate damage reduction.

## ADDED Requirements

### Requirement: Smogon Damage Range Extraction
The damage calculation utilities SHALL extract the exact 16-roll damage array provided by `@smogon/calc` and calculate the minimum and maximum damage percentages directly from it.

#### Scenario: Extracting damage bounds
- **WHEN** the `@smogon/calc` engine completes a calculation
- **THEN** the utility SHALL identify the lowest and highest values in the `damage` array and return them as the minimum and maximum percentage bounds to the UI.

#### Scenario: Handling fixed damage
- **WHEN** the `@smogon/calc` engine returns a single number for damage (e.g., fixed damage moves)
- **THEN** the utility SHALL treat that single number as both the minimum and maximum bounds.
