## Context

New sprite assets (CP_Sprite) need to be added to the website to provide better visual feedback.

## Goals / Non-Goals

**Goals:**
- Move provided sprite images into the public assets directory.
- Verify availability of the images.

**Non-Goals:**
- None.

## Decisions

- **Storage**: Move assets to `public/images/mega-stone/`.
- **Implementation**: Copy files from the provided source to the public directory.

## Risks / Trade-offs

- **[Risk] Path conflict** → Ensure the path is correct and accessible by the frontend.
