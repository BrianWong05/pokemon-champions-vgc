## 1. Setup

- [x] 1.1 Create `scripts/process_images.py`
- [x] 1.2 Install `Pillow` library (`pip install Pillow`)

## 2. Core Implementation

- [x] 2.1 Implement directory management (automatic creation of destination paths)
- [x] 2.2 Implement the main iteration loop for `.png` files in `official-artwork/`
- [x] 2.3 Implement the `shutil.copy2` logic for high-res images
- [x] 2.4 Implement the Pillow thumbnail generation (150px max, LANCZOS resampling)
- [x] 2.5 Implement error handling for individual file processing

## 3. Verification

- [x] 3.1 Run script and verify high-res images in `public/images/pokemon/official-artwork/`
- [x] 3.2 Run script and verify thumbnails in `public/images/pokemon/thumbnails/`
- [x] 3.3 Verify that thumbnail file sizes are optimized and transparency is preserved
