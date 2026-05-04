## 1. State Management (src/pages/DamageCalculator/index.tsx)

- [x] 1.1 Update `CalcState` interface to include `terrain: 'None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic'`.
- [x] 1.2 Add `SET_TERRAIN` action type to `CalcAction` and handle it in `calcReducer`.
- [x] 1.3 Update `initialState` to set `terrain: 'None'` by default.

## 2. Core Logic Updates (src/utils/damage.ts)

- [x] 2.1 Update `mapToSmogonField` signature to accept `terrain: string`.
- [x] 2.2 Implement the mapping of the `terrain` state to the Smogon `Field` constructor (handling 'None' -> undefined).
- [x] 2.3 Ensure `computeResults` in `DamageCalculator/index.tsx` passes `state.terrain` to `mapToSmogonField`.

## 3. UI Implementation

- [x] 3.1 Update `DamageCalculatorTemplateProps` in `src/components/templates/DamageCalculatorTemplate.tsx` to include `activeTerrain` and `onTerrainChange`.
- [x] 3.2 Implement the terrain selection UI in `DamageCalculatorTemplate.tsx` with appropriate button styling.
- [x] 3.3 Pass terrain props from `DamageCalculator/index.tsx` to the template and update `useMemo` dependencies for results.

## 4. Verification

- [x] 4.1 Verify that Electric moves deal increased damage (1.3x) in Electric Terrain.
- [x] 4.2 Verify that Earthquake deals reduced damage (0.5x) in Grassy Terrain.
- [x] 4.3 Verify that Dragon moves deal reduced damage (0.5x) in Misty Terrain.
- [x] 4.4 Verify that Psychic moves deal increased damage (1.3x) in Psychic Terrain.
