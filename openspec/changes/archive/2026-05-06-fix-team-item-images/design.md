## Context

The `ItemImage` component is failing to load images in the `TeamDetailPage` and `TeamMemberEditorModal`. This seems to be related to how the component receives the `name` prop and resolves the image path.

## Goals / Non-Goals

**Goals:**
- Resolve path resolution or naming inconsistencies for item images.
- Ensure `ItemImage` functions correctly when passed item names from stored team configurations.

## Decisions

- **Investigation**: Check the `ItemImage` component implementation and the assets folder structure to see if item names are missing or mapped incorrectly.
- **Fix**: Apply the necessary mapping fix in `ItemImage` or ensure the passed `item` name is sanitized/normalized correctly.

## Risks / Trade-offs

- **[Risk] Missing Assets** → Some items might not have corresponding images in `public/images/items/`. Mitigation: Add a fallback "placeholder" image if the item image is not found.
