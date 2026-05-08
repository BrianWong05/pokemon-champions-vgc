## Context

The current nature selector in `PokemonConfigForm` shows only the nature name. Users have to recall or check elsewhere to know which stat is boosted or hindered.

## Goals / Non-Goals

**Goals:**
- Provide clear visual feedback for stat modifiers (e.g., "(+Atk, -SpA)").
- Update the UI to include these modifiers dynamically based on the selected nature.

**Non-Goals:**
- None.

## Decisions

- **Logic:** Reuse the existing nature stat data structure (`NATURES` from `@/utils/pokemon-presets` or similar logic).
- **UI:** Add a small text indicator next to the nature dropdown that updates whenever the nature changes. Format as `(+<Stat>, -<Stat>)`.

## Risks / Trade-offs

- **UI clutter:** Adding extra text might clutter the form.
    - [Risk] Overcrowding the nature selector row.
    - [Mitigation] Keep the display compact and use a subtle color scheme (e.g., green for boost, red for hindrance).
