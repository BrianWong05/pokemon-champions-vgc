## ADDED Requirements

### Requirement: Vite configuration
The system SHALL use Vite as the primary build tool and development server, configured with the `@vitejs/plugin-react` plugin for React support.

#### Scenario: Running the development server
- **WHEN** the user executes `npm run dev`
- **THEN** Vite SHALL start a development server with Hot Module Replacement (HMR) enabled.

#### Scenario: Building for production
- **WHEN** the user executes `npm run build`
- **THEN** Vite SHALL generate an optimized production build in the `dist` directory with base URL set to `/pokemon-champions-vgc/`.

### Requirement: TypeScript integration
The system SHALL be configured to use TypeScript for all project files, ensuring type safety and modern language features.

#### Scenario: Type checking
- **WHEN** the user executes `npm run type-check` (or `tsc --noEmit`)
- **THEN** the TypeScript compiler SHALL validate all `.ts` and `.tsx` files for type correctness.
