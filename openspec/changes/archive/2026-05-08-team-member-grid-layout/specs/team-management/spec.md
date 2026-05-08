## MODIFIED Requirements

### Requirement: Item Image Rendering
The `ItemImage` component SHALL render the correct image for a given item name across all team-related views, including the team overview cards on the "My Teams" page. The team overview card SHALL display member slots in a structured 3-column grid.

#### Scenario: Displaying team members in a grid
- **WHEN** the user views the "My Teams" page
- **THEN** each team card displays its members in a grid with exactly 3 columns.

#### Scenario: Displaying item image in team overview card
- **WHEN** the user views the "My Teams" page
- **THEN** each Pokémon slot in a team card displays its held item as an image next to the Pokémon sprite.

#### Scenario: Displaying item name tooltip in team overview
- **WHEN** the user hovers over an item image in the "My Teams" page
- **THEN** a tooltip or title attribute displays the full name of the item.
