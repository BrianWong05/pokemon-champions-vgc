## Why

Mega Pokémon are not displaying their correct abilities in the team builder. When a Pokémon mega-evolves, its ability changes, but the team detail view is failing to show this updated ability.

## What Changes

- Investigate how abilities for Mega Pokémon are stored and fetched.
- Ensure that the `TeamDetailPage` and the editor modal correctly pull and display the ability specific to the Mega form, not just the base form's ability.

## Capabilities

### New Capabilities

### Modified Capabilities
- `team-management`: Fix ability display requirements for Mega Pokémon.

## Impact

- **Logic**: Update ability fetching/resolution logic for Pokémon in teams.
- **UI**: Team member cards and the edit modal will correctly render the Mega Pokémon's ability.
