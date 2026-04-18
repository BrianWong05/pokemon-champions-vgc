## Why

The codebase currently uses relative imports (`../`), which can lead to deep, fragile paths that are difficult to maintain and refactor. Standardizing on absolute imports using the `@` alias (configured in `vite.config.ts` and `tsconfig.json`) will improve readability, simplify refactoring, and align with React architectural best practices.

## What Changes

- Replace all relative imports (`../`) with absolute imports using the `@` alias in the `src` directory.
- Ensure all source files follow the absolute import convention.

## Capabilities

### New Capabilities
- `absolute-import-standard`: A project-wide standard to use the `@` alias for all imports outside of the current directory.

### Modified Capabilities
- `development-environment`: Update the development environment specification to enforce the use of absolute imports.

## Impact

- All files in `src/` will have their import statements modified.
- `tsconfig.json` and `vite.config.ts` (already configured with `@` alias, but will be verified).
