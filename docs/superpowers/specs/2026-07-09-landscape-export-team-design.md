# Landscape Export Team

The landscape Teams view will show a secondary **Export team** button immediately before **Scan Pokémon** for the selected team.

Clicking it will call a new `onExport(team)` prop. `TeamsPage` will pass `setExportTeam`, reusing the existing `TeamExportModal` and Showdown-format export behavior already used by the portrait and desktop views.

A focused component test will verify that the accessible action receives the selected team. No new modal, export formatter, state, or dependency is needed.
