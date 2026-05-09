## Codebase Audit Report: Pokémon VGC Damage Calculator

### 1. Flagged Files

| File | Lines | primary Concern |
| :--- | :--- | :--- |
| `src/pages/DamageCalculator/index.tsx` | 863 | Monolithic calculator state, business logic, and UI rendering. |
| `src/pages/TeamDetail/index.tsx` | 638 | High complexity in team member management and UI layout. |
| `src/hooks/usePokemonEditor.ts` | 461 | Tight coupling of editor state, business rules, and validation logic. |
| `src/utils/damage.ts` | 435 | Pure logic, but excessively complex; needs better modularization for maintainability. |
| `src/components/organisms/PokemonConfigForm.tsx` | 363 | Overloaded form component with multiple responsibilities. |

---

### 2. The "Smell"

*   **`src/pages/DamageCalculator/index.tsx`**: This is a classic "God Component." It handles orchestrating data fetching, complex damage state management, UI rendering for panels, and event handling. It violates SRP by knowing too much about the internal implementation of child panels.
*   **`src/pages/TeamDetail/index.tsx`**: Mixing route-level logic (params, data fetching) with complex team editing operations and team member rendering.
*   **`src/hooks/usePokemonEditor.ts`**: Currently acting as a manager for every aspect of a Pokémon configuration. It should be split into smaller, domain-specific hooks (e.g., `useStats`, `useAbility`, `useMoveSelection`).
*   **`src/utils/damage.ts`**: While not UI, it's a massive procedural file that makes testing specific components of the damage math difficult.

---

### 3. Refactoring Blueprint: `src/pages/DamageCalculator/index.tsx`

This component is the highest priority for refactoring.

#### Architectural Plan
*   **Custom Hook Extraction**: Create a dedicated `useCalculatorState` or context provider to encapsulate the state.
*   **Component Splitting**:
    *   **Organisms**: Create specialized containers like `CalculatorHeader`, `DefenderPanel`, `AttackerPanel`, `MoveSetPanel`, and `ResultOverview`.
    *   **Molecules**: Extract frequently repeated patterns (e.g., specific form controls) into reusable molecules.
*   **Data Flow**: Utilize React Context for global calculator state to minimize prop drilling.

#### Proposed File Structure
```
src/pages/DamageCalculator/
├── index.tsx          (Main container: orchestration only)
├── components/        (Local sub-components)
│   ├── AttackerPanel/
│   ├── DefenderPanel/
│   └── ResultSummary/
└── hooks/             (Local calculator hooks)
    ├── useDamageCalc.ts
    └── useCalculatorState.ts
```
