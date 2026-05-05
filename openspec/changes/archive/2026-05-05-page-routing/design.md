## Context

The VGC application currently renders all tools within a single view or manually toggles visibility. As the application grows to include more specialized tools (Damage Calculator, EV/SP Converter, Speed Tier List), this architecture becomes difficult to scale, negatively impacting usability and maintainability.

## Goals / Non-Goals

**Goals:**
- Implement client-side routing using `react-router-dom`.
- Establish distinct URLs for the Damage Calculator (`/`), EV/SP Converter (`/ev-converter`), and Speed Tier List (`/speed-tiers`).
- Provide a persistent navigation layout that allows users to seamlessly switch between tools.
- Implement a 404 Catch-All route.

**Non-Goals:**
- Server-side rendering (SSR) or data fetching optimizations via loaders (for now).
- State persistence across route changes (though it may happen organically if state is lifted, it's not a strict goal of this initial routing pass).

## Decisions

- **Routing Library**: `react-router-dom` v7 is already installed and is the industry standard for React SPAs.
- **Router Implementation**: We will use `<BrowserRouter>` wrapping the app inside `main.tsx`. The `App` component will define the `<Routes>`.
- **Layout Structure**: We will introduce a main Navigation bar (likely at the top) that is persistent across all routes.
- **Component Restructuring**: We need to ensure that the current main view components are easily ploggable into `<Route>` elements.

## Risks / Trade-offs

- **Risk**: Loss of component state when navigating between tools if state is kept locally within the tool components.
  - **Mitigation**: Acknowledge this behavior for now. If persistent state is needed, we will plan a follow-up task to use context or a global store.
- **Risk**: Broken existing URLs if any were hardcoded (unlikely as it was a single page).
  - **Mitigation**: Ensure default route (`/`) maps to the most common tool (Damage Calculator).