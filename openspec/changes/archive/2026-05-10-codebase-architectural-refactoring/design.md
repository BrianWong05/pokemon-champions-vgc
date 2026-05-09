## Context

The current `DamageCalculator` component is a large, monolithic "God Component" that manages all calculator state, complex damage calculation logic, and UI rendering. This leads to poor maintainability, difficulty in testing, and violation of the Single Responsibility Principle.

## Goals / Non-Goals

**Goals:**
- Refactor the `DamageCalculator` into a modular architecture.
- Decouple damage math logic from the React UI.
- Use Atomic Design to break UI into smaller, reusable components.

**Non-Goals:**
- Adding new calculator features.
- Changing the existing damage formula output.

## Decisions

### 1. State Management
We will move from localized state in the page component to a dedicated custom hook (`useCalculatorState`) to orchestrate state, which can be shared via Context if drill-depth becomes problematic.

### 2. Component Decomposition
- **Containers (Organisms)**: Create `AttackerPanel`, `DefenderPanel`, and `ResultSummary` organisms.
- **Atomic Components**: Extract common form fields into atomic components (e.g., `StatInput`, `AbilitySelect`).

### 3. Logic Decoupling
Move complex math out of the component and into `src/utils/damage-calc/`. Each calculation sub-routine (e.g., base damage, modifier calculation) will be a testable, pure function.

## Risks / Trade-offs

- **[Risk]** Breaking state consistency during refactoring. → **[Mitigation]** Write unit tests for the new `useCalculatorState` hook before removing existing logic.
- **[Risk]** Increased complexity of the file structure. → **[Mitigation]** Stick to strict feature-based grouping as defined in GEMINI.md.
