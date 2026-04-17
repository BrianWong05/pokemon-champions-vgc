## Context

The application currently lacks a way to visualize competitive speed benchmarks in the Regulation M-A format using the project's unique "SP" system. This design focuses on creating a robust, reusable stat calculation utility and a high-performance, responsive page for speed tier analysis.

## Goals / Non-Goals

**Goals:**
- Provide accurate speed calculations for four key benchmarks (Max+, Max, Uninvested, Min-).
- Create a clean, responsive UI that groups Pokémon by their Base Speed.
- Ensure easy integration with existing routing and styling conventions.

**Non-Goals:**
- Implementing a full team builder or EV slider interface.
- Real-time database updates for this specific view (using formatted static/mock data for the initial release).

## Decisions

- **Stat Calculation Utility**: A standalone `src/utils/stats.ts` file will export the `calculateSpeedStats` function. This keeps the math separate from the presentation and allows for testing.
- **Data Structure**: A `Pokemon` interface will be defined with `id`, `name`, and `baseSpeed`.
- **Grouping Strategy**: Data will be processed into a Map or Record where keys are `baseSpeed` integers, sorted in descending order to prioritize faster threats.
- **UI Layout**: Each "Speed Tier" (Base Speed) will have a header, followed by a list of Pokémon. Each Pokémon entry will use a 4-column Tailwind grid for the speed benchmarks to ensure alignment and readability on different screen sizes.

## Risks / Trade-offs

- **[Risk]** Stat Calculation Errors → **[Mitigation]** Use the provided mathematical formulas and implement unit tests to verify accuracy against known benchmarks.
- **[Risk]** Scaling with many Pokémon → **[Mitigation]** The Regulation M-A format has a finite set of viable Pokémon; standard React rendering should suffice, but virtualization can be added if performance lags.
