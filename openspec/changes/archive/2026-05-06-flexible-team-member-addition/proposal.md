## Why

The current team management system only allows adding Pokémon from pre-defined presets. Users need the flexibility to create custom Pokémon configurations directly within the team builder, adjusting stats (SPs), moves, items, and abilities just like they do in the damage calculator.

## What Changes

- Enhance the "Add Pokémon" flow in the Team Detail page to allow searching for any Pokémon, not just presets.
- Implement a detailed editor for team members that allows modifying:
    - Item
    - Ability
    - Nature
    - Effort Values / Stat Points (SPs)
    - Moves (up to 4)
- Allow editing existing team members with the same detailed interface.

## Capabilities

### New Capabilities
- `team-member-editor`: Interface and logic for detailed configuration of a Pokémon within a team.

### Modified Capabilities
- `team-management`: Update the "Adding Members" and "Editing Members" requirements to include detailed configuration instead of just preset selection.

## Impact

- **UI Components**: Significant reuse or refactoring of the configuration components from `DamageCalculator` to be used in the `TeamDetail` context.
- **State Management**: Updating the `useTeams` hook or similar logic to handle complex configuration objects being passed for updates.
- **UX**: Improved workflow for competitive team building.
