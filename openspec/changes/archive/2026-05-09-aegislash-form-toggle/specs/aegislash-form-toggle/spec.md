## ADDED Requirements

### Requirement: Aegislash Form Toggle
The system SHALL provide a toggle for Aegislash to switch between Shield and Blade formes.

#### Scenario: Switching to Blade Forme
- **WHEN** Aegislash is selected in the editor
- **AND** the user clicks the "Blade Forme" toggle
- **THEN** the base Attack (50) and Defense (140) stats are swapped
- **AND** the base Sp. Atk (50) and Sp. Def (140) stats are swapped
- **AND** the Pokémon name updates to "Aegislash (Blade)"

#### Scenario: Switching to Shield Forme
- **WHEN** Aegislash is in Blade Forme
- **AND** the user clicks the "Shield Forme" toggle
- **THEN** the base stats return to their default values (60/50/140/50/140/60)
- **AND** the Pokémon name updates to "Aegislash (Shield)"
