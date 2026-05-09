## Context
The project uses a mix of Atomic Design and Feature folders, but the current implementation shows signs of "utility bloat," unclear component ownership, and inconsistent hook management. This design proposes shifting toward a more Domain-Driven approach.

## Goals / Non-Goals

**Goals:**
- Improve modularity by re-grouping logic by domain (e.g., `features/damage-calc`, `features/pokemon`).
- Clearly separate complex UI molecules from simple atoms.
- Clean up the `utils` and `hooks` folders.

**Non-Goals:**
- Changing the existing UI library or state management.

## Decisions

- **Domain-Driven Grouping:** Move feature-specific logic out of top-level `hooks/` and `utils/` into feature folders.
- **Atomic Cleanup:** Move items like `StatSlider` and `StatInput` into `molecules` as they contain business logic.
- **Repo Pattern:** Retain the repository pattern for its testing benefits (decoupling DB access from UI), but standardize the interface.

## Risks / Trade-offs

- [Risk] Massive import refactoring → Mitigation: Use absolute imports (`@/`) to simplify file moves.
- [Risk] Regression in existing features → Mitigation: Ensure unit tests cover utilities and logic before moves.
