## Why

Competitive Pokémon spreads typically use increments of 4 EVs (e.g., 4, 12, 20...). Setting the slider to increment by 4 each time makes it much easier for players to select valid VGC benchmarks and improves the overall usability of the converter tool.

## What Changes

- Modify the `StatSlider` atom to use a `step` value of 4.
- (Optional) Update the `StatInput` atom to also use a `step` value of 4 for consistency when using the number spinner.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `range-based-stat-input`: Refine the slider to support fixed increments of 4 EVs.

## Impact

- `src/components/atoms/StatSlider.tsx`: Added `step` attribute.
- `src/components/atoms/StatInput.tsx`: Added `step` attribute.
