# Landscape Delete Team

The landscape Teams view will show a danger-colored trash icon beside the existing Edit button for the selected team.

Clicking it will call a new `onDelete(id, name)` prop. `TeamsPage` will pass its existing `handleDeleteTeam`, preserving the current confirmation prompt and repository deletion behavior used by the portrait and desktop views.

A focused component test will verify that the action is rendered accessibly and receives the selected team's ID and name. No new dialog, state, or dependency is needed.
