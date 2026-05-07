## Context

Mega Pokémon abilities are currently not correctly synced or displayed when a user builds a team, as the team builder often defaults to the base Pokémon's ability or fails to fetch the correct Mega ability.

## Goals / Non-Goals

**Goals:**
- Correctly resolve and display the ability for Mega Pokémon in the team detail view and editor.

**Non-Goals:**
- None.

## Decisions

- **Investigation**: Trace the `PokemonSearchSelect` and `TeamMemberEditorModal` data flow to identify where ability selection is constrained.
- **Fix**: Update the ability fetching logic in `usePokemonEditor` to correctly account for Mega forms.

## Risks / Trade-offs

- **[Risk] Data Source** → Ability data may be tied to the base Pokémon ID in the database. Mitigation: Use the Pokémon form ID if available or fetch abilities specifically by the form ID.
