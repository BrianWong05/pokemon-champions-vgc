"""
Evaluate the trained ONNX sprite classifier on HELD-OUT labeled crops.

IMPORTANT: point --data at crops the model did NOT train on (a few screenshots you
set aside, or freshly labeled ones). Testing on training data is meaningless.

Run (Colab or local):
  !pip install onnxruntime numpy pillow
  !python test_sprite_net.py --model out/model.onnx --classes out/classes.json --data test_crops

test_crops/ = folder of <id>[_tag]_*.png  (the id prefix is the ground-truth label).
"""
import argparse, glob, json, os
import numpy as np
from PIL import Image
import onnxruntime as ort

ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True)
ap.add_argument('--classes', required=True)
ap.add_argument('--data', required=True, help='held-out <id>_*.png crops NOT used in training')
a = ap.parse_args()

classes = json.load(open(a.classes))              # classes[index] -> pokemon.id
sess = ort.InferenceSession(a.model)
inp = sess.get_inputs()[0].name


def prep(path):
    img = Image.open(path).convert('RGB').resize((224, 224), Image.BILINEAR)
    x = np.asarray(img, dtype=np.float32) / 255.0  # 0..1 RGB — must match training preprocessing
    return x.transpose(2, 0, 1)[None]              # 1x3x224x224


files = [f for f in glob.glob(os.path.join(a.data, '*.png'))
         if os.path.splitext(os.path.basename(f))[0].split('_')[0].isdigit()]

top1 = top3 = 0
for f in files:
    true_id = int(os.path.splitext(os.path.basename(f))[0].split('_')[0])
    logits = sess.run(None, {inp: prep(f)})[0][0]
    order = logits.argsort()[::-1]
    pred_ids = [classes[i] for i in order[:3]]
    if pred_ids[0] == true_id:
        top1 += 1
    if true_id in pred_ids:
        top3 += 1
    else:
        print(f'MISS {os.path.basename(f)}: true {true_id}, got top3 {pred_ids}')

n = max(1, len(files))
print(f'\n{len(files)} test images   top-1 {top1 / n:.1%}   top-3 {top3 / n:.1%}')
