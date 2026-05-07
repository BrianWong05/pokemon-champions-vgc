## Why

The current team detail view displays only basic information for team members. Users need to see detailed stat information, including base stats and invested Stat Points (SPs), to make informed team-building decisions without needing to open the editor.

## What Changes

- Update the team member cards in `TeamDetailPage` to display base stats and SP investment.
- Format the stats for quick readability, similar to the Damage Calculator's stat display.

## Capabilities

### New Capabilities
- `team-member-stats-display`: Visualizing base and invested stats on team member cards.

### Modified Capabilities

## Impact

- **UI Components**: Modifications to the team member card component in `TeamDetailPage` to add the stat visualization section.
- **Data**: No database changes needed, as the stat information is already present in the saved `PokemonConfig` stored in the team member configuration JSON.
