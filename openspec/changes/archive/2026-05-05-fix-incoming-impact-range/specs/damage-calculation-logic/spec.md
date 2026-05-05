## ADDED Requirements

### Requirement: Smogon Damage Range Extraction
The damage calculation utilities SHALL extract the exact 16-roll damage array provided by `@smogon/calc` and calculate the minimum and maximum damage percentages directly from it.

#### Scenario: Extracting damage bounds
- **WHEN** the `@smogon/calc` engine completes a calculation
- **THEN** the utility SHALL identify the lowest and highest values in the `damage` array and return them as the minimum and maximum percentage bounds to the UI.

#### Scenario: Handling fixed damage
- **WHEN** the `@smogon/calc` engine returns a single number for damage (e.g., fixed damage moves)
- **THEN** the utility SHALL treat that single number as both the minimum and maximum bounds.