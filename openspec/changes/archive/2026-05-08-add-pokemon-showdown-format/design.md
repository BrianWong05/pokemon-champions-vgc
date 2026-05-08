## Context

The damage calculator currently requires manual entry of all Pokémon stats, moves, and items. This is inefficient for users who already have their teams built in Pokémon Showdown.

## Goals / Non-Goals

**Goals:**
- Provide a robust parser for the standard Pokémon Showdown export format.
- Integrate the parser into the Attacker and Defender panels.
- Handle edge cases like nicknames, gender, and missing optional fields.
- Support batch state updates to ensure all fields are updated in one go.

**Non-Goals:**
- Support for importing entire teams (6 Pokémon) at once into the damage calculator (it only has 2 slots).
- Support for non-standard or legacy Showdown formats.

## Decisions

### 1. Custom Parser Implementation
**Decision**: Implement a custom regex-based parser in `src/utils/showdown-parser.ts` instead of adding a new dependency.
**Rationale**: The Showdown format is stable and relatively simple to parse. Adding a full library like `@smogon/sets` might be overkill for just extracting basic fields, especially since we have custom stat mechanics (`sp` instead of `ev`).
**Alternatives**:
- `@smogon/sets`: Provides comprehensive parsing but might not align perfectly with our custom `sp` system and adds bundle size.

### 2. Inverse Stat Mapping
**Decision**: Use the formula `sp = ev === 0 ? 0 : (ev + 4) / 8` to convert standard EVs back into the internal `sp` representation.
**Rationale**: This ensures that imported sets behave exactly like manually entered ones in our custom engine.

### 3. UI Integration
**Decision**: Add an "Import" button next to the Pokémon selection/name field. Clicking it opens a small overlay or replaces the selection UI with a textarea.
**Rationale**: Keeps the UI clean while making the feature easily discoverable.

## Risks / Trade-offs

- **[Risk]** Showdown format variations (e.g. different spacing or capitalization).
  - **Mitigation**: Use case-insensitive regex and flexible whitespace matching.
- **[Risk]** Inconsistent Species Names (e.g. "Urshifu-Rapid-Strike" vs "Urshifu-RS").
  - **Mitigation**: Implement a basic name normalization mapping or rely on the existing searchable selection logic to resolve names.
