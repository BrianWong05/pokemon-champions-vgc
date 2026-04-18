## Context

The project is a React application with a nested directory structure in `src/`. Currently, many files use relative imports (`import { ... } from '../../utils/stats'`), which are brittle and difficult to read. The project already has the `@` alias configured to point to the `src` directory.

## Goals / Non-Goals

**Goals:**
- Convert all `../` imports to `@/` imports.
- Maintain project build and type-check status.
- Apply changes project-wide in `src/`.

**Non-Goals:**
- Changing `./` (sibling) imports (optional, but focusing on `../`).
- Introducing new aliases.
- Refactoring the actual directory structure.

## Decisions

- **Use of Alias**: We will use the existing `@` alias which points to `src/`.
- **Search and Replace**: We will use a systematic search and replace approach (or script) to identify relative imports and calculate their absolute equivalent based on their position relative to `src/`.
- **Validation**: After the conversion, we will run `npm run type-check` (or `tsc --noEmit`) to ensure no imports were broken.

## Risks / Trade-offs

- **[Risk]** Large number of file changes → **[Mitigation]** Use the generalist agent to perform batch refactoring safely and verify with TypeScript.
- **[Risk]** Broken imports due to incorrect calculation → **[Mitigation]** Double-check the depth of each relative import before replacing.
