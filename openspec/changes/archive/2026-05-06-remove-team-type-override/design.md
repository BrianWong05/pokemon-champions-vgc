## Context

The "Manual Type Override" toggle in the Team Member editor is intended only for Damage Calculations. It is extraneous in the team building flow.

## Goals / Non-Goals

**Goals:**
- Improve clarity of the team member editor by removing unnecessary UI elements.

**Non-Goals:**
- None.

## Decisions

- **Fix**: Remove the type override UI controls from `PokemonConfigForm` when `hideTypeOverride` prop is `true` (and pass `true` from `TeamMemberEditorModal`).

## Risks / Trade-offs

- **[Risk] None.**
