## Context

The `PokemonConfigForm` component fails at runtime in the Damage Calculator because it references `TYPE_IDS` without importing it, causing a `ReferenceError` when the "Manual Type Override" toggle is clicked.

## Goals / Non-Goals

**Goals:**
- Fix the `ReferenceError` by importing `TYPE_IDS`.

**Non-Goals:**
- None.

## Decisions

- **Fix**: Add the missing import `import { TYPE_IDS } from '@/utils/pokemon-types';` to `src/components/organisms/PokemonConfigForm.tsx`.

## Risks / Trade-offs

- **[Risk] None.**
