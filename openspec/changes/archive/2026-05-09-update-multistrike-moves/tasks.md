## 1. Core Logic Update

- [x] 1.1 Define `MULTIHIT_MOVES_DATA` in `src/utils/damage.ts` with correct min/max limits
- [x] 1.2 Refactor `isMultiHitMove` to use the new data map
- [x] 1.3 Implement `getMultiHitLimits` helper function

## 2. UI Integration

- [x] 2.1 Update `PokemonPanel.tsx` to dynamically set `min` and `max` for the hits input
- [x] 2.2 Ensure the hit count state is clamped when a new move is selected

## 3. Verification

- [x] 3.1 Verify "Population Bomb" allows up to 10 hits
- [x] 3.2 Verify "Dragon Darts" is restricted to 2 hits
- [x] 3.3 Verify "Scale Shot" is restricted to 2-5 hits
