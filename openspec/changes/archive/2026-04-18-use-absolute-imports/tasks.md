## 1. Audit and Refactor

- [x] 1.1 Identify all files in `src/` using relative `../` imports.
- [x] 1.2 Convert relative `../` imports to absolute `@/` imports.
- [x] 1.3 Ensure `src/db/index.ts` correctly uses `@/db/schema` instead of `./schema` (if applicable/preferred).

## 2. Validation

- [x] 2.1 Run `npm run type-check` to verify import integrity.
- [x] 2.2 Verify the application builds successfully with `npm run build`.
