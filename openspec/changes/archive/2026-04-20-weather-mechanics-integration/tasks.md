## 1. Logic Implementation (src/utils/damage.ts)

- [x] 1.1 Implement `getWeatherDamageModifier(weather, moveType)`.
- [x] 1.2 Update `getModifiedMoveType` to handle "Weather Ball".
- [x] 1.3 Update `getBasePowerModifier` to handle "Weather Ball" power boost.
- [x] 1.4 Update `getStatModifier` to include Rock-type Sp. Def boost in Sand and Ice-type Defense boost in Snow.

## 2. Component Refactoring (src/pages/DamageCalculator/index.tsx)

- [x] 2.1 Add `activeWeather` state to `DamageCalculatorPage`.
- [x] 2.2 Add "Field Conditions" UI section with weather toggles.
- [x] 2.3 Integrate `activeWeather` and `getWeatherDamageModifier` into the `computeResults` pipeline.
- [x] 2.4 Pass Pokémon types to `getStatModifier` to trigger weather-based stat buffs.

## 3. Verification

- [x] 3.1 Verify "Weather Ball" type and power changes in all weather conditions.
- [x] 3.2 Verify Fire/Water move damage multipliers in Sun/Rain.
- [x] 3.3 Verify Sandstorm Sp. Def boost for Rock-types.
- [x] 3.4 Verify Snow Defense boost for Ice-types.
