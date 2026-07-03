"""
Train the tiny HP glyph classifier (0-9, '/', '%') for the on-device HP reader.

This ~19K-param net trains in SECONDS on CPU, so GPU/Colab is optional — but the
workflow matches train_sprite_net.py if you prefer Colab:

Colab quick start (same muscle memory as the sprite net):
  1. Zip `hp-reader/dataset/` locally and upload+unzip in Colab so you have a
     `dataset/` folder with per-class subfolders: 0/ 1/ ... 9/ slash/ percent/.
  2. !pip install torch numpy pillow onnx
  3. !python train_glyph_net.py --data dataset --out out
  4. Download out/hp_classifier.onnx + out/classes.json.
     (INT8 quantize + the ORT-web wrapper happen back in the repo.)

Local (reads the repo dataset, writes hp-reader/models/):
  .venv/bin/python scripts/train_glyph_net.py

Reads reviewed crops from <data>/<class>/*.png (24x32 white-on-black), does a
stratified train/val split, trains with light label-preserving augmentation, and
reports OVERALL + PER-CLASS validation accuracy plus the top confusions. The
per-class number is the point: the never-wrong (policy A) bar is >99.5% char
accuracy, and the rare classes (3/4/8) are where that will or won't hold.

Architecture (spec docs/superpowers/specs/2026-07-03-hp-reader-design.md, with one
evidence-driven fix): input 1x32x24 -> conv3x3(16) -> ReLU -> maxpool ->
conv3x3(32) -> ReLU -> maxpool -> flatten -> dense(12). The spec sketched a
global-average-pool head; it collapsed to the majority class (GAP averages away
WHERE strokes sit), so this uses a spatial flatten head instead.
"""
import argparse
import glob
import json
import os
import random

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

W, H = 24, 32
SEED = 0

# dataset dir name -> class char (classes.json order fixes the index)
DIR_TO_CHAR = {**{str(d): str(d) for d in range(10)}, "slash": "/", "percent": "%"}
CLASSES = [str(d) for d in range(10)] + ["/", "%"]
CHAR_TO_IDX = {c: i for i, c in enumerate(CLASSES)}


def load_samples(data_dir):
    """Return [(path, class_idx)] for every crop under data_dir/<class>/."""
    samples = []
    for dirname, char in DIR_TO_CHAR.items():
        for path in glob.glob(os.path.join(data_dir, dirname, "*.png")):
            samples.append((path, CHAR_TO_IDX[char]))
    return samples


def augment(img):
    """Label-preserving aug per the spec: no flip/mirror/perspective."""
    img = img.rotate(random.uniform(-3, 3), resample=Image.BILINEAR, fillcolor=0)
    dx, dy = random.randint(-2, 2), random.randint(-2, 2)
    img = img.transform(img.size, Image.AFFINE, (1, 0, dx, 0, 1, dy), fillcolor=0)
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.75, 1.25))
    img = ImageEnhance.Contrast(img).enhance(random.uniform(0.75, 1.25))
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
    for _, items in by_class.items():
        items = items[:]
        rng.shuffle(items)
        n_val = max(1, round(len(items) * val_frac))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    rng.shuffle(train)
    return train, val


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="hp-reader/dataset", help="folder of <class>/ subdirs of 24x32 crops")
    ap.add_argument("--out", default="hp-reader/models", help="where to write checkpoint + onnx + classes.json")
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--batch", type=int, default=64)
    a = ap.parse_args()

    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    dev = "cuda" if torch.cuda.is_available() else "cpu"

    samples = load_samples(a.data)
    if not samples:
        raise SystemExit(f"No samples under {a.data} (expected {a.data}/<class>/*.png)")
    train_s, val_s = stratified_split(samples)
    counts = {c: 0 for c in CLASSES}
    for _, lab in samples:
        counts[CLASSES[lab]] += 1
    print(f"device {dev} | {len(samples)} samples | train {len(train_s)} / val {len(val_s)}")
    print("per-class total:", " ".join(f"{c}:{counts[c]}" for c in CLASSES))

    train_dl = DataLoader(GlyphDataset(train_s, train=True), batch_size=a.batch, shuffle=True)
    val_dl = DataLoader(GlyphDataset(val_s, train=False), batch_size=128)

    model = GlyphNet().to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    best_acc, best_state, patience, since_best = 0.0, None, 15, 0
    best_per_class, best_confusion = {}, {}
    for epoch in range(a.epochs):
        model.train()
        for xb, yb in train_dl:
            xb, yb = xb.to(dev), yb.to(dev)
            opt.zero_grad()
            loss_fn(model(xb), yb).backward()
            opt.step()

        model.eval()
        correct = total = 0
        per_class = {c: [0, 0] for c in CLASSES}
        confusion = {}
        with torch.no_grad():
            for xb, yb in val_dl:
                pred = model(xb.to(dev)).argmax(1).cpu()
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
            best_acc, since_best = acc, 0
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
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

    os.makedirs(a.out, exist_ok=True)
    ckpt = os.path.join(a.out, "glyph-net-checkpoint.pt")
    torch.save(best_state, ckpt)
    with open(os.path.join(a.out, "classes.json"), "w") as f:
        json.dump(CLASSES, f, indent=2)
        f.write("\n")

    model.load_state_dict(best_state)
    model.eval().cpu()
    onnx_path = os.path.join(a.out, "hp_classifier.onnx")
    torch.onnx.export(
        model, torch.randn(1, 1, H, W), onnx_path, opset_version=18,
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}}, dynamo=False,
    )
    # Repack into ONE self-contained .onnx (drop any weights sidecar) so the web
    # runtime fetches a single file — mirrors train_sprite_net.py.
    import onnx
    onnx.save_model(onnx.load(onnx_path), onnx_path)
    for leftover in glob.glob(onnx_path + ".data"):
        os.remove(leftover)
    print(f"saved {onnx_path} ({os.path.getsize(onnx_path) / 1024:.1f} KB, FP32) + "
          f"classes.json + {os.path.basename(ckpt)}")


if __name__ == "__main__":
    main()
