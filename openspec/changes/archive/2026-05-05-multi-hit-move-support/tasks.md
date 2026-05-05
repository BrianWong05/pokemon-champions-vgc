## 1. State Management Updates

- [x] 1.1 Add `movesHits: number[]` to the state in `DamageCalculator/index.tsx`.
- [x] 1.2 Initialize `movesHits` with default values (usually 1 or 3 for multi-hit).
- [x] 1.3 Add handler `onUpdateMoveHits` to update the state.

## 2. Calculation Engine Integration

- [x] 2.1 Update `mapToSmogonMove` in `src/utils/damage.ts` to accept and apply the `hits` property.
- [x] 2.2 Verify that `Generations.get(9).moves.get(identifier)` correctly identifies multi-hit moves.

## 3. UI Implementation

- [x] 3.1 Implement a helper to detect if a move is multi-hit in `PokemonPanel.tsx`.
- [x] 3.2 Add the "Hits" numeric input to the move display row in `PokemonPanel.tsx`.
- [x] 3.3 Style the input to match the existing compact dashboard aesthetic.
