## Why

The current EV/SP converter uses only numeric inputs, which can be less intuitive for rapid adjustments. Adding a drag bar (slider) alongside the numeric input provides a more interactive and visual way for players to experiment with different EV spreads and see the resulting SP changes in real-time.

## What Changes

- Introduce a `StatSlider` atom for range-based input.
- Update `StatConverterRow` molecule to include the `StatSlider` synchronized with the `StatInput`.
- Enhance the UI layout to accommodate both numeric and slider inputs while maintaining responsiveness.

## Capabilities

### New Capabilities
- `range-based-stat-input`: A UI component and logic for adjusting stat values using a slider mechanism.

### Modified Capabilities
- `interactive-calculator-ui`: Enhance the existing calculator UI with drag-and-drop functionality for stat adjustments.

## Impact

- `src/components/atoms/StatSlider.tsx`: New atom.
- `src/components/molecules/StatConverterRow.tsx`: Updated to include the slider.
- `src/pages/EvSpConverter/index.tsx`: (Indirectly through component updates).
