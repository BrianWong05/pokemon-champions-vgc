# Pokemon Champions HP Reader Design

Date: 2026-07-03

## Goal

Implement an ultra-lightweight, offline HP text reader for already-detected Pokemon HP crops. The reader runs on-device in the browser through ONNX Runtime Web and uses the same ONNX model on Android and iOS through ONNX Runtime Mobile or CoreML conversion.

The custom model target is under 200 KB after INT8 quantization, with under 5 ms character inference on modern phones. The runtime must not use OCR engines such as Tesseract, PaddleOCR, or ML Kit.

## Scope

The existing detector remains responsible for finding HP panels and crop regions. This change owns everything after that crop:

1. Preprocess the crop into a binary image.
2. Segment the HP text into character boxes.
3. Normalize each character to 24 x 32.
4. Classify each character as one of `0..9`, `/`, `%`.
5. Reconstruct and validate the string.
6. Smooth low-confidence results across recent frames.

Opponent HP is percentage-only. Opponent reads return only a percent value, never invented current or max HP. Player HP is fractional when visible and may return current HP, max HP, and derived percent.

## Existing Context

The repo already has HP scan logic in `src/features/scan`:

- `hpText.ts` implements the current template/heuristic HP reader.
- `battleDetection.ts` and `scanTargets.ts` detect battle panels and icons.
- `segmentation.ts` has shared image and crop helpers.
- `classifier.ts` already loads an ONNX Runtime Web model for sprite classification and configures ORT WASM paths.
- `scripts/read-hp.ts --debug` writes `training/.hp-debug/<screenshot>/regions.png` and `*-glyphs.png`.
- `training/hp-golden.json` maps screenshots to expected opponent percentage strings and player fraction strings.
- `training/hp-fixtures` contains browser-canvas fixture captures.

The files under `training/.hp-debug` are diagnostic artifacts. The `*-glyphs.png` images are annotated binary masks with red boxes, not clean training samples. Dataset generation should reuse the same source pipeline that creates those boxes, then save clean per-character crops.

## File Layout

Runtime code lives with the existing scan feature:

```text
src/features/scan/hp-reader/
  types.ts
  preprocess.ts
  connectedComponents.ts
  mergeBoxes.ts
  normalization.ts
  inference.ts
  decoder.ts
  smoothing.ts
  index.ts
```

Training and model artifacts live outside app source:

```text
hp-reader/
  training/
    extract_dataset.ts
    train.py
    augment.py
    export_onnx.py
  dataset/
    0/
    1/
    ...
    9/
    slash/
    percent/
  models/
    hp_classifier.onnx
    classes.json
  tests/
  examples/
```

The production browser model is served from:

```text
public/models/hp-reader/hp_classifier.onnx
public/models/hp-reader/classes.json
```

`classes.json` fixes class order:

```json
["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "/", "%"]
```

## Runtime API

The app-facing API is async because ONNX Runtime Web inference is async:

```ts
readHpFromCrop(crop: RgbaImage, mode: "player" | "opponent"): Promise<HpReadResult | null>
```

Result shape:

```ts
type HpReadResult =
  | {
      mode: "opponent";
      text: string;
      percent: number;
      confidence: number;
      source: "cnn";
    }
  | {
      mode: "player";
      text: string;
      percent: number;
      current: number;
      max: number;
      confidence: number;
      source: "cnn";
    };
```

The initial integration should keep the current synchronous `scanTargets` behavior stable by continuing to expose `hpPercent` from the existing reader where needed. The CNN reader can be introduced as a parallel async path and promoted after golden tests show it is better than the template path.

## Runtime Flow

For each one-Pokemon HP crop:

```text
HP crop
  -> preprocess binary mask
  -> connected components
  -> merge nearby boxes
  -> normalize each character to 24 x 32
  -> ONNX character classifier
  -> decode and validate
  -> optional smoothing
```

Example:

```text
177/177 crop -> [1] [7] [7] [/] [1] [7] [7] -> "177/177"
43% crop     -> [4] [3] [%]                 -> "43%"
```

## Preprocessing

`preprocess.ts` takes an RGB/RGBA HP crop and returns a binary mask:

1. Convert to grayscale.
2. Normalize contrast.
3. Apply adaptive/local thresholding.
4. Optionally apply a small morphological opening.
5. Remove tiny noise blobs.

The implementation should be pure TypeScript for browser weight. OpenCV-style operations are acceptable conceptually, but the browser runtime should not add OpenCV.js for this small task.

## Segmentation

`connectedComponents.ts` returns bounding boxes for foreground components in the binary mask. This is the lightweight equivalent of `findContours() + boundingRect()` for the narrow HP-text case.

`mergeBoxes.ts` sorts boxes by x, drops blobs below a configurable area threshold, and merges close or overlapping components. It must handle `%`, which can split into multiple blobs, by merging the dot/slash/dot pieces into one box when the spatial relationship matches a percent sign.

Output is an ordered list of character boxes.

## Character Normalization

`normalization.ts` extracts each character box from the mask and returns a float32 tensor slice:

1. Crop the character box.
2. Add configurable padding.
3. Resize into 24 x 32.
4. Normalize to `[0, 1]`.

The classifier input shape is `[1, 1, 32, 24]` unless export proves another layout is required. The layout must be documented in the ONNX manifest and covered by tests.

## Classifier

The tiny CNN architecture is:

```text
input 24 x 32 x 1
conv 3x3, 16 channels
ReLU
max pool
conv 3x3, 32 channels
ReLU
global average pool
dense 12
softmax
```

`inference.ts` loads `public/models/hp-reader/hp_classifier.onnx` through ONNX Runtime Web and returns probabilities for the 12 classes. It should reuse the ORT WASM path pattern from the existing sprite classifier.

The model must be exported to ONNX and quantized to INT8 with a target size under 200 KB.

## Decoder And Validation

`decoder.ts` joins classified characters, computes confidence, and validates by mode.

Opponent validation:

```text
^\d{1,3}%$
```

The numeric percent must be between 0 and 100. The output contains no `current` or `max`.

Player validation:

```text
^\d{1,3}/\d{1,3}$
```

`max` must be greater than 0 and `current <= max`. Percent is derived as `round(current / max * 100)`.

Invalid examples must be rejected:

```text
17//177
3%%
10O/177
177177
```

## Temporal Smoothing

`smoothing.ts` stores the last N valid readings per HP slot. It only majority-votes when the newest CNN confidence is weak. A high-confidence new value should update immediately so HP changes are not hidden by history.

Smoothing operates on validated strings. It never turns an invalid raw decode into a valid result by itself.

## Dataset Generation

The dataset is a single-character dataset, not a full-string dataset.

`hp-reader/training/extract_dataset.ts` should reuse the current battle/crop pipeline:

```text
training screenshots or fixtures
  -> battleView
  -> detectBattlePanels
  -> hpTextRegion
  -> preprocess/segment/merge
  -> align boxes to hp-golden string
  -> save clean one-character crops
```

For a player crop labeled `177/177`, the exporter saves seven samples:

```text
1, 7, 7, slash, 1, 7, 7
```

For an opponent crop labeled `43%`, the exporter saves three samples:

```text
4, 3, percent
```

If the merged box count does not match the expected string length, the exporter skips that plate and reports it. This is required to avoid poisoning the training set with misaligned labels.

The `.hp-debug` outputs remain useful for visual QA, but the training images must be clean normalized character crops without debug boxes drawn over them.

## Augmentation

Augmentation is applied only to character samples and never changes the label.

Allowed:

- brightness
- contrast
- gaussian noise
- jpeg compression
- gaussian blur
- translation up to 2 px
- rotation up to 3 degrees
- small scaling

Forbidden:

- flip
- mirror
- perspective warp

## Training And Export

Training uses PyTorch:

- Loss: `CrossEntropyLoss`
- Optimizer: Adam
- Batch size: 64
- Epochs: 20 to 50
- Early stopping: validation accuracy
- Target character accuracy: greater than 99.5%

Export path:

```text
train.py -> checkpoint -> export_onnx.py -> INT8 hp_classifier.onnx
```

The exported model should be tested for:

- expected input and output names
- expected tensor shape
- class order matching `classes.json`
- size under 200 KB

## Integration Strategy

Use a parallel-reader rollout:

1. Add the CNN HP reader beside the existing template reader.
2. Add scripts/tests that compare CNN results, template results, and `training/hp-golden.json`.
3. Use CNN results only when they are valid and high confidence.
4. Fall back to the existing template reader when the model is missing, confidence is low, or validation fails.
5. Promote CNN as the primary reader only after golden screenshot and browser fixture metrics justify it.

This keeps current app behavior stable while the dataset and model mature.

## Tests And Metrics

Unit tests:

- preprocessing
- connected components
- percent-aware merge algorithm
- character normalization
- decoder and regex validation
- temporal smoothing
- ONNX wrapper with a mocked session
- dataset exporter alignment and skip behavior

Integration tests:

- existing golden screenshot sweep
- browser fixture sweep
- model size check
- latency measurement for segmentation plus character inference

Success targets:

- character accuracy greater than 99.5%
- string accuracy greater than 99%
- inference under 5 ms on modern phones
- quantized model under 200 KB
- same model usable on Web, Android, and iOS

## Non-Goals

- No OCR engines.
- No alphabet classification.
- No full-string sequence model in the first implementation.
- No detector replacement.
- No attempt to infer opponent current or max HP from percentage-only UI.
