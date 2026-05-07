## 1. Investigation

- [x] 1.1 Verify why `ItemImage` fails to resolve the image path in `TeamDetailPage`
- [x] 1.2 Check consistency of item names returned from `PokemonConfig` vs. expected filenames in `public/images/items/`

## 2. Fix

- [x] 2.1 Update `ItemImage` component to handle path sanitization or missing files gracefully (e.g., adding a fallback placeholder)
- [x] 2.2 Verify that the fix resolves the image display in both `TeamDetailPage` and `TeamMemberEditorModal`
