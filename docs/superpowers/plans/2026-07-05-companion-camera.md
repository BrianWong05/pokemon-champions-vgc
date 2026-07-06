# Companion-camera Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Take photo" path in the Scan modal that captures a single camera photo of a screen and runs it through the existing scan pipeline.

**Architecture:** Add `takePhoto()` (Capacitor Camera, `source: Camera`) as a sibling of `pickImage()`; wrap it in a `cameraSource` on the existing `CaptureSource` seam; wire a "Take photo" button in `ScanTeamModal` that routes through the same `scan(blob)` flow as the file picker. No scan/vision code changes.

**Tech Stack:** TypeScript, React, `@capacitor/camera` (already a dependency), Vitest.

## Global Constraints

- **No new vision code.** The photo runs through the unchanged pipeline (`ingestFrame` → `detectScanTargets`/`inferGameRect` → species + HP).
- **Reuse the `CaptureSource` seam.** `CaptureSourceKind` already includes `'camera'`; `cameraSource` mirrors `filePickerSource`.
- **Cancel is graceful** — a cancelled camera returns `null` and leaves the modal unchanged.
- **Existing 205 tests must stay green.** No component-render tests in this project (vitest `include` is `src/**/*.test.ts` only) — the modal wiring is verified by `tsc` + the full suite, not a new test.
- Verify: `npx vitest run <file>` per task; `npx tsc --noEmit` + full `npx vitest run` at the end.

---

## File Structure

- **Modify** `src/features/scan/capture.ts` — add `takePhoto()` beside `pickImage()`.
- **Modify** `src/features/scan/captureSource.ts` — add `cameraSource`.
- **Modify** `src/features/scan/captureSource.test.ts` — cover `cameraSource` (mock `takePhoto`).
- **Modify** `src/features/scan/ScanTeamModal.tsx` — "Take photo" button + framing hint + `startCamera` handler.

---

## Task 1: `takePhoto()` + `cameraSource`

**Files:**
- Modify: `src/features/scan/capture.ts`
- Modify: `src/features/scan/captureSource.ts`
- Test: `src/features/scan/captureSource.test.ts`

**Interfaces:**
- Consumes: `Camera`/`CameraSource`/`CameraResultType` (already imported in `capture.ts`); `CaptureSource`/`CapturedFrame` (existing).
- Produces: `takePhoto(): Promise<Blob | null>`; `cameraSource: CaptureSource` (`kind: 'camera'`).

- [ ] **Step 1: Write the failing test**

Add a `cameraSource` block to `src/features/scan/captureSource.test.ts`. Replace the top mock line and append the new describe block. Change:
```ts
vi.mock('./capture', () => ({ pickImage: vi.fn() }));
import { pickImage } from './capture';
import { filePickerSource } from './captureSource';

const mockPick = pickImage as unknown as ReturnType<typeof vi.fn>;
```
to:
```ts
vi.mock('./capture', () => ({ pickImage: vi.fn(), takePhoto: vi.fn() }));
import { pickImage, takePhoto } from './capture';
import { filePickerSource, cameraSource } from './captureSource';

const mockPick = pickImage as unknown as ReturnType<typeof vi.fn>;
const mockTake = takePhoto as unknown as ReturnType<typeof vi.fn>;
```
And append (after the existing `describe('filePickerSource', …)` block):
```ts
describe('cameraSource', () => {
  beforeEach(() => mockTake.mockReset());

  it('reports its kind and availability', async () => {
    expect(cameraSource.kind).toBe('camera');
    expect(await cameraSource.isAvailable()).toBe(true);
  });

  it('wraps a photo blob into a CapturedFrame', async () => {
    const blob = new Blob(['x']);
    mockTake.mockResolvedValue(blob);
    const frame = await cameraSource.capture();
    expect(frame).not.toBeNull();
    expect(frame!.blob).toBe(blob);
    expect(frame!.sourceKind).toBe('camera');
    expect(typeof frame!.capturedAt).toBe('number');
  });

  it('returns null when the camera is cancelled', async () => {
    mockTake.mockResolvedValue(null);
    expect(await cameraSource.capture()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/captureSource.test.ts`
Expected: FAIL — `takePhoto` / `cameraSource` not exported.

- [ ] **Step 3: Add `takePhoto()` to `capture.ts`**

Append to `src/features/scan/capture.ts` (below `pickImage`):
```ts
export async function takePhoto(): Promise<Blob | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
      });
      if (!photo.webPath) return null;
      return await (await fetch(photo.webPath)).blob();
    } catch {
      return null; // user cancelled or denied permission
    }
  }
  return await new Promise<Blob | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment'); // hint the rear camera on mobile web
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
```

- [ ] **Step 4: Add `cameraSource` to `captureSource.ts`**

In `src/features/scan/captureSource.ts`, change the import line:
```ts
import { pickImage } from './capture';
```
to:
```ts
import { pickImage, takePhoto } from './capture';
```
And append (below `filePickerSource`):
```ts
export const cameraSource: CaptureSource = {
  kind: 'camera',
  isAvailable: async () => true,
  async capture() {
    const blob = await takePhoto();
    if (!blob) return null;
    return { blob, sourceKind: 'camera', capturedAt: Date.now() };
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/scan/captureSource.test.ts`
Expected: PASS — 3 `filePickerSource` + 3 `cameraSource` tests.

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/capture.ts src/features/scan/captureSource.ts src/features/scan/captureSource.test.ts
git commit -m "feat(scan): cameraSource — take a photo through the CaptureSource seam"
```

---

## Task 2: "Take photo" in the Scan modal + full-suite gate

**Files:**
- Modify: `src/features/scan/ScanTeamModal.tsx`

**Interfaces:**
- Consumes: `cameraSource` (Task 1); the existing `scan`, `setPendingBlob`.

- [ ] **Step 1: Import `cameraSource`**

In `src/features/scan/ScanTeamModal.tsx`, change:
```ts
import { filePickerSource } from './captureSource';
```
to:
```ts
import { filePickerSource, cameraSource } from './captureSource';
```

- [ ] **Step 2: Add a `startCamera` handler mirroring `startPick`**

Directly below the existing `startPick` function (`const startPick = async () => { … };`), add:
```tsx
  const startCamera = async () => {
    const frame = await cameraSource.capture();
    if (frame) {
      setPendingBlob(frame.blob);
      await scan(frame.blob);
    }
  };
```

- [ ] **Step 3: Add the "Take photo" button + framing hint**

Replace the idle-state block:
```tsx
        {status === 'idle' && (
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startPick}>
            Choose screenshot
          </button>
        )}
```
with:
```tsx
        {status === 'idle' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startPick}>
                Choose screenshot
              </button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startCamera}>
                Take photo
              </button>
            </div>
            <p className="text-sm text-gray-500">Tip: hold the phone parallel to the screen and avoid glare.</p>
          </div>
        )}
```

- [ ] **Step 4: Type-check + full suite**

Run: `npx tsc --noEmit`  → Expected: PASS, no errors.
Run: `npx vitest run`     → Expected: PASS — all 205 existing + the 3 new `cameraSource` tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/ScanTeamModal.tsx
git commit -m "feat(scan): Take photo (companion camera) entry in the scan modal"
```

---

## Deferred / not this slice

Live `getUserMedia` preview + 16:9 framing-guide overlay; perspective/screen-quadrilateral un-warp for angled shots; glare/moiré mitigation; any scan-pipeline tuning for camera photos. (All in the spec's Out of scope; they become follow-ups only if the simple path scans poorly.)

---

## Self-Review

**1. Spec coverage:**
- `takePhoto()` (Capacitor Camera, source Camera, web fallback, null on cancel) → Task 1 Step 3. ✓
- `cameraSource` (kind 'camera', mirrors filePickerSource) → Task 1 Step 4. ✓
- "Take photo" button + framing hint routed through the same `scan(blob)` path → Task 2. ✓
- No new vision code → nothing under the plan touches the scan/vision modules. ✓
- `cameraSource` unit test (mock `takePhoto`) → Task 1 Step 1. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output.

**3. Type consistency:** `takePhoto(): Promise<Blob | null>` is defined in `capture.ts` (Task 1 Step 3), mocked in the test (Step 1), and consumed by `cameraSource` (Step 4). `cameraSource: CaptureSource` (`kind: 'camera'`, `CapturedFrame` shape `{ blob, sourceKind, capturedAt }`) matches `filePickerSource` and the seam. `startCamera` uses `cameraSource.capture()` → `frame.blob` → the existing `scan`, identical to `startPick`.
