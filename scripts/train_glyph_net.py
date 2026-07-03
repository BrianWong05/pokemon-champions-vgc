"""
Train the tiny HP glyph classifier (0-9, '/', '%') for the on-device HP reader.

Local run (Apple Silicon / CPU is plenty for this tiny net):
  1. python3 -m venv .venv && source .venv/bin/activate   # if not already
  2. pip install torch numpy pillow onnx                   # onnx enables the export
  3. python scripts/train_glyph_net.py

Reads reviewed crops from hp-reader/dataset/<class>/*.png (24x32 white-on-black),
does a stratified train/val split, trains with light augmentation, and reports
OVERALL + PER-CLASS validation accuracy plus the top confusions. The per-class
number is the point: the never-wrong (policy A) bar is >99.5% char accuracy, and
the rare classes (3/4/8, ~12 samples each) are where that will or won't hold.

Best-effort ONNX export to hp-reader/models/hp_classifier.onnx (skipped with a
clear message if the `onnx` package is absent — the accuracy report is the goal).

Architecture (spec docs/superpowers/specs/2026-07-03-hp-reader-design.md):
  input 1x32x24 -> conv3x3(16) -> ReLU -> maxpool -> conv3x3(32) -> ReLU
  -> global avg pool -> dense(12) -> softmax
"""
import glob
import json
import os
import random

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(ROOT, "hp-reader", "dataset")
MODELS_DIR = os.path.join(ROOT, "hp-reader", "models")
W, H = 24, 32
SEED = 0

# dataset dir name -> class char (classes.json order fixes the index)
DIR_TO_CHAR = {**{str(d): str(d) for d in range(10)}, "slash": "/", "percent": "%"}
CLASSES = [str(d) for d in range(10)] + ["/", "%"]
CHAR_TO_IDX = {c: i for i, c in enumerate(CLASSES)}


def load_samples():
    """Return [(path, class_idx)] for every reviewed crop."""
    samples = []
    for dirname, char in DIR_TO_CHAR.items():
        for path in glob.glob(os.path.join(DATASET_DIR, dirname, "*.png")):
            samples.append((path, CHAR_TO_IDX[char]))
    return samples


def to_gray_array(img):
    """PIL RGBA/L crop -> (H, W) float32 in [0,1], white glyph on black."""
    arr = np.asarray(img.convert("L").resize((W, H)), dtype=np.float32) / 255.0
    return arr


def augment(img):
    """Label-preserving aug per the spec: no flip/mirror/perspective."""
    # rotation up to 3 deg
    img = img.rotate(random.uniform(-3, 3), resample=Image.BILINEAR, fillcolor=0)
    # translation up to 2 px
    dx, dy = random.randint(-2, 2), random.randint(-2, 2)
    img = img.transform(img.size, Image.AFFINE, (1, 0, dx, 0, 1, dy), fillcolor=0)
    # brightness / contrast
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.75, 1.25))
    img = ImageEnhance.Contrast(img).enhance(random.uniform(0.75, 1.25))
    # occasional blur
    if random.random() < 0.3:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.3, 0.9)))
    return img


class GlyphDataset(Dataset):
    def __init__(self, samples, train):
        self.samples = samples
        self.train = train

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, i):
        path, label = self.samples[i]
        img = Image.open(path).convert("L").resize((W, H))
        if self.train:
            img = augment(img)
        arr = np.asarray(img, dtype=np.float32) / 255.0
        if self.train:  # gaussian noise after normalization
            arr = np.clip(arr + np.random.normal(0, 0.05, arr.shape).astype(np.float32), 0, 1)
        return torch.from_numpy(arr).unsqueeze(0), label


class GlyphNet(nn.Module):
    # NB: the spec sketched a global-average-pool head, but GAP averages away
    # WHERE strokes sit — exactly what separates digits — and the net collapsed
    # to the majority class. A spatial pool->flatten->dense head keeps position
    # and is still tiny (32*8*6 -> 12, well under the 200 KB budget).
    def __init__(self, n_classes=12):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.pool = nn.MaxPool2d(2)
        self.fc = nn.Linear(32 * (H // 4) * (W // 4), n_classes)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))  # -> 16 x (H/2) x (W/2)
        x = self.pool(torch.relu(self.conv2(x)))  # -> 32 x (H/4) x (W/4)
        x = x.flatten(1)
        return self.fc(x)


def stratified_split(samples, val_frac=0.2):
    """Per-class split so every class has >=1 validation sample."""
    rng = random.Random(SEED)
    by_class = {}
    for s in samples:
        by_class.setdefault(s[1], []).append(s)
    train, val = [], []
    for label, items in by_class.items():
        items = items[:]
        rng.shuffle(items)
        n_val = max(1, round(len(items) * val_frac))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    rng.shuffle(train)
    return train, val


def main():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    samples = load_samples()
    if not samples:
        raise SystemExit(f"No samples under {DATASET_DIR}")
    train_s, val_s = stratified_split(samples)
    counts = {c: 0 for c in CLASSES}
    for _, lab in samples:
        counts[CLASSES[lab]] += 1
    print(f"{len(samples)} samples | train {len(train_s)} / val {len(val_s)}")
    print("per-class total:", " ".join(f"{c}:{counts[c]}" for c in CLASSES))

    train_dl = DataLoader(GlyphDataset(train_s, train=True), batch_size=64, shuffle=True)
    val_dl = DataLoader(GlyphDataset(val_s, train=False), batch_size=128)

    model = GlyphNet()
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    best_acc, best_state, patience, since_best = 0.0, None, 15, 0
    for epoch in range(60):
        model.train()
        for xb, yb in train_dl:
            opt.zero_grad()
            loss_fn(model(xb), yb).backward()
            opt.step()

        model.eval()
        correct = total = 0
        per_class = {c: [0, 0] for c in CLASSES}  # [correct, total]
        confusion = {}
        with torch.no_grad():
            for xb, yb in val_dl:
                pred = model(xb).argmax(1)
                for p, y in zip(pred.tolist(), yb.tolist()):
                    total += 1
                    per_class[CLASSES[y]][1] += 1
                    if p == y:
                        correct += 1
                        per_class[CLASSES[y]][0] += 1
                    else:
                        confusion[(CLASSES[y], CLASSES[p])] = confusion.get((CLASSES[y], CLASSES[p]), 0) + 1
        acc = correct / total
        if acc > best_acc:
            best_acc, best_state, since_best = acc, {k: v.clone() for k, v in model.state_dict().items()}, 0
            best_per_class, best_confusion = per_class, confusion
        else:
            since_best += 1
        if epoch % 5 == 0 or since_best == 0:
            print(f"epoch {epoch:2d}  val acc {acc:.3f}  (best {best_acc:.3f})")
        if since_best >= patience:
            break

    print(f"\n=== best val acc: {best_acc:.4f} (target >0.995) ===")
    print("per-class val acc:")
    for c in CLASSES:
        cor, tot = best_per_class[c]
        print(f"  {c:>5}: {cor}/{tot}" + ("" if tot == 0 else f"  {cor / tot:.2f}"))
    if best_confusion:
        print("top confusions (true -> pred):")
        for (t, p), n in sorted(best_confusion.items(), key=lambda kv: -kv[1])[:8]:
            print(f"  {t} -> {p}: {n}")

    os.makedirs(MODELS_DIR, exist_ok=True)
    ckpt = os.path.join(MODELS_DIR, "glyph-net-checkpoint.pt")
    torch.save(best_state, ckpt)
    with open(os.path.join(MODELS_DIR, "classes.json"), "w") as f:
        json.dump(CLASSES, f, indent=2)
        f.write("\n")
    print(f"saved checkpoint {os.path.relpath(ckpt, ROOT)}")

    model.load_state_dict(best_state)
    model.eval()
    onnx_path = os.path.join(MODELS_DIR, "hp_classifier.onnx")
    try:
        torch.onnx.export(
            model, torch.randn(1, 1, H, W), onnx_path, opset_version=18,
            input_names=["input"], output_names=["logits"], dynamo=False,
        )
        print(f"exported {os.path.relpath(onnx_path, ROOT)} "
              f"({os.path.getsize(onnx_path) / 1024:.1f} KB, FP32 — INT8 quantize is a later step)")
    except Exception as e:  # noqa: BLE001 — export is best-effort; accuracy report is the goal
        print(f"ONNX export skipped ({type(e).__name__}: {e}); `pip install onnx` to enable it")


if __name__ == "__main__":
    main()
