# Android Capture Seam (Spec 5, Task 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `CaptureSource` seam and a platform-agnostic `scanFrame`/`ingestFrame` core so any capture source (today's file picker; later the native Android `MediaProjectionSource`; later the companion `CameraSource`) feeds the *same* scan pipeline — without a device and without changing today's behavior.

**Architecture:** Extract the pure image→result scanning logic out of the `useTeamScan` React hook into a `scanFrame(image)` function; add a thin `ingestFrame(frame)` that decodes a `CapturedFrame`'s blob and calls `scanFrame`; define a `CaptureSource` interface with a `filePickerSource` implementation wrapping the existing `pickImage()`. The hook becomes a React wrapper over `scanFrame`; `ScanTeamModal` picks images through `filePickerSource`. This is the device-independent slice of Spec 5 — the native `MediaProjectionSource` (Task 2) and the FLAG_SECURE spike (Task 0) are **deferred** and slot into the same interface later.

**Tech Stack:** TypeScript, React, Vite, Vitest (+ jsdom for hook/DOM-touching tests), Capacitor (already present).

## Global Constraints

- **HP `wrong === 0` invariant must not regress.** It is guarded by `scripts/hp-accuracy.test.ts`; run it unchanged. Do not touch `hpText.ts`, `scanTargets.ts`, or the golden data.
- **Behavior-preserving refactor.** Every existing scan test must stay green — especially `src/features/scan/useTeamScan.test.ts`, `scanImage.test.ts`, `scanTargets.test.ts`, `scanTargetsHp.test.ts`.
- **Reuse the existing dependency-injection pattern** (`TeamScanDeps`). Do not invent a second deps shape.
- **`CapturedFrame` carries a `Blob`** — the pipeline's existing currency (`blobToRgbaImage(blob)`). This refines the spec's *illustrative* `dataUrl`; native sources convert their base64 → `Blob` at their own boundary (Task 2).
- **No new runtime dependencies.** Everything uses code already in the repo.
- **`src/` unit tests stay synthetic + injected-deps** (as the current scan tests do). The `training/screenshots/` corpus is `.jpg` and needs conversion; real-image coverage stays in the existing `scripts/hp-accuracy.test.ts` golden harness — do not duplicate it in `src/`.

---

## File Structure

- **Create** `src/features/scan/captureSource.ts` — `CaptureSourceKind`, `CapturedFrame`, `CaptureSource` interface, `filePickerSource`. Depends only on `./capture` (`pickImage`).
- **Create** `src/features/scan/scanFrame.ts` — the pure pipeline lifted from the hook: `ScanEngine`, `getEngineSetting`, `TeamScanDeps`, `DEFAULT_DEPS`, `ScanFrameResult`, `scanFrame(image,…)`, `ingestFrame(frame,…)`.
- **Modify** `src/features/scan/useTeamScan.ts` — becomes a thin React wrapper importing from `./scanFrame`; re-exports `ScanEngine` (the modal imports it from here).
- **Modify** `src/features/scan/ScanTeamModal.tsx:58-64` + its imports — pick through `filePickerSource` instead of calling `pickImage()` directly.
- **Create** `src/features/scan/captureSource.test.ts` — `filePickerSource` behavior.
- **Create** `src/features/scan/scanFrame.test.ts` — `scanFrame` + `ingestFrame` behavior.

---

## Task 1: `CaptureSource` seam + `filePickerSource`

**Files:**
- Create: `src/features/scan/captureSource.ts`
- Test: `src/features/scan/captureSource.test.ts`

**Interfaces:**
- Consumes: `pickImage(): Promise<Blob | null>` from `./capture`.
- Produces:
  ```ts
  type CaptureSourceKind = 'file' | 'mediaProjection' | 'camera'
  interface CapturedFrame { blob: Blob; sourceKind: CaptureSourceKind; capturedAt: number }
  interface CaptureSource {
    readonly kind: CaptureSourceKind
    isAvailable(): Promise<boolean>
    capture(): Promise<CapturedFrame | null>   // null = user cancelled
  }
  const filePickerSource: CaptureSource
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/scan/captureSource.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./capture', () => ({ pickImage: vi.fn() }));
import { pickImage } from './capture';
import { filePickerSource } from './captureSource';

const mockPick = pickImage as unknown as ReturnType<typeof vi.fn>;

describe('filePickerSource', () => {
  beforeEach(() => mockPick.mockReset());

  it('reports its kind and availability', async () => {
    expect(filePickerSource.kind).toBe('file');
    expect(await filePickerSource.isAvailable()).toBe(true);
  });

  it('wraps a picked blob into a CapturedFrame', async () => {
    const blob = new Blob(['x']);
    mockPick.mockResolvedValue(blob);
    const frame = await filePickerSource.capture();
    expect(frame).not.toBeNull();
    expect(frame!.blob).toBe(blob);
    expect(frame!.sourceKind).toBe('file');
    expect(typeof frame!.capturedAt).toBe('number');
  });

  it('returns null when the pick is cancelled', async () => {
    mockPick.mockResolvedValue(null);
    expect(await filePickerSource.capture()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/captureSource.test.ts`
Expected: FAIL — cannot resolve `./captureSource`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/scan/captureSource.ts`:
```ts
import { pickImage } from './capture';

export type CaptureSourceKind = 'file' | 'mediaProjection' | 'camera';

export interface CapturedFrame {
  blob: Blob;
  sourceKind: CaptureSourceKind;
  capturedAt: number;
}

export interface CaptureSource {
  readonly kind: CaptureSourceKind;
  isAvailable(): Promise<boolean>;
  /** Resolves to a frame, or null if the user cancelled. */
  capture(): Promise<CapturedFrame | null>;
}

export const filePickerSource: CaptureSource = {
  kind: 'file',
  isAvailable: async () => true,
  async capture() {
    const blob = await pickImage();
    if (!blob) return null;
    return { blob, sourceKind: 'file', capturedAt: Date.now() };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/captureSource.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/captureSource.ts src/features/scan/captureSource.test.ts
git commit -m "feat(scan): CaptureSource seam + filePickerSource"
```

---

## Task 2: Extract `scanFrame` (+ `ingestFrame`) from `useTeamScan`

Behavior-preserving move of the scan logic out of the hook into a pure module, so it's testable without rendering and reusable by every capture source. The existing `useTeamScan.test.ts` is the regression guard — it must stay green.

**Files:**
- Create: `src/features/scan/scanFrame.ts`
- Modify: `src/features/scan/useTeamScan.ts`
- Test: `src/features/scan/scanFrame.test.ts`

**Interfaces:**
- Consumes: `CapturedFrame` (Task 1); `scanTeamImage`, `detectScanTargets`, `cropImage`, `matchTile`, `computeDescriptor`, `loadClassifier`, `loadReferenceDescriptors`, `filterByFormatLegal`, `blobToRgbaImage` (existing modules); types `RgbaImage`, `ReferenceEntry`, `SlotResult`, `TileBox`, `Candidate`, `ScanMode`, `Classifier`.
- Produces:
  ```ts
  type ScanEngine = 'auto' | 'classifier' | 'descriptor'
  function getEngineSetting(): ScanEngine
  interface TeamScanDeps { /* same shape as today's hook deps */ }
  const DEFAULT_DEPS: Required<TeamScanDeps>
  interface ScanFrameResult { mode: ScanMode | null; slots: SlotResult[] }
  function scanFrame(image: RgbaImage, legalIds: Set<number>, deps?: TeamScanDeps): Promise<ScanFrameResult>
  function ingestFrame(frame: CapturedFrame, legalIds: Set<number>, deps?: TeamScanDeps): Promise<ScanFrameResult>
  ```

- [ ] **Step 1: Write the failing test**

Create `src/features/scan/scanFrame.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { scanFrame, ingestFrame } from './scanFrame';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

const fakeImage: RgbaImage = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
const box = { x: 0, y: 0, w: 1, h: 1 };

function battleDeps() {
  return {
    loadRefs: async (): Promise<ReferenceEntry[]> => [],
    blobToRgbaImage: async (): Promise<RgbaImage> => fakeImage,
    scanTeamImage: (): SlotResult[] => [],
    detectScanTargets: () => ({
      mode: 'battle' as const,
      gameRect: null,
      targets: [
        { box, side: 'opponent' as const, hpPercent: 62 },
        { box, side: 'player' as const, hpPercent: 100 },
      ],
    }),
    cropImage: (): RgbaImage => fakeImage,
    matchTile: () => [{ id: 25, score: 0.9 }],
    loadClassifier: async () => null,
  };
}

describe('scanFrame', () => {
  it('returns mode + one slot per target, carrying side and hpPercent', async () => {
    const { mode, slots } = await scanFrame(fakeImage, new Set([25]), battleDeps());
    expect(mode).toBe('battle');
    expect(slots.map((s) => s.side)).toEqual(['opponent', 'player']);
    expect(slots.map((s) => s.hpPercent)).toEqual([62, 100]);
    expect(slots[0].candidates[0]).toEqual({ id: 25, score: 0.9 });
  });

  it('uses the legacy descriptor path when only the 3-dep shape is injected', async () => {
    const legacy = {
      loadRefs: async (): Promise<ReferenceEntry[]> => [],
      blobToRgbaImage: async (): Promise<RgbaImage> => fakeImage,
      scanTeamImage: (): SlotResult[] => [{ box, candidates: [{ id: 7, score: 0.5 }] }],
    };
    const { mode, slots } = await scanFrame(fakeImage, new Set([7]), legacy);
    expect(mode).toBeNull();
    expect(slots).toEqual([{ box, candidates: [{ id: 7, score: 0.5 }] }]);
  });
});

describe('ingestFrame', () => {
  it('decodes the frame blob then scans', async () => {
    const frame = { blob: new Blob(['x']), sourceKind: 'file' as const, capturedAt: 0 };
    const { mode, slots } = await ingestFrame(frame, new Set([25]), battleDeps());
    expect(mode).toBe('battle');
    expect(slots.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/scanFrame.test.ts`
Expected: FAIL — cannot resolve `./scanFrame`.

- [ ] **Step 3: Create `scanFrame.ts` (lift the logic verbatim from the hook)**

Create `src/features/scan/scanFrame.ts`:
```ts
import { scanTeamImage as realScan } from './scanImage';
import { loadReferenceDescriptors, filterByFormatLegal } from './referenceData';
import { blobToRgbaImage as realLoad } from './imageLoading';
import { cropImage } from './segmentation';
import { detectScanTargets, type ScanDetection, type ScanMode } from './scanTargets';
import { computeDescriptor } from './fingerprint';
import { matchTile } from './match';
import { loadClassifier, type Classifier } from './classifier';
import type { Candidate, ReferenceEntry, RgbaImage, SlotResult, TileBox } from './types';
import type { CapturedFrame } from './captureSource';

export type ScanEngine = 'auto' | 'classifier' | 'descriptor';

const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5;

export function getEngineSetting(): ScanEngine {
  const stored = localStorage.getItem('scan.engine');
  return stored === 'classifier' || stored === 'descriptor' ? stored : 'auto';
}

export interface TeamScanDeps {
  loadRefs: () => Promise<ReferenceEntry[]>;
  blobToRgbaImage: (blob: Blob) => Promise<RgbaImage>;
  scanTeamImage: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => SlotResult[];
  detectScanTargets?: (img: RgbaImage) => ScanDetection;
  cropImage?: (img: RgbaImage, box: TileBox) => RgbaImage;
  matchTile?: (img: RgbaImage, refs: ReferenceEntry[], topN: number) => Candidate[];
  loadClassifier?: () => Promise<Classifier | null>;
}

export const DEFAULT_DEPS: Required<TeamScanDeps> = {
  loadRefs: loadReferenceDescriptors,
  blobToRgbaImage: realLoad,
  scanTeamImage: realScan,
  detectScanTargets,
  cropImage,
  matchTile: (img, refs, topN) => matchTile(computeDescriptor(img), refs, topN),
  loadClassifier,
};

export interface ScanFrameResult {
  mode: ScanMode | null;
  slots: SlotResult[];
}

export async function scanFrame(
  image: RgbaImage,
  legalIds: Set<number>,
  deps: TeamScanDeps = DEFAULT_DEPS,
): Promise<ScanFrameResult> {
  const engine = getEngineSetting();
  const refs = filterByFormatLegal(await deps.loadRefs(), legalIds);

  // Callers that inject only the legacy 3-dep shape (no target/classifier deps
  // overridden) get the original scanTeamImage-only behavior, regardless of the
  // engine setting — there's no classifier/target pipeline to route through.
  const hasTargetPipelineDeps =
    deps.detectScanTargets != null ||
    deps.cropImage != null ||
    deps.matchTile != null ||
    deps.loadClassifier != null;

  if (engine === 'descriptor' || (engine !== 'classifier' && !hasTargetPipelineDeps)) {
    console.log('[scan] engine: descriptor');
    return { mode: null, slots: deps.scanTeamImage(image, refs, 3) };
  }

  const detectTargets = deps.detectScanTargets ?? DEFAULT_DEPS.detectScanTargets;
  const crop = deps.cropImage ?? DEFAULT_DEPS.cropImage;
  const matchTileFn = deps.matchTile ?? DEFAULT_DEPS.matchTile;
  const loadClassifierFn = deps.loadClassifier ?? DEFAULT_DEPS.loadClassifier;

  const classifier = await loadClassifierFn();
  const { mode, targets } = detectTargets(image);
  const slots: SlotResult[] = [];
  for (const { box, side, hpPercent } of targets) {
    const tile = crop(image, box);
    const classifierCandidates = classifier ? await classifier.classify(tile, legalIds, 3) : [];
    const useDescriptorFallback =
      engine === 'auto' && (!classifier || (classifierCandidates[0]?.score ?? 0) < CLASSIFIER_CONFIDENCE_THRESHOLD);
    const candidates = useDescriptorFallback ? matchTileFn(tile, refs, 3) : classifierCandidates;
    slots.push({ box, side, hpPercent, candidates });
  }
  console.log(`[scan] mode: ${mode}, engine: ${classifier ? 'classifier' : 'descriptor'} (${engine})`);
  return { mode, slots };
}

export async function ingestFrame(
  frame: CapturedFrame,
  legalIds: Set<number>,
  deps: TeamScanDeps = DEFAULT_DEPS,
): Promise<ScanFrameResult> {
  const image = await deps.blobToRgbaImage(frame.blob);
  return scanFrame(image, legalIds, deps);
}
```

- [ ] **Step 4: Rewrite `useTeamScan.ts` as a thin wrapper**

Replace the entire contents of `src/features/scan/useTeamScan.ts` with:
```ts
import { useCallback, useState } from 'react';
import { scanFrame, DEFAULT_DEPS, type TeamScanDeps } from './scanFrame';
import { type ScanMode } from './scanTargets';
import type { SlotResult } from './types';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';
export type { ScanEngine } from './scanFrame';
export { DEFAULT_DEPS, type TeamScanDeps } from './scanFrame';

export function useTeamScan(legalIds: Set<number>, deps: TeamScanDeps = DEFAULT_DEPS) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (blob: Blob) => {
    setStatus('scanning'); setError(null);
    try {
      const image = await deps.blobToRgbaImage(blob);
      const result = await scanFrame(image, legalIds, deps);
      setMode(result.mode);
      setSlots(result.slots);
      setStatus('done');
    } catch (e) {
      console.error('[scan] failed', e);
      setError((e as Error).message); setStatus('error');
    }
  }, [legalIds, deps]);

  const reset = useCallback(() => { setStatus('idle'); setSlots([]); setMode(null); setError(null); }, []);

  return { status, slots, mode, error, scan, reset };
}
```

- [ ] **Step 5: Run the new tests + the hook regression test**

Run: `npx vitest run src/features/scan/scanFrame.test.ts src/features/scan/useTeamScan.test.ts`
Expected: PASS — 3 new `scanFrame`/`ingestFrame` tests + all existing `useTeamScan` tests green (behavior preserved).

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/scanFrame.ts src/features/scan/scanFrame.test.ts src/features/scan/useTeamScan.ts
git commit -m "refactor(scan): extract scanFrame/ingestFrame core from useTeamScan"
```

---

## Task 3: Route the modal's file pick through `filePickerSource` + full-suite gate

**Files:**
- Modify: `src/features/scan/ScanTeamModal.tsx` (imports + `startPick`, ~lines 10 and 58-64)

**Interfaces:**
- Consumes: `filePickerSource` (Task 1).

- [ ] **Step 1: Swap `pickImage` for `filePickerSource` in the modal**

In `src/features/scan/ScanTeamModal.tsx`, change the import (currently `import { pickImage } from './capture';`) to:
```ts
import { filePickerSource } from './captureSource';
```

Then replace `startPick` (currently lines 58-64):
```ts
  const startPick = async () => {
    const blob = await pickImage();
    if (blob) {
      setPendingBlob(blob);
      await scan(blob);
    }
  };
```
with:
```ts
  const startPick = async () => {
    const frame = await filePickerSource.capture();
    if (frame) {
      setPendingBlob(frame.blob);
      await scan(frame.blob);
    }
  };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS, no errors. (Confirms `pickImage` has no other users and the modal compiles against the seam.)

- [ ] **Step 3: Run the scan suite + the HP invariant**

Run: `npx vitest run src/features/scan scripts/hp-accuracy.test.ts`
Expected: PASS — all scan tests green and the golden floor test reports **wrong 0** (unchanged; this task touched no reader code).

- [ ] **Step 4: Full suite**

Run: `npx vitest run`
Expected: PASS — no regressions anywhere.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/ScanTeamModal.tsx
git commit -m "refactor(scan): pick images through the CaptureSource seam"
```

---

## Deferred (out of scope for this plan)

These slot into the same `CaptureSource` interface later; **do not build them here**:
- **Task 0 — FLAG_SECURE spike** (Appendix A of the spec): a device/emulator go/no-go. Blocks Task 2. No Android+Champions device is currently available.
- **Task 2 — native `MediaProjectionSource`** (`kind: 'mediaProjection'`, already in the union): the Kotlin `ScreenCapturePlugin`, foreground service, overlay button, and consent/session flow. Gated on the spike returning GO **and** a physical device. It will convert its captured Bitmap → `Blob` and return a `CapturedFrame`, then flow through the exact `ingestFrame` built here.

---

## Self-Review

**1. Spec coverage (Task 1 scope):**
- CaptureSource interface + CapturedFrame → Task 1. ✓
- FilePickerSource (refactor of today's file/photo scan) → Task 1 + Task 3 (call site). ✓
- Platform-agnostic ingestFrame layer over detectScanTargets → scanImage + HP → Task 2 (`scanFrame`/`ingestFrame`). HP arrives via `detectScanTargets` targets' `hpPercent`, preserved. ✓
- CI tests on the scan core (species + HP wiring), wrong===0 preserved → Task 2 tests (synthetic + DI) + Task 3's run of `scripts/hp-accuracy.test.ts`. ✓
- Native source + spike explicitly deferred, interface stubbed via the `kind` union → Deferred section. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. ✓

**3. Type consistency:** `TeamScanDeps`, `DEFAULT_DEPS`, `ScanFrameResult`, `scanFrame`, `ingestFrame`, `CapturedFrame`, `filePickerSource`, `CaptureSourceKind` are used identically across tasks. `ScanEngine` is defined in `scanFrame.ts` and re-exported from `useTeamScan.ts` so `ScanTeamModal`'s existing `import { …, type ScanEngine } from './useTeamScan'` keeps resolving. ✓
