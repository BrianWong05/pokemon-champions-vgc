## Why
The project has grown organically, leading to "utility bloat," ambiguous component boundaries, and inconsistent hook placement. An architectural review is necessary to ensure the project remains scalable.

## What Changes
- Reorganize hooks by domain rather than hierarchy.
- Re-classify "atoms" that are actually complex molecules.
- Consolidate utility bloat into domain-specific modules.
- Refine the Database repository pattern to justify its existence or simplify it.

## Capabilities

### New Capabilities
- `domain-driven-refactoring`: Moving towards a domain-centric architecture by regrouping hooks, utilities, and services.
- `component-boundary-cleanup`: Correcting Atomic Design violations.

### Modified Capabilities
- 

## Impact
- Files will be moved across the `src/` directory.
- Import statements in affected files will need updates.
- Improved maintainability and logical grouping.
