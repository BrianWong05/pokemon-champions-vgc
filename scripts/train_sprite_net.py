"""
Train a tiny IN-DOMAIN Pokemon menu-sprite classifier for the scan feature.

RUN THIS ON A GPU (Google Colab, free) — NOT in this repo's environment.

Colab quick start:
  1. Zip `training/menu-sprites/` PLUS `training/panel-crops/` (generate the
     latter with `npx tsx scripts/generate-panel-crops.ts` — panel-realistic
     composites the player team scan needs) into ONE folder of
     `<id>[_tag]_<src>_<n>.png` files (e.g. `6_shiny_Xnip..._0.png`).
  2. !pip install torch torchvision onnx
  3. !python train_sprite_net.py --data menu-sprites --epochs 40 --out out
  4. Download out/model.onnx + out/classes.json and drop them in
     public/models/pokemon-sprite-net/ (the Phase-2 wiring reads them).

Class = the id (the part before the first underscore), so every variant of a Pokemon
(normal / _shiny / _battle / multiple crops) shares one class. Output preprocessing is
plain 0..1 RGB (no ImageNet normalization) so the on-device runtime stays simple.
"""
import argparse, glob, json, os, random
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from torchvision.models import shufflenet_v2_x1_0

IMG = 224


class CaptureDownscale:
    """Shrink to a random small size then upscale back — mimics the tiny in-game crop.

    lo=26 covers the player-panel header sprites (28-37px live crops, smaller
    than the 48px+ opponent battle-box crops this was originally tuned for).
    """
    def __init__(self, lo=26, hi=110):
        self.lo, self.hi = lo, hi

    def __call__(self, img):
        s = random.randint(self.lo, self.hi)
        return img.resize((s, s), Image.BILINEAR).resize((IMG, IMG), Image.BILINEAR)


def id_of(path):
    # strip extension FIRST, so "3.png" -> "3" (pokedex sprites), and
    # "6_shiny_x_0.png" -> "6" (labeled crops). Both fold into the same class.
    return os.path.splitext(os.path.basename(path))[0].split('_')[0]


class SpriteDataset(Dataset):
    def __init__(self, files, id_to_idx, train):
        self.files, self.id_to_idx = files, id_to_idx
        if train:
            self.tf = T.Compose([
                T.Resize((IMG, IMG)),
                # Partial-sprite crops: live player-panel boxes sometimes clip the
                # sprite (left-cut Annihilape 21/33px, zoomed Gengar showing only the
                # lower face on zh-team17/ja-rental-r676) — train on random windows too.
                T.RandomApply([T.RandomResizedCrop(IMG, scale=(0.35, 1.0), ratio=(0.6, 1.5))], p=0.35),
                T.RandomApply([CaptureDownscale()], p=0.8),                  # capture blur
                T.RandomAffine(degrees=8, translate=(0.06, 0.06), scale=(0.85, 1.15)),
                T.RandomPerspective(distortion_scale=0.15, p=0.3),   # phone-camera angle
                T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.4, hue=0.5),  # hue=0.5 => shiny-invariant
                T.RandomApply([T.GaussianBlur(3)], p=0.2),
                T.ToTensor(),
            ])
        else:
            self.tf = T.Compose([T.Resize((IMG, IMG)), T.ToTensor()])

    def __len__(self):
        return len(self.files)

    def __getitem__(self, i):
        f = self.files[i]
        return self.tf(Image.open(f).convert('RGB')), self.id_to_idx[id_of(f)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True, help='folder of <id>[_tag]_*.png sprites')
    ap.add_argument('--epochs', type=int, default=40)
    ap.add_argument('--batch', type=int, default=64)
    ap.add_argument('--out', default='out')
    ap.add_argument('--resume', default=None,
                    help='previous out/checkpoint.pt to warm-start from (instead of ImageNet)')
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(a.data, '*.png')))
    files = [f for f in files if id_of(f).isdigit()]
    ids = sorted({id_of(f) for f in files}, key=int)
    id_to_idx = {pid: i for i, pid in enumerate(ids)}
    print(f'{len(files)} images across {len(ids)} classes')

    dl = DataLoader(SpriteDataset(files, id_to_idx, train=True),
                    batch_size=a.batch, shuffle=True, num_workers=2)

    dev = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    model = shufflenet_v2_x1_0(weights=None if a.resume else 'DEFAULT')  # ~1.4M params
    model.fc = nn.Linear(model.fc.in_features, len(ids))
    if a.resume:
        ck = torch.load(a.resume, map_location='cpu')
        sd = ck['state_dict']
        same_classes = ck.get('classes') == [int(p) for p in ids]
        if not same_classes:
            # class list changed (new mons/forms labeled) -> keep the backbone, rebuild the head
            sd = {k: v for k, v in sd.items() if not k.startswith('fc.')}
        model.load_state_dict(sd, strict=False)
        print(f'warm-started from {a.resume}'
              + ('' if same_classes else ' (class list changed; head reinitialized)'))
    model = model.to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    lossf = nn.CrossEntropyLoss()

    model.train()
    for ep in range(a.epochs):
        run, correct, tot = 0.0, 0, 0
        for x, y in dl:
            x, y = x.to(dev), y.to(dev)
            opt.zero_grad()
            out = model(x)
            loss = lossf(out, y)
            loss.backward()
            opt.step()
            run += loss.item() * x.size(0)
            correct += (out.argmax(1) == y).sum().item()
            tot += x.size(0)
        print(f'epoch {ep + 1}/{a.epochs}  loss {run / tot:.3f}  train-acc {correct / tot:.3f}')

    os.makedirs(a.out, exist_ok=True)
    model.eval().cpu()
    # PyTorch checkpoint for future --resume runs (ONNX is a frozen inference export
    # and cannot be trained further — this .pt is the trainable artifact).
    torch.save({'state_dict': model.state_dict(), 'classes': [int(p) for p in ids]},
               os.path.join(a.out, 'checkpoint.pt'))
    onnx_path = os.path.join(a.out, 'model.onnx')
    torch.onnx.export(
        model, torch.randn(1, 3, IMG, IMG), onnx_path, opset_version=18,
        input_names=['input'], output_names=['logits'],
        dynamic_axes={'input': {0: 'batch'}, 'logits': {0: 'batch'}},
    )
    # Newer PyTorch exporters may write weights to a sidecar model.onnx.data file;
    # repack into ONE self-contained .onnx so the web runtime only fetches one file.
    import onnx
    onnx.save_model(onnx.load(onnx_path), onnx_path)
    for leftover in glob.glob(onnx_path + '.data'):
        os.remove(leftover)
    # classes[index] = pokemon.id  — the runtime maps argmax(logits) -> this id.
    json.dump([int(pid) for pid in ids], open(os.path.join(a.out, 'classes.json'), 'w'))
    print(f'saved {onnx_path} + classes.json ({len(ids)} classes)')


if __name__ == '__main__':
    main()
