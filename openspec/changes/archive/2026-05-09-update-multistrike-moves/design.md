## Context

The current `isMultiHitMove` function uses a simple regex and Smogon's internal metadata. However, the regex is incomplete, and Smogon's internal metadata isn't always easily accessible or descriptive enough for direct UI limits enforcement.

## Goals / Non-Goals

**Goals:**
- Centralize multi-strike move metadata (names, min hits, max hits).
- Enforce these limits in the Damage Calculator UI.
- Support special cases like Population Bomb (10 hits) and Surging Strikes (3 hits).

**Non-Goals:**
- Handling "Beat Up" party-based logic (will treat as variable for now or handle as a separate task).

## Decisions

- **Metadata Map:** Define a constant `MULTIHIT_MOVES_DATA` in `src/utils/damage.ts` that maps move names (English) to their hit constraints.
- **UI Update:** In `PokemonPanel.tsx`, when rendering the `hits` input, dynamically set the `min` and `max` attributes of the numeric input based on the selected move's metadata.
- **Regex Replacement:** The current regex in `isMultiHitMove` will be replaced by a lookup in the new metadata map for better accuracy and maintainability.

## Risks / Trade-offs

- **Manual Maintenance:** New multi-strike moves added in future DLCs/Generations will need manual entry.
    - [Risk] Metadata becoming stale.
    - [Mitigation] Keep the map organized and reference reputable sources (like 52Poke or Serebii).
