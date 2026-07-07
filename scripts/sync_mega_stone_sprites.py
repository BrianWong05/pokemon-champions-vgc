"""Sync mega-stone bag sprites from the raw Bulbapedia download into the app.

download_mega_stone.py drops every variant Bulbapedia serves (Bag_<name>_CP/ZA/_Sprite.png)
into mega_stones/. The app resolves item icons via getItemImageUrl(), which builds
public/images/mega-stone/Bag_<name>_CP_Sprite.png (see src/features/pokemon/utils/items.ts).
This copies the best available source for every MEGA_STONES entry into that CP filename,
so newly added stones (whose Bulbapedia sprite is only the Legends Z-A "_ZA_" variant) render
instead of falling back to the "?" placeholder. Idempotent: existing CP sprites are left as-is.
"""
import os
import re
import shutil

RAW = "mega_stones"
DEST = "public/images/mega-stone"
ITEMS_TS = "src/features/pokemon/utils/items.ts"

def mega_stone_names():
    ts = open(ITEMS_TS, encoding="utf-8").read()
    return re.findall(r'"([^"]+)"', ts.split("]")[0])  # the MEGA_STONES Set is the first [...] block

def main():
    os.makedirs(DEST, exist_ok=True)
    copied, missing = [], []
    for name in mega_stone_names():
        norm = name.replace(" ", "_")
        target = f"Bag_{norm}_CP_Sprite.png"
        if os.path.exists(os.path.join(DEST, target)):
            continue
        # prefer the Champions sprite, else Legends Z-A, else the plain/ORAS one
        for variant in (target, f"Bag_{norm}_ZA_Sprite.png", f"Bag_{norm}_Sprite.png"):
            src = os.path.join(RAW, variant)
            if os.path.exists(src):
                shutil.copyfile(src, os.path.join(DEST, target))
                copied.append((name, variant))
                break
        else:
            missing.append(name)

    for name, variant in copied:
        print(f"  {name:16} <- {variant}")
    print(f"Copied {len(copied)} sprite(s) into {DEST}.")
    if missing:
        print(f"No sprite in {RAW}/ for {len(missing)}: {', '.join(missing)}"
              f" (re-run download_mega_stone.py once Bulbapedia publishes one).")

if __name__ == "__main__":
    main()
