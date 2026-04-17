## Context

The project needs a bridge between raw artwork assets and the Vite public directory. This Python script will serve as an asset pipeline component.

## Goals / Non-Goals

**Goals:**
- Automate the transfer and optimization of ~1000+ Pokémon images.
- Provide a repeatable process for updating assets.
- Minimize manual directory management.

**Non-Goals:**
- Removing or cleaning up existing images in the destination (append-only logic).
- Advanced image filters (sepia, grayscale, etc.).
- Integration into the Vite build process (runs as a separate utility).

## Decisions

- **Decision**: Use `Pillow` (PIL fork).
  - **Rationale**: The industry standard for Python image manipulation, providing excellent support for resampling and transparency.
- **Decision**: Use `shutil.copy2`.
  - **Rationale**: Preserves metadata during the copy process.
- **Decision**: Max dimension 150px for thumbnails.
  - **Rationale**: Provides a good balance between file size (~5-10KB) and visual clarity in list views.
- **Decision**: `Image.Resampling.LANCZOS`.
  - **Rationale**: Superior to `NEAREST` or `BILINEAR` for downsizing, ensuring small text or fine details remain legible.

## Risks / Trade-offs

- [Risk] **High Disk Usage** → **Mitigation**: Thumbnails are generated only for new/existing assets, but high-res originals are also kept.
- [Risk] **Processing Time** → **Mitigation**: Pillow is efficient, but if the dataset grows significantly, parallel processing (multiprocessing) may be considered later.
