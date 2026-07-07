# Re-encode each player-golden screenshot through the BROWSER's image decode
# path (blob -> <img> -> canvas), exactly like src/features/scan/imageLoading.ts,
# and save the canvas pixels as PNG fixtures for stat-glyph template building.
# Mirrors scripts/capture-browser-fixtures.py (the HP-reader equivalent).
# Usage: python3 scripts/capture-player-browser-fixtures.py
import base64
import json
import os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "training", "player-screens")
OUT = os.path.join(ROOT, "training", "player-fixtures")
os.makedirs(OUT, exist_ok=True)

JS = """
async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('decode failed'));
    el.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return canvas.toDataURL('image/png');
}
"""

golden = json.load(open(os.path.join(ROOT, "training", "player-golden.json")))
names = sorted({pair["statsImage"] for pair in golden.values() if isinstance(pair, dict) and "statsImage" in pair})
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("about:blank")
    for name in names:
        with open(os.path.join(SHOTS, name), "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        data_url = page.evaluate(JS, b64)
        png = base64.b64decode(data_url.split(",", 1)[1])
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(png)
        print("captured", name)
    browser.close()
print("done ->", OUT)
