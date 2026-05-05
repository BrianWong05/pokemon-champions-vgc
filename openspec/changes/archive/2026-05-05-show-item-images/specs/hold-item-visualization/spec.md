## ADDED Requirements

### Requirement: Item Sprite Visualization
The system SHALL display the sprite of the currently selected hold item in the Pokémon Panel.

#### Scenario: Item sprite updates on selection
- **WHEN** the user selects "Choice Band" from the "Hold Item" dropdown
- **THEN** the image corresponding to `Choice_Band_SV.png` SHALL be displayed next to the dropdown.

#### Scenario: Missing item sprite fallback
- **WHEN** the user selects an item that does not have a corresponding image in the `/items` directory
- **THEN** no image SHALL be displayed, and the layout SHALL gracefully adjust.
