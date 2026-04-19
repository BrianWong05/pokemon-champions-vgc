## Why

The current 3-column layout of the Damage Calculator separates the calculation result from the inputs, which can be difficult to read on smaller screens and requires scrolling. Furthermore, users currently have to manually switch between moves to see damage rolls. Moving the results to a full-width top section and displaying all 4 move results simultaneously provides a superior overview and allows for faster competitive comparisons.

## What Changes

- **Layout Refactor**: Change from a 3-column layout to a top-heavy layout. Results will be at the top (full-width), and Pokémon setups will be in two columns below.
- **Simultaneous Calculation**: Calculate and display damage ranges for all 4 selected moves at the same time.
- **Interactive Results**: Users can click on a "Move Result Card" to select it as the "active" move, which will update the primary visual HP bar and KO probability display.
- **UI Adjustments**: Remove move activation controls from the `AttackerPanel`, as activation will now be handled in the top results section.
- **Enhanced Visuals**: Implement a large, prominent HP bar and modern Clean "Result Cards" using Tailwind CSS.

## Capabilities

### New Capabilities
- `multi-move-damage-display`: Capability to compute and render damage calculations for a full move-set (4 slots) simultaneously.

### Modified Capabilities
- `interactive-damage-calculator-ui`: Refactor the overall layout to a top-results/bottom-inputs structure.
- `multi-move-set-management`: Remove move activation logic from the move selection inputs.

## Impact

- `src/pages/DamageCalculator/index.tsx`: Major state and calculation logic refactor.
- `src/components/templates/DamageCalculatorTemplate.tsx`: Update layout structure.
- `src/components/organisms/ResultsPanel.tsx`: Significant UI overhaul to support multiple cards and a central HP bar.
- `src/components/organisms/AttackerPanel.tsx`: Remove radio button "active" state indicators.
