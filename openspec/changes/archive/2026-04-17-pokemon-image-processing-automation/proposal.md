## Why

The Pokémon VGC website requires organized image assets for both high-resolution display and fast-loading thumbnails. Manual management of these images is error-prone and time-consuming. An automated Python script will ensure consistent directory structure and optimized assets.

## What Changes

- **Image Organization**: Move/copy high-resolution Pokémon artwork from a local source to the project's public directory.
- **Thumbnail Generation**: Automatically generate 150px thumbnails for all processed images.
- **Directory Automation**: Ensure required project directories for images are created automatically.

## Capabilities

### New Capabilities
- `image-automation-script`: Python script to handle batch image processing and directory management.
- `optimized-image-assets`: Automatic generation of web-optimized thumbnails alongside high-res originals.

### Modified Capabilities
<!-- None -->

## Impact

- **Project Assets**: New images in `public/images/pokemon/official-artwork/` and `public/images/pokemon/thumbnails/`.
- **Dependencies**: New project dependency on `Pillow` for image processing.
- **Build/Dev Pipeline**: A new script `scripts/process_images.py` for asset preparation.
