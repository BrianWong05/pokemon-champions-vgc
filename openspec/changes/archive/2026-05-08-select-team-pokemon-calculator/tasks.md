## 1. UI Components

- [x] 1.1 Create `TeamImportSelector` component in `src/features/calculator/components/TeamImportSelector.tsx`
- [x] 1.2 Implement team selection dropdown using `useTeams` hook
- [x] 1.3 Implement member selection grid showing Pokémon icons and names for the selected team

## 2. Calculator Integration

- [x] 2.1 Update `InteractiveDamageCalculator` panel UI to add a "My Teams" toggle alongside "Presets"
- [x] 2.2 Integrate `TeamImportSelector` into the Attacker panel with `loadConfig` callback
- [x] 2.3 Integrate `TeamImportSelector` into the Defender panel with `loadConfig` callback

## 3. Polish and Verification

- [x] 3.1 Add "No teams found" empty state with a link to the Team Builder
- [x] 3.2 Verify that selecting a team member correctly populates all config fields and triggers damage recalculation
- [x] 3.3 Ensure the layout handles 6 members gracefully in the selection grid
