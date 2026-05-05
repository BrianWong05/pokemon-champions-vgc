## Context

The application currently has a library of item images in the `/items` directory, but they are not displayed in the Damage Calculator. Users select items via a text-based dropdown, and the only visual confirmation is the item name.

## Goals / Non-Goals

**Goals:**
- Display the selected hold item's image in the `PokemonPanel`.
- Create a reusable `ItemImage` component that handles asset resolution.
- Ensure the image updates instantly when the selection changes.

**Non-Goals:**
- Animating the item image.
- Showing item descriptions or effects in a tooltip (out of scope for this task).

## Decisions

### 1. Asset Resolution Strategy
**Decision:** Create a utility `getItemImage(itemName: string): string` that maps the item name to the correct file in `public/images/items`.
**Rationale:** The files follow a predictable pattern (e.g., `Choice_Band_SV.png`). Moving them to the `public` directory ensures they are served correctly by Vite. Standardizing filenames to match Smogon names with `_SV.png` suffix allows for programmatic resolution.

### 2. Component Placement
**Decision:** Place the item image within the `PokemonSearchSelect` row, next to the "Hold Item" label.
**Rationale:** Placing it near the selection dropdown provides immediate visual feedback.

### 3. Image Loading & Fallbacks
**Decision:** Use a placeholder or nothing if the image is missing.
**Rationale:** Not all items may have corresponding images in the directory yet.

## Risks / Trade-offs

- **[Risk]** Item name mismatch between Smogon/calc and the filenames.
  → **Mitigation**: Standardize filenames to match common formats and use a mapping dictionary for exceptions.
