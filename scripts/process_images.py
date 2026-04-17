import os
import shutil
from PIL import Image

# Configuration
SOURCE_DIR = "./official-artwork/"
HIGH_RES_DEST = "./public/images/pokemon/official-artwork/"
THUMBNAIL_DEST = "./public/images/pokemon/thumbnails/"
THUMBNAIL_SIZE = (150, 150)

def main():
    # 2.1 Implement directory management
    for path in [HIGH_RES_DEST, THUMBNAIL_DEST]:
        if not os.path.exists(path):
            print(f"Creating directory: {path}")
            os.makedirs(path, exist_ok=True)

    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory {SOURCE_DIR} not found.")
        return

    # 2.2 Implement iteration loop
    files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(".png")]
    print(f"Found {len(files)} .png files to process.")

    for filename in files:
        source_path = os.path.join(SOURCE_DIR, filename)
        high_res_path = os.path.join(HIGH_RES_DEST, filename)
        thumbnail_path = os.path.join(THUMBNAIL_DEST, filename)

        try:
            # 2.3 Implement shutil.copy2 logic
            shutil.copy2(source_path, high_res_path)
            # print(f"Copied high-res: {filename}")

            # 2.4 Implement Pillow thumbnail generation
            with Image.open(source_path) as img:
                # Maintain aspect ratio
                img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                
                # Optimize for web while preserving transparency
                img.save(thumbnail_path, "PNG", optimize=True)
                # print(f"Generated thumbnail: {filename}")

        except Exception as e:
            # 2.5 Implement error handling
            print(f"Error processing {filename}: {e}")

    print("\nImage processing complete!")

if __name__ == "__main__":
    main()
