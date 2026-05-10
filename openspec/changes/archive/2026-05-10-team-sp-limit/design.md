## Context
The application needs to distinguish between "Team Edit" mode (where 66 SP limit applies) and "Damage Calculator" mode (where it does not).

## Goals / Non-Goals

**Goals:**
- Pass an `enforceSpLimit` prop to components.
- Conditionally apply the limit in `StatGrid`.

## Decisions

- **UI:** Pass `enforceSpLimit` from `TeamMemberEditorModal` and `PokemonPanel`.
- **Validation:** Conditionally style the total SP display and perhaps block saving if the limit is exceeded in team mode.

## Risks / Trade-offs

- [Risk] Missing enforcement points → Mitigation: Ensure all entry points for team editing correctly pass the new flag.
