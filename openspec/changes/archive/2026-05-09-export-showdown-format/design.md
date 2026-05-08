## Context

Currently, the application allows users to build teams, but lacks a mechanism to share those teams in standard formats. The Pokemon Showdown format is the industry standard for text-based Pokemon team sharing.

## Goals / Non-Goals

**Goals:**
- Provide a clear "Export to Showdown" action in the UI.
- Generate a standards-compliant text representation of the team configuration.
- Copy the generated text to the user's clipboard for easy sharing.

**Non-Goals:**
- Allowing direct import of Showdown formats (this is a future consideration).
- Integrating with external Showdown APIs.

## Decisions

- **Formatter Strategy:** Implement a modular `showdown-formatter.ts` utility that accepts the `Team` state object and returns the standard text block.
- **UI Integration:** Place the export trigger in the Team Builder header or actions menu, keeping the interaction simple (click → copy).

## Risks / Trade-offs

- **Format Changes:** Pokemon Showdown format can change over time.
    - [Risk] Outdated format parsing.
    - [Mitigation] Keep the formatter logic isolated and easily testable.
- **Incomplete Team Data:** If the team builder is missing fields needed for the export (e.g., specific IVs/EVs/Held Items), the export might be incomplete.
    - [Mitigation] Explicitly define mandatory team fields in the spec.
