## Context

The project is being modernized to use Vite as the primary build tool and development server, with React and TypeScript. Tailwind CSS is being introduced for project-wide, utility-first styling. This design covers the configuration and integration of these tools into the existing project structure.

## Goals / Non-Goals

**Goals:**
-   Establish a fast, modern build and development environment with Vite.
-   Standardize on React with TypeScript for improved type safety.
-   Integrate Tailwind CSS for efficient styling.
-   Configure proper linting and type checking for the new setup.

**Non-Goals:**
-   Migrating all existing components to use Tailwind (initial setup focus).
-   Implementing a full design system (foundation only).
-   Setting up advanced CI/CD pipelines (initial local setup focus).

## Decisions

-   **Decision**: Use Vite with `@vitejs/plugin-react` for React support.
    -   **Rationale**: Vite is significantly faster than traditional bundlers like Webpack, especially for local development with HMR.
    -   **Alternatives**: Continue with standard Webpack or use another tool like Turbopack.
-   **Decision**: Use PostCSS for Tailwind CSS processing.
    -   **Rationale**: This is the standard and most flexible way to integrate Tailwind CSS with modern build tools like Vite.
    -   **Alternatives**: Tailwind's standalone CLI (less integrated with the build pipeline).
-   **Decision**: Configure absolute aliases (e.g., `@/`) in Vite and TypeScript.
    -   **Rationale**: This simplifies imports and makes the codebase more modular, as per the project's architectural mandates.
    -   **Alternatives**: Relative imports (harder to maintain in a large project).
-   **Decision**: Set the base URL to `/pokemon-champions-vgc/`.
    -   **Rationale**: This ensures that assets are correctly resolved when deploying the project to a GitHub Pages repository or a subdirectory of the same name.
    -   **Alternatives**: Root base URL `/` (only works for top-level domains).

## Risks / Trade-offs

-   [Risk] **Learning Curve** → **Mitigation**: Provide clear documentation and examples of Tailwind usage.
-   [Risk] **Potential Migration Issues** → **Mitigation**: Perform the setup in a separate change and verify everything thoroughly.
-   [Risk] **Compatibility with Existing Tools** → **Mitigation**: Check for existing build tools and ensure a clean transition.
