## 1. Setup and Layout

- [x] 1.1 Create a `Layout` component (e.g., `src/components/templates/Layout.tsx` or similar) that includes a navigation header with links to `/`, `/ev-converter`, and `/speed-tiers`.
- [x] 1.2 Create a `NotFound` component to act as the 404 fallback.
- [x] 1.3 Update `src/main.tsx` to wrap the application in a `<BrowserRouter>`.

## 2. Refactoring and Routing Implementation

- [x] 2.1 Refactor `src/App.tsx` to remove direct rendering of the different tools and instead define `<Routes>` and `<Route>` entries.
- [x] 2.2 Configure the route for `/` to render the `DamageCalculator` component.
- [x] 2.3 Configure the route for `/ev-converter` to render the `EvSpConverter` component.
- [x] 2.4 Configure the route for `/speed-tiers` to render the `SpeedTierList` component.
- [x] 2.5 Configure the fallback route (`*`) to render the `NotFound` component.