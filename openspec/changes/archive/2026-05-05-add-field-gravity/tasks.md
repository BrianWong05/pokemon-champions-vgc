## 1. State Management (src/pages/DamageCalculator/index.tsx)

- [x] 1.1 Add `isGravity: boolean` to `CalcState`.
- [x] 1.2 Add `TOGGLE_GRAVITY` action to `CalcAction` and handle it in `calcReducer`.
- [x] 1.3 Initialize `isGravity: false` in `initialState`.

## 2. Core Logic (src/utils/damage.ts)

- [x] 2.1 Update `mapToSmogonField` to accept `isGravity: boolean`.
- [x] 2.2 Map `isGravity` to the Smogon `Field` object constructor.
- [x] 2.3 Pass `state.isGravity` from `computeResults` in `DamageCalculator/index.tsx` to `mapToSmogonField`.

## 3. UI Implementation (src/components/templates/DamageCalculatorTemplate.tsx)

- [x] 3.1 Add `isGravity` and `onToggleGravity` to `DamageCalculatorTemplateProps`.
- [x] 3.2 Render the "Gravity" toggle button in the field settings panel (styled as an indigo toggle).
- [x] 3.3 Pass `isGravity` props and dispatcher from `DamageCalculator/index.tsx` to the template.
- [x] 3.4 Update `useMemo` dependencies for calculation results to include `state.isGravity`.

## 4. Verification

- [x] 4.1 Verify that Earthquake deals damage to Flying-type Pokémon when Gravity is active.
- [x] 4.2 Verify that Spikes damage (if applicable in engine) or grounding effects are reflected.
- [x] 4.3 Verify that Gravity can be toggled independently of weather and terrain.
