## 1. Metadata & Icons

- [x] 1.1 Move icons to `src/assets/icons/` and configure `@icons` alias in `vite.config.ts` and `tsconfig.json`.
- [x] 1.2 Create `src/utils/pokemon-types.ts` containing the `TYPE_METADATA` constant (colors and icon mapping).

## 2. Component Development

- [x] 2.1 Create `src/components/atoms/TypeIcon.tsx` that dynamically renders the correct SVG from `@icons/`.
- [x] 2.2 Create `src/components/atoms/TypeBadge.tsx` that combines the icon and type name with the correct background color.

## 3. Integration & Refactoring

- [x] 3.1 Refactor `src/components/organisms/PokemonDetailModal.tsx` to use the new `TypeBadge` component instead of hardcoded spans.

## 4. Verification

- [x] 4.1 Run `npm run type-check` to verify import and prop safety.
- [x] 4.2 Verify that all 18 types render with their correct icons and colors in the UI.

