## Context
The user wants to convert between SP and EV stat systems. This requires a calculator utility and UI integration.

## Goals / Non-Goals

**Goals:**
- Provide SP <-> EV conversion logic.
- Integrate conversion into the Damage Calculator Pokémon panel.

## Decisions

- **Logic:** Add `convertSpToEv` and `convertEvToSp` functions in a new utility.
- **UI:** Add a toggle/converter section within the Pokémon Config Form.

## Risks / Trade-offs

- [Risk] Math inaccuracies → Mitigation: Unit tests for conversion formulas.
