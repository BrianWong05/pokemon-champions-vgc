"""
Active-learning triage for HP glyph candidates.

Scores every crop in hp-reader/dataset-candidates/ with the trained checkpoint and
writes a review ORDERING (most-informative first) to .triage.json:

  1. confident disagreements first — the model predicts a DIFFERENT char than the
     golden-aligned label, which almost always means a mis-segmented crop (fused/
     split digit or noise box). Reject these before they poison training.
  2. then agreements ranked by ASCENDING confidence — the hardest genuine examples,
     which teach the model the most per label.

Run after building candidates and training at least once:
  npm run build:hp-dataset          # -> dataset-candidates/
  .venv/bin/python scripts/train_glyph_net.py
  .venv/bin/python scripts/triage_glyph_candidates.py
  npm run review:hp-dataset -- --triage
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from train_glyph_net import GlyphNet, CLASSES, CHAR_TO_IDX, DIR_TO_CHAR, W, H  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAND = os.path.join(ROOT, "hp-reader", "dataset-candidates")
CKPT = os.path.join(ROOT, "hp-reader", "models", "glyph-net-checkpoint.pt")


def load_crop(path):
    arr = np.asarray(Image.open(path).convert("L").resize((W, H)), dtype=np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0).unsqueeze(0)  # [1, 1, H, W]


def main():
    if not os.path.exists(CKPT):
        raise SystemExit(f"No checkpoint at {CKPT} — train first: python scripts/train_glyph_net.py")
    model = GlyphNet()
    model.load_state_dict(torch.load(CKPT, map_location="cpu"))
    model.eval()

    rows = []
    for dirname, char in DIR_TO_CHAR.items():
        label = CHAR_TO_IDX[char]
        for path in glob.glob(os.path.join(CAND, dirname, "*.png")):
            with torch.no_grad():
                probs = torch.softmax(model(load_crop(path)), 1)[0]
            pred = int(probs.argmax())
            rows.append({
                "path": os.path.relpath(path, ROOT),
                "label": CLASSES[label],
                "pred": CLASSES[pred],
                "conf": round(float(probs[pred]), 3),          # confidence in the prediction
                "label_conf": round(float(probs[label]), 3),   # confidence in the aligned label
                "disagree": pred != label,
            })
    if not rows:
        raise SystemExit(f"No candidates under {CAND} — run: npm run build:hp-dataset")

    disagree = sorted((r for r in rows if r["disagree"]), key=lambda r: -r["conf"])
    agree = sorted((r for r in rows if not r["disagree"]), key=lambda r: r["conf"])
    ordered = disagree + agree

    out = os.path.join(CAND, ".triage.json")
    with open(out, "w") as f:
        json.dump(ordered, f, indent=1)

    print(f"{len(rows)} candidates | {len(disagree)} disagreements (likely mis-cropped) "
          f"| {len(agree)} agreements")
    print(f"wrote {os.path.relpath(out, ROOT)} (review with: npm run review:hp-dataset -- --triage)\n")
    if disagree:
        print("top disagreements — inspect/reject first:")
        for r in disagree[:20]:
            print(f"  aligned {r['label']}  but model says {r['pred']} @ {r['conf']:.2f}"
                  f"  (label_conf {r['label_conf']:.2f})  {r['path']}")


if __name__ == "__main__":
    main()
