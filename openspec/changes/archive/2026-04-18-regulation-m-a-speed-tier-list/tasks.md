## 1. Utilities & Core Logic

- [x] 1.1 Create `src/utils/stats.ts` and define `Pokemon` and `SpeedStats` interfaces.
- [x] 1.2 Implement `calculateSpeedStats` using the Pokémon Champions formula: `floor((Base + 20 + SP) * Nature)`.
- [x] 1.3 Add unit tests or simple validation for the calculation logic.

## 2. Component Development

- [x] 2.1 Create the `SpeedTierList` component in `src/pages/SpeedTierList/index.tsx`.
- [x] 2.2 Implement logic to group an array of Pokémon by `baseSpeed` in descending order.
- [x] 2.3 Build the UI using Tailwind CSS, including a 4-column benchmark grid for each Pokémon.
- [x] 2.4 Add mock data for Regulation M-A Pokémon (e.g., Flutter Mane, Incineroar, Amoonguss).

## 3. Routing & Integration

- [x] 3.1 Update `src/App.tsx` (or the main router configuration) to add the `/speed-tiers` route.
- [x] 3.2 Verify the page renders correctly with mock data and responsive styling.
