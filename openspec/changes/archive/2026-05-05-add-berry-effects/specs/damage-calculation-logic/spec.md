## MODIFIED Requirements

### Requirement: Item Parameter Integration
The damage calculation utilities SHALL accept an `item` property for both the Attacker and Defender and pass it through to the underlying engine, ensuring that item-specific effects like type-resist berries are natively processed.

#### Scenario: Passing item to Smogon calc
- **WHEN** `calculateDamage` or an equivalent wrapper is called with an `item` on the attacker
- **THEN** it SHALL initialize the `@smogon/calc` `Pokemon` object with the specified `item`.

#### Scenario: Passing berry to Defender
- **WHEN** the wrapper is called with a berry `item` on the defender
- **THEN** the `@smogon/calc` `Pokemon` object SHALL receive that berry, allowing the engine to calculate damage reduction.