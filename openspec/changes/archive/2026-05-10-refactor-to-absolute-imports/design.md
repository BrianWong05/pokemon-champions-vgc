## Context

The codebase currently uses a mix of relative and absolute imports. While path aliases are defined, they are not consistently applied or enforced. This design outlines the migration process to standardize all internal imports to absolute paths.

## Goals / Non-Goals

**Goals:**
- Migrate all relative imports in `src/` to `@/` aliases.
- Establish automated linting enforcement for absolute imports.
- Update documentation.

**Non-Goals:**
- Refactoring the internal directory structure itself.

## Decisions

- **Tooling:** Use `eslint-plugin-import` for enforcement.
- **Migration Strategy:** Systematic replacement (using `sed` or automated refactoring) directory by directory, starting from the leaf components, to ensure build consistency.

## Risks / Trade-offs

- [Risk] Broken builds during migration → Mitigation: Ensure `npm run type-check` passes after each batch replacement.
- [Risk] Incorrect path mapping → Mitigation: Validate against `tsconfig.json` paths mapping.
