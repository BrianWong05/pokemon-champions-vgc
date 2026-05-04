## Context

The current application utilizes a custom-built damage calculation engine (`damage-calculation-logic`). Maintaining parity with official mechanics (moves, abilities, items, stat stages, weather) is complex and error-prone. The `@smogon/calc` package provides an industry-standard, fully tested engine maintained by the Pokemon Showdown community.

## Goals / Non-Goals

**Goals:**
- Replace the custom damage calculation engine with `@smogon/calc`.
- Refactor the existing state and utility functions to pass the correct arguments to `@smogon/calc`'s `calculate` function.
- Maintain existing feature functionality (e.g., abilities, weather, items, EVs/IVs).

**Non-Goals:**
- Overhauling the UI of the application.
- Adding features that `@smogon/calc` supports but our application doesn't currently use or expose in the UI.

## Decisions

- **Dependency Addition:** We will add `@smogon/calc` via `npm install @smogon/calc`.
- **Adapter Pattern:** Instead of exposing `@smogon/calc` directly to UI components, we will adapt our current `calculateDamage` utility function to wrap the `@smogon/calc` API. This isolates the external dependency and minimizes changes required in the React components.
  - *Alternative considered:* Direct integration in components. Rejected because it would couple the UI too tightly to the Smogon API structure, making future changes harder.
- **State Mapping:** The existing application state (Pokemon types, abilities, moves, EVs) needs to be mapped into `@smogon/calc`'s `Pokemon`, `Move`, and `Field` objects.

## Risks / Trade-offs

- [Risk] Mismatched data formats between our application and `@smogon/calc` (e.g., string literals vs enums).
  → Mitigation: Create a robust mapping layer and rely on TypeScript to catch type errors.
- [Risk] `@smogon/calc` might bundle a large amount of data, impacting bundle size.
  → Mitigation: Evaluate bundle size post-integration and consider lazy loading if necessary, though it is usually acceptable for a dedicated calculator app.
