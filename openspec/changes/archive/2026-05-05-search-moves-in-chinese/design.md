## Context

The application stores Pokémon move data in multiple languages, including English (`name_en`) and Chinese (`name_zh`). While the search logic already includes `nameZh`, the UI only displays the English names. Users have requested the ability to see and search for moves in Chinese to improve usability for Chinese-speaking audiences.

## Goals / Non-Goals

**Goals:**
- Display Chinese move names alongside English names in search results.
- Display Chinese move names in the selected move slots in the `PokemonPanel`.
- Display Chinese move names in the `ResultsPanel` damage assessment list.
- Ensure the application remains responsive and the search remains efficient.

**Non-Goals:**
- We are not implementing a full localization system for the entire app yet.
- We are not adding support for other languages (e.g., Japanese) in this specific change, although the patterns should be extensible.

## Decisions

- **UI Layout for Search**: In `MoveSearchSelect`, we will show the English name as the primary title and the Chinese name as a secondary subtitle (or vice versa, depending on which feels more natural). Given the current English-primary UI, showing Chinese as a subtitle is safer.
- **UI Layout for Selected Moves**: In `PokemonPanel`, we will show the Chinese name next to or below the English name in the move slot.
- **Data Plumbing**: We will update the `DamageResult` interface to include `moveNameZh`. The `computeResults` function in `DamageCalculatorPage` will be updated to extract this from the `MoveData` objects.

## Risks / Trade-offs

- [Risk] Long Chinese move names might cause layout overflow in the move slots.
  - *Mitigation*: Use `truncate` and ensure flexible layout containers.
- [Risk] Database might have missing `name_zh` for some moves.
  - *Mitigation*: Fallback to English name if Chinese is null.
