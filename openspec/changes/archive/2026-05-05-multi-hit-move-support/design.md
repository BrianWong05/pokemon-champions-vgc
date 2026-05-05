## Context

Certain moves in Pokémon can strike multiple times in a single turn. To accurately calculate the damage for these moves, the user needs to specify how many times the move hits (e.g., 2, 3, 4, or 5).

## Goals / Non-Goals

**Goals:**
- Automatically detect if a selected move is a multi-hit move.
- Provide a "Hits" selector in the `PokemonPanel` for multi-hit moves.
- Pass the selected number of hits to the damage calculation engine.

**Non-Goals:**
- Automatically determining the number of hits based on probabilistic distribution (e.g., Skill Link). The user will set it manually.

## Decisions

### 1. Multi-hit Detection
**Decision:** Use the `@smogon/calc` data to check if a move has a `multihit` property.
**Rationale:** This ensures consistency with the calculation engine and avoids hardcoding a move list.

### 2. UI Integration
**Decision:** Add a small numeric input or a select dropdown in the move slot row, adjacent to the "PWR" display, only when a multi-hit move is active.
**Rationale:** This minimizes UI clutter for single-hit moves while providing the control where it's contextually relevant.

### 3. State Management
**Decision:** Add a `movesHits: number[]` array to the `DamageCalculator` state, similar to `movesForceCrit`.
**Rationale:** This keeps the move data (from the database) pure and stores user overrides separately.

## Risks / Trade-offs

- **[Risk]** Some moves have variable hit counts (e.g., Triple Axel, Population Bomb) that might require special handling.
  → **Mitigation**: Start with basic hit count support (2-10) which covers most cases including Population Bomb.
