## Why

The current team overview card uses a flexible wrap layout for team members, which can result in uneven rows if a team has fewer than 6 members or if the container width varies. A structured 2x3 grid layout provides a more consistent and professional appearance, clearly defining the slots for a full 6-Pokémon team.

## What Changes

- Update the team member container in `src/pages/Teams/index.tsx` to use a CSS grid layout instead of flex-wrap.
- Configure the grid to have exactly 3 columns and 2 rows.
- Ensure the layout remains responsive or centered within the card.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `team-management`: Update the team card layout requirements to specify a 2x3 grid structure for member slots.

## Impact

- `src/pages/Teams/index.tsx`: UI layout update.
