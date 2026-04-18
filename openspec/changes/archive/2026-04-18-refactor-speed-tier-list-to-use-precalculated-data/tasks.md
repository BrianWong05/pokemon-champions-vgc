## 1. Data Fetching Refactor

- [x] 1.1 Implement async Drizzle query in `SpeedTierList.tsx` to fetch pre-calculated speeds.
- [x] 1.2 Update `PokemonWithSpeeds` interface to match database response.
- [x] 1.3 Add `useState` for storing fetched data and `isLoading` boolean.
- [x] 1.4 Replace `mockPokemon` and `calculateSpeedStats` calls with the database query in `useEffect`.

## 2. Component Logic & UI

- [x] 2.1 Update `useMemo` grouping logic to work with the data fetched from the database.
- [x] 2.2 Refactor the Pokémon list mapping to display `maxPlus`, `maxNeutral`, `uninvested`, and `minMinus` directly from the object properties.
- [x] 2.3 Remove frontend math utility functions if they are no longer used by any other component.
- [x] 2.4 Add basic loading state UI (e.g., "Loading speed tiers...").

## 3. Browser Compatibility & Fixes

- [x] 3.1 Migrate from `better-sqlite3` to `sql.js` for browser environment compatibility.
- [x] 3.2 Implement `initDb` and `getDb` helpers in `src/db/index.ts` to fetch and load the database file.
- [x] 3.3 Move `vgc_pokemon.db` to the `public/` directory for client-side access.

## 4. Verification

- [x] 4.1 Verify the page renders correct speed values for known Pokémon (e.g., Base 135).
- [x] 4.2 Ensure the tier grouping (Base Speed) remains correctly sorted in descending order.
