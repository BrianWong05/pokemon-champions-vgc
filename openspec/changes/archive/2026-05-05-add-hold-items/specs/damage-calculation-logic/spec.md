## ADDED Requirements

### Requirement: Item Parameter Integration
The damage calculation utilities SHALL accept an `item` property for both the Attacker and Defender and pass it through to the underlying engine.

#### Scenario: Passing item to Smogon calc
- **WHEN** `calculateDamage` or an equivalent wrapper is called with an `item` on the attacker
- **THEN** it SHALL initialize the `@smogon/calc` `Pokemon` object with the specified `item`.