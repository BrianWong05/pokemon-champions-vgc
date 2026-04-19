## 1. Setup & Logic

- [x] 1.1 Create `src/utils/damage.ts` and implement `calculateHP`, `calculateStat`, and the damage formula.
- [x] 1.2 Write simple unit tests or validation scripts for the math logic.

## 2. Atom & Molecule Development

- [x] 2.1 Create reusable `Slider` and `NumberInput` atoms in `src/components/atoms/`.
- [x] 2.2 Create `StatControlGroup` molecule in `src/components/molecules/`.

## 3. Organism & Template Development

- [x] 3.1 Create `AttackerPanel` and `DefenderPanel` organisms.
- [x] 3.2 Create `ResultsPanel` with the visual HP bar.
- [x] 3.3 Create the `DamageCalculatorTemplate` in `src/components/templates/`.

## 4. Page & Routing

- [x] 4.1 Create `src/pages/DamageCalculator/index.tsx` and implement the `useReducer` state logic.
- [x] 4.2 Update `src/App.tsx` to add the `/calc` route.

## 5. Verification

- [x] 5.1 Verify damage ranges against the scenarios defined in `specs/damage-calculation-logic/spec.md`.
- [x] 5.2 Ensure responsive layout works on mobile and desktop.
