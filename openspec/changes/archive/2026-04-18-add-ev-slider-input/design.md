## Context

The `EvSpConverter` currently allows stat adjustment only via numeric input fields. Users have requested a "drag bar" for a more tactile and visual experience when building spreads.

## Goals / Non-Goals

**Goals:**
- Add a slider (range input) to each stat row in the EV converter.
- Ensure the slider and numeric input are perfectly synchronized.
- Maintain the 0-252 constraint per stat.
- Improve the visual balance of the stat row.

**Non-Goals:**
- Changing the underlying EV/SP conversion formula.
- Implementing multi-handle sliders (standard single handle is sufficient).

## Decisions

- **New Atom**: `StatSlider.tsx` will be created as a controlled component wrapping a standard HTML `input type="range"`. It will accept `value`, `onChange`, `min`, and `max` props.
- **Molecule Update**: `StatConverterRow.tsx` will be refactored to place the `StatSlider` between the numeric input and the SP badge.
- **Layout**: On desktop, the slider will occupy a significant portion of the row's width. On mobile, the slider might stack or shrink to ensure all elements remain accessible.
- **Synchronization**: The Page level state already manages the EV values. Both the `StatInput` and `StatSlider` will read from and update the same state key, ensuring seamless synchronization.

## Risks / Trade-offs

- **[Risk]** Layout overcrowding on small screens → **[Mitigation]** Use flex-grow on the slider and potentially hide or reduce the width of other elements on very small screens, or stack them vertically.
- **[Risk]** Redundant input methods → **[Mitigation]** This is intentional to provide both precision (numeric) and speed (slider).
 Aurora
