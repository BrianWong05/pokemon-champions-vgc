# Pokemon Champions VGC

This project utilizes absolute imports with the `@/` alias for better maintainability and cleaner code structure.

## Import Standard
- Use absolute imports (e.g., `import { Component } from '@/components/Component'`) instead of relative imports (`../`).
- Configuration is handled in `tsconfig.json` and `vite.config.ts`.
- Enforced by ESLint via `eslint-plugin-import`.
