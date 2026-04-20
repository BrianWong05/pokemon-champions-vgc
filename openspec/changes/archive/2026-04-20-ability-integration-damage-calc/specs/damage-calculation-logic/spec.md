## ADDED Requirements

### Requirement: Ability Modifier Integration
The damage calculation formula SHALL integrate ability multipliers into the stat calculation pipeline.

#### Scenario: Stat calculation order
- **WHEN** calculating a stat (e.g., Attack)
- **THEN** the system SHALL apply stage multipliers first, and then apply ability multipliers as the final modifier to the resulting stat.
