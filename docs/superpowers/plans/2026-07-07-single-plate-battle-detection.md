# Single-Plate Battle Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Battle frames with a single HP nameplate on either side (doubles endgame, all singles battles) route to battle mode instead of misrouting to team mode — verified by a new zero-wrong-modes golden harness over 22 real frames.

**Architecture:** A new plate-internals verifier (`plateVerify.ts`) recognizes a real battle plate by its HP-bar strip; `scanTargets.ts`'s mode vote becomes a 4-rung hierarchy (pair → battle; ≥4 cards → team; verified plate either side → battle; else team); `gameRect.ts` gains single-plate rect hypotheses validated by re-detection; a harness-shaped golden file + runner + floor test pin it all. Spec: `docs/superpowers/specs/2026-07-06-single-plate-battle-detection-design.md`.

**Tech Stack:** TypeScript, Vitest (colocated `*.test.ts`, run from repo root), pure pixel JS on `RgbaImage` (no canvas, no ORT, no new dependencies), `npx tsx` for scripts.

## Global Constraints

- **Zero wrong modes** on `training/scan-golden.json` outside explicit `knownMiss` entries — the hard invariant (analog of the HP reader's `wrong === 0`).
- **Rung 1 (opponent plate pair → battle) must remain byte-for-byte the current behavior** — all 32 existing HP-golden battle frames and every existing test must keep passing unchanged.
- No new npm dependencies. No OCR engines. All detection stays pure pixel JS.
- `inferGameRect`'s existing export keeps its current semantics (stack → pair only) — `scripts/hp-accuracy-core.ts`'s `battleView` depends on it and has no validation step; single-plate hypotheses are exposed ONLY through the new `inferGameRectCandidates`.
- Branch: `feat/single-plate-detection`. Fresh worktrees need `npm install --legacy-peer-deps` before tests.
- Run focused tests with `npx vitest run <path>`; full suite with `npm test`; types with `npx tsc --noEmit`.
- Commit with exact file paths (never `git add -A`).

---

### Task 1: Plate-internals verifier (`plateVerify.ts`)

**Files:**
- Create: `src/features/scan/plateVerify.ts`
- Test: `src/features/scan/plateVerify.test.ts`

**Interfaces:**
- Consumes: `rgbToHsv` from `./segmentation` (exported, returns `[h, s, v]` with h in 0–360, s/v in 0–1); `readHpFromPanel(img, panel, templates?, kind?)` from `./hpText` (returns `{ percent, ... } | null`); types `RgbaImage`, `TileBox` from `./types`.
- Produces: `isBattlePlate(img: RgbaImage, panel: TileBox, kind: 'percent' | 'fraction'): boolean` and `hasHpBarStrip(img: RgbaImage, panel: TileBox): boolean` — Task 2's mode vote calls `isBattlePlate`.

**Why this shape:** a battle plate always contains an HP bar — a horizontally-elongated strip whose pixels are FILL (green/yellow/orange/true-red) or dark TRACK (the drained remainder), always fill-anchored at the LEFT end. Team-preview cards never have one. `measureHpBarFill` in `hpText.ts` cannot be reused directly: its per-row gate `r.run < panel.w * 0.08` requires an 8%-wide FILL run, so a 2%-HP bar returns null. The verifier keys on the whole strip (fill start + track continuation), so both extremes pass (spec §2).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/scan/plateVerify.test.ts
import { describe, it, expect } from 'vitest';
import { hasHpBarStrip, isBattlePlate } from './plateVerify';
import type { RgbaImage, TileBox } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

// Magenta plate whose lower band holds an HP bar: green fill for fillFrac of
// the strip, dark track for the rest. Returns the panel box a detector would
// find (the strip splits the blob, so the detected panel is the TOP band —
// mirrors the real "short blob" behavior measureHpBarFill was built for).
function paintPlate(img: RgbaImage, x: number, y: number, w: number, h: number, fillFrac: number): TileBox {
  fillRect(img, x, y, w, h, 220, 40, 120);
  const barY = y + Math.round(h * 0.72);
  const barH = Math.max(3, Math.round(h * 0.15));
  const barX = x + 6;
  const barW = w - 12;
  const fillW = Math.max(2, Math.round(barW * fillFrac));
  fillRect(img, barX, barY, fillW, barH, 60, 200, 80);            // fill (green)
  if (fillW < barW) fillRect(img, barX + fillW, barY, barW - fillW, barH, 35, 35, 40); // track (dark)
  return { x, y, w, h: barY - y }; // top band, like a fragmented blob
}

describe('hasHpBarStrip', () => {
  it('accepts a mid bar, a near-empty (2%) bar, and a full (100%) bar', () => {
    for (const frac of [0.5, 0.02, 1.0]) {
      const img = blank(1250, 700);
      const panel = paintPlate(img, 900, 40, 200, 48, frac);
      expect(hasHpBarStrip(img, panel), `fillFrac ${frac}`).toBe(true);
    }
  });

  it('accepts the same strip at a low source resolution', () => {
    const img = blank(640, 360);
    const panel = paintPlate(img, 440, 20, 110, 26, 0.4);
    expect(hasHpBarStrip(img, panel)).toBe(true);
  });

  it('rejects a plain card-like blob with no strip', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 40, 200, 48, 220, 40, 120);
    expect(hasHpBarStrip(img, { x: 900, y: 40, w: 200, h: 48 })).toBe(false);
  });

  it('rejects misaligned organic runs (card sprite shadow)', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 40, 200, 60, 220, 40, 120);
    // Three long fill-anchored runs at jumping offsets: each passes the span
    // gate (110 >= 200*0.5) and starts with fill, but starts differ by 40px
    // (> max(4, 200*0.05)=10) so the 3-row alignment requirement rejects them.
    for (const [x, y] of [[905, 74], [945, 76], [985, 78]] as const) {
      fillRect(img, x, y, 8, 2, 60, 200, 80);          // fill anchor
      fillRect(img, x + 8, y, 102, 2, 35, 35, 40);     // dark run
    }
    expect(hasHpBarStrip(img, { x: 900, y: 40, w: 200, h: 34 })).toBe(false);
  });

  it('rejects a dark floor band with no fill anchor (track-only rows)', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 40, 200, 30, 220, 40, 120);   // plate top band
    fillRect(img, 880, 80, 240, 20, 30, 30, 34);     // dark arena floor below
    expect(hasHpBarStrip(img, { x: 900, y: 40, w: 200, h: 30 })).toBe(false);
  });
});

describe('isBattlePlate', () => {
  it('bar strip alone is sufficient (no readable HP text needed)', () => {
    const img = blank(1250, 700);
    const panel = paintPlate(img, 900, 40, 200, 48, 0.5);
    expect(isBattlePlate(img, panel, 'percent')).toBe(true);
  });

  it('rejects a bare magenta banner', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 20, 200, 40, 210, 45, 120);
    expect(isBattlePlate(img, { x: 900, y: 20, w: 200, h: 40 }, 'percent')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/scan/plateVerify.test.ts`
Expected: FAIL — `Cannot find module './plateVerify'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/scan/plateVerify.ts
// Verifies that a detected panel blob is a REAL battle nameplate by finding
// its HP bar: a horizontally-elongated strip in the plate's lower band whose
// pixels are FILL (green/yellow/orange/true-red) or dark TRACK, always
// anchored by fill at the LEFT end. Team-preview cards have no such strip —
// this is what lets a SINGLE plate win battle mode without re-introducing
// the team-preview false positive (see the spec's mode-vote hierarchy).
import { rgbToHsv } from './segmentation';
import { readHpFromPanel } from './hpText';
import type { RgbaImage, TileBox } from './types';

// Same fill gate as hpText's measureHpBarFill (excludes the magenta plate
// body, h~325-345); track = the dark desaturated drained remainder.
function classifyPixel(img: RgbaImage, x: number, y: number): 'fill' | 'track' | 'other' {
  const i = (y * img.width + x) * 4;
  const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
  if (s > 0.45 && v > 0.35 && (h < 140 || h >= 350)) return 'fill';
  if (s < 0.4 && v < 0.45) return 'track';
  return 'other';
}

export function hasHpBarStrip(img: RgbaImage, panel: TileBox): boolean {
  // Window mirrors measureHpBarFill's short-blob handling: the detected blob
  // is often only the plate's top band, so search below it too.
  const y0 = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.35));
  const y1 = Math.min(img.height, panel.y + Math.round(panel.h * 2.2));
  const x0 = Math.max(0, panel.x);
  const x1 = Math.min(img.width, panel.x + panel.w);
  if (x1 - x0 < 8 || y1 - y0 < 3) return false;

  // Longest run per row of (fill | track) that BEGINS with a fill pixel —
  // the fill anchor rejects track-only bands (dark arena floor, shadows).
  const rows: Array<{ run: number; start: number }> = [];
  for (let y = y0; y < y1; y++) {
    let run = 0, maxRun = 0, start = -1, curStart = -1;
    for (let x = x0; x < x1; x++) {
      const kind = classifyPixel(img, x, y);
      if (run === 0) {
        if (kind === 'fill') { run = 1; curStart = x; }
      } else if (kind === 'fill' || kind === 'track') {
        run++;
      } else {
        if (run > maxRun) { maxRun = run; start = curStart; }
        run = 0;
      }
    }
    if (run > maxRun) { maxRun = run; start = curStart; }
    rows.push({ run: maxRun, start });
  }

  // The strip is a BAND: >=3 adjacent rows with long runs, aligned in length
  // and start column. Organic sprite/effect shapes fail alignment or span.
  const minRun = (x1 - x0) * 0.5;
  const aligned = (a: { run: number; start: number }, b: { run: number; start: number }) =>
    b.run >= a.run * 0.75 && Math.abs(b.start - a.start) < Math.max(4, panel.w * 0.05);
  for (let k = 1; k < rows.length - 1; k++) {
    const r = rows[k];
    if (r.run < minRun || r.start < 0) continue;
    const neighbors = [rows[k - 1], rows[k + 1]];
    if (neighbors.every((n) => n.start >= 0 && aligned(r, n))) return true;
  }
  return false;
}

// Second acceptance path: a readable HP value is precision-perfect evidence
// (the reader's wrong===0 invariant), adding recall on degraded bars.
export function isBattlePlate(img: RgbaImage, panel: TileBox, kind: 'percent' | 'fraction'): boolean {
  return hasHpBarStrip(img, panel) || readHpFromPanel(img, panel, undefined, kind) != null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/scan/plateVerify.test.ts`
Expected: PASS (7 tests). Sanity notes: the misaligned-runs test must be rejected by the ALIGNMENT check (runs land inside the search window — `panel.h = 34` → window rows 51…114 — and pass the span gate); the dark-floor test must be rejected by the FILL-ANCHOR rule (track pixels never start a run). If either passes for the wrong reason, fix the test geometry, not the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/features/scan/plateVerify.ts src/features/scan/plateVerify.test.ts
git commit -m "feat: HP-bar-strip plate verifier (fill-anchored band, both extremes)"
```

---

### Task 2: 4-rung mode-vote hierarchy

**Files:**
- Modify: `src/features/scan/battleDetection.ts:153` (`detectBattleIcons` signature)
- Modify: `src/features/scan/scanTargets.ts:35-65` (`battleTargets`, `detect`)
- Test: `src/features/scan/scanTargets.test.ts` (add cases; existing cases untouched)

**Interfaces:**
- Consumes: `isBattlePlate(img, panel, kind)` from Task 1.
- Produces: `detectBattleIcons(img: RgbaImage, side: BattleSide, panels?: TileBox[]): TileBox[]` (default `panels = detectBattlePanels(img, side)` — existing callers unaffected). `detect()`'s public wrapper `detectScanTargets` keeps its exact signature.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/scan/scanTargets.test.ts` (reuse the file's existing `blank`/`fillRect`/`paintTeamSelect` helpers; add `paintBattlePlate` below them at module scope):

```typescript
// Battle plate WITH an HP bar strip (fill-anchored, dark remainder) so the
// single-plate verifier rung can accept it. Colors match the existing tests'
// plate colors (opponent magenta 220/40/120, player indigo 80/60/190).
function paintBattlePlate(
  img: RgbaImage, x: number, y: number, w: number, h: number,
  side: 'opponent' | 'player', fillFrac = 0.5,
) {
  const [r, g, b] = side === 'opponent' ? [220, 40, 120] : [80, 60, 190];
  fillRect(img, x, y, w, h, r, g, b);
  const barY = y + Math.round(h * 0.72);
  const barH = Math.max(3, Math.round(h * 0.15));
  const fillW = Math.max(2, Math.round((w - 12) * fillFrac));
  fillRect(img, x + 6, barY, fillW, barH, 60, 200, 80);
  if (fillW < w - 12) fillRect(img, x + 6 + fillW, barY, w - 12 - fillW, barH, 35, 35, 40);
}

describe('single-plate battle detection (mode-vote rung 3)', () => {
  // Slot x-positions inside a full 1250x700 frame, per the pair geometry the
  // existing pair test uses (left plate at 720, right at 960).
  const OPP = { left: 720, right: 960, y: 30, w: 160, h: 40 };
  const PLAYER = { left: 40, right: 300, y: 600, w: 160, h: 40 };

  it('1 opponent plate + 2 player plates -> battle', () => {
    const img = blank(1250, 700);
    paintBattlePlate(img, OPP.right, OPP.y, OPP.w, OPP.h, 'opponent', 0.02); // near-empty bar
    paintBattlePlate(img, PLAYER.left, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
    paintBattlePlate(img, PLAYER.right, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.filter((t) => t.side === 'opponent').length).toBe(1);
    expect(targets.filter((t) => t.side === 'player').length).toBe(2);
  });

  it('1v1 -> battle, at every slot combination on both sides', () => {
    for (const oppX of [OPP.left, OPP.right]) for (const playerX of [PLAYER.left, PLAYER.right]) {
      const img = blank(1250, 700);
      paintBattlePlate(img, oppX, OPP.y, OPP.w, OPP.h, 'opponent');
      paintBattlePlate(img, playerX, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
      const { mode, targets } = detectScanTargets(img);
      expect(mode, `opp@${oppX} player@${playerX}`).toBe('battle');
      expect(targets.length, `opp@${oppX} player@${playerX}`).toBe(2);
    }
  });

  it('1 opponent plate + 0 player plates -> battle', () => {
    const img = blank(1250, 700);
    paintBattlePlate(img, OPP.right, OPP.y, OPP.w, OPP.h, 'opponent', 1.0); // full bar
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.length).toBe(1);
  });

  it('0 opponent + 1 verified player plate -> battle (either-side evidence)', () => {
    const img = blank(1250, 700);
    paintBattlePlate(img, PLAYER.left, PLAYER.y, PLAYER.w, PLAYER.h, 'player');
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(targets.filter((t) => t.side === 'player').length).toBe(1);
  });

  it('a bare magenta banner (no bar strip) on an empty frame stays team', () => {
    const img = blank(1250, 700);
    fillRect(img, 900, 20, 200, 40, 210, 45, 120);
    const { mode, targets } = detectScanTargets(img);
    expect(mode).toBe('team');
    expect(targets.length).toBe(0);
  });
});
```

Note: the existing test `'a single plate-like blob does not flip a team screenshot to battle'` (line 54) is the card-stack-guard regression and MUST keep passing unmodified.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/features/scan/scanTargets.test.ts`
Expected: the 5 new tests FAIL (mode is `'team'`); the 5 existing tests still PASS.

- [ ] **Step 3: Implement**

In `src/features/scan/battleDetection.ts`, change `detectBattleIcons` to accept pre-detected panels (line 153):

```typescript
export function detectBattleIcons(
  img: RgbaImage,
  side: BattleSide,
  panels: TileBox[] = detectBattlePanels(img, side),
): TileBox[] {
  const mask = panelMask(img, SIDES[side]);
  const minArea = Math.max(40, Math.floor(img.width * img.height * 0.0001));
  const blobs = connectedComponents(mask, img.width, img.height, minArea);
  return panels.map((panel) => {
    const inBlob = badgeBoxFromPanel(mask, img.width, panel);
    if (inBlob && inBlob.x - panel.x < panel.w * 0.35) return iconBoxFromBadge(inBlob, img);
    const detached = detachedBadgeNearPanel(blobs, panel);
    if (detached) return iconBoxFromBadge(detached, img);
    return battleIconFromPanel(panel, img);
  });
}
```

(The only change is the `panels` parameter replacing the internal `detectBattlePanels(img, side).map(...)` call.)

In `src/features/scan/scanTargets.ts`, add the import and rework `battleTargets` + `detect`:

```typescript
import { isBattlePlate } from './plateVerify';
```

```typescript
function battleTargets(
  img: RgbaImage,
  side: ScanSide,
  panels: TileBox[] = detectBattlePanels(img, side),
): ScanTarget[] {
  const icons = detectBattleIcons(img, side, panels);
  return panels.map((panel, i) => ({
    box: icons[i],
    side,
    hpPercent: readHpFromPanel(img, panel, undefined, side === 'opponent' ? 'percent' : 'fraction')?.percent ?? null,
  })).filter((target) => target.box != null);
}
```

```typescript
function detect(img: RgbaImage): { mode: ScanMode; targets: ScanTarget[] } {
  // Rung 1: the opponent plate pair — unchanged, zero regression risk.
  const oppPanels = detectBattlePanels(img, 'opponent');
  if (isPlatePairRow(oppPanels)) {
    return { mode: 'battle', targets: [...battleTargets(img, 'opponent', oppPanels), ...battleTargets(img, 'player')] };
  }
  // Rung 2: card-stack guard — a genuine team screen is decided by its
  // strongest structure before single-plate evidence is consulted (the
  // clipped magenta top card can otherwise masquerade as a plate).
  const team = teamTargets(img);
  if (team.filter((t) => t.side === 'opponent').length >= 4) {
    return { mode: 'team', targets: team };
  }
  // Rung 3: any panel on EITHER side verified as a real battle plate (HP
  // bar strip / readable HP) wins battle mode. Only verified panels become
  // targets — an unverified magenta blob next to a verified plate stays out.
  const verifiedOpp = oppPanels.filter((p) => isBattlePlate(img, p, 'percent'));
  const verifiedPlayer = detectBattlePanels(img, 'player').filter((p) => isBattlePlate(img, p, 'fraction'));
  if (verifiedOpp.length || verifiedPlayer.length) {
    return {
      mode: 'battle',
      targets: [...battleTargets(img, 'opponent', verifiedOpp), ...battleTargets(img, 'player', verifiedPlayer)],
    };
  }
  // Rung 4: today's fallback.
  return { mode: 'team', targets: team };
}
```

Also update the file-header comment (lines 2–8): replace the sentence `battle iff BOTH opponent plates are found (the top card of a team-preview opponent column is also magenta and would false-positive a single-panel rule).` with:

```
// battle iff the opponent plate PAIR is found, or — for one-Pokemon-left and
// singles frames — a panel on either side verifies as a real battle plate
// (HP-bar strip; see plateVerify.ts). A >=4-card stack decides team FIRST,
// so the magenta top card of a team-preview column can't masquerade as a
// single plate.
```

- [ ] **Step 4: Run the scan test files**

Run: `npx vitest run src/features/scan/scanTargets.test.ts src/features/scan/battleDetection.test.ts src/features/scan/plateVerify.test.ts`
Expected: ALL PASS (existing + 5 new).

- [ ] **Step 5: Run the full suite to catch regressions**

Run: `npm test`
Expected: all tests pass (the HP floor test `scripts/hp-accuracy.test.ts` is the critical one — rung 1 untouched means it must be unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/battleDetection.ts src/features/scan/scanTargets.ts src/features/scan/scanTargets.test.ts
git commit -m "feat: 4-rung mode vote — verified single plates win battle mode"
```

---

### Task 3: Single-plate game-rect hypotheses

**Files:**
- Create: `scripts/measure-plate-slots.ts`
- Modify: `src/features/scan/gameRect.ts` (add `PLATE_SLOTS`, `inferGameRectCandidates`; `inferGameRect` UNCHANGED)
- Modify: `src/features/scan/scanTargets.ts:74-94` (`detectScanTargets` candidate loop)
- Test: `src/features/scan/scanTargets.test.ts` (add rect cases)

**Interfaces:**
- Consumes: `magentaBlobs`, `findCardStack`, `findPlatePair`, `solveRect`, `OPP_COLUMN`, `PLATE_PAIR` (all already in `gameRect.ts`); `loadPng`, `resolveGoldenPng` from `scripts/hp-accuracy-core.ts`; `detectBattlePanels` from `../src/features/scan/battleDetection`.
- Produces: `export const PLATE_SLOTS: { left: {x0,x1,y0}, right: {x0,x1,y0} }` and `export function inferGameRectCandidates(img: RgbaImage): TileBox[]` — consumed by `detectScanTargets` and by the rect tests (tests import `PLATE_SLOTS` so slot-constant refinements never break them).

- [ ] **Step 1: Write and run the slot-measurement script**

```typescript
// scripts/measure-plate-slots.ts
// Prints each opponent plate's frame-fraction bounds on the native full-frame
// 2v2 golden screenshots — the source for gameRect's PLATE_SLOTS constants.
// Run: npx tsx scripts/measure-plate-slots.ts
import { detectBattlePanels } from '../src/features/scan/battleDetection';
import { loadPng, resolveGoldenPng } from './hp-accuracy-core';

const FRAMES = [
  'Xnip2026-07-01_03-26-01.png',
  'Xnip2026-07-01_19-38-20.png',
  'Xnip2026-07-01_05-34-16.png',
  'Xnip2026-07-01_18-08-40.png',
];
for (const f of FRAMES) {
  const img = loadPng(resolveGoldenPng(f, 'training/screenshots'));
  const panels = detectBattlePanels(img, 'opponent');
  panels.forEach((p, i) => {
    console.log(
      f, panels.length === 2 ? (i === 0 ? 'left ' : 'right') : 'only',
      'x0', (p.x / img.width).toFixed(3),
      'x1', ((p.x + p.w) / img.width).toFixed(3),
      'y0', (p.y / img.height).toFixed(3),
    );
  });
}
```

Run: `npx tsx scripts/measure-plate-slots.ts`
Expected: ~8 lines. Average the left plates' `x0`/`x1` and the right plates' `x0`/`x1` (y0 should sit near 0.037 for all). If a frame prints fewer than 2 panels, drop it from the average — do not chase it.

- [ ] **Step 2: Add `PLATE_SLOTS` and `inferGameRectCandidates` to `gameRect.ts`**

Insert after the `PLATE_PAIR` constant (line 16). The values below are the geometric split of `PLATE_PAIR` — concrete and sufficient for the synthetic tests; replace them with the measured averages from Step 1 (tests import `PLATE_SLOTS`, so refinement can't break them):

```typescript
// Per-plate slot priors for SINGLE-plate battle frames (one Pokemon left /
// singles). Values measured by scripts/measure-plate-slots.ts over the
// native 2v2 goldens; singletons occupy EITHER slot (spec: both mandatory).
export const PLATE_SLOTS = {
  left: { x0: 0.575, x1: 0.735, y0: 0.037 },
  right: { x0: 0.785, x1: 0.945, y0: 0.037 },
};
```

Append at the end of the file (leaving `inferGameRect` exactly as it is):

```typescript
// Ordered candidate rects for detectScanTargets' rescue loop: strongest
// anchors first, then single-plate slot hypotheses (right before left —
// most observed singletons sit right). Validation is the CALLER's job:
// magentaBlobs sweeps the whole image, so shiny plate-colored Pokemon
// bodies produce junk candidates that only re-detection can reject.
export function inferGameRectCandidates(img: RgbaImage): TileBox[] {
  const blobs = magentaBlobs(img);
  const out: TileBox[] = [];
  const push = (r: TileBox | null) => {
    if (r && !out.some((o) => Math.abs(o.x - r.x) < 4 && Math.abs(o.w - r.w) < 4)) out.push(r);
  };
  const stack = findCardStack(blobs);
  if (stack) push(solveRect(stack, OPP_COLUMN, img));
  const pair = findPlatePair(blobs);
  if (pair) push(solveRect(pair, PLATE_PAIR, img));
  const singles = blobs
    .filter((b) => b.w / b.h >= 2 && b.w / b.h <= 12)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, 3);
  for (const s of singles) {
    push(solveRect(s, PLATE_SLOTS.right, img));
    push(solveRect(s, PLATE_SLOTS.left, img));
  }
  return out;
}
```

- [ ] **Step 3: Write the failing rect tests**

Append to `src/features/scan/scanTargets.test.ts` (imports: add `PLATE_SLOTS` to the existing `./gameRect` import line):

```typescript
describe('single-plate game-rect inference', () => {
  // Paint one opponent plate + one player plate INSIDE a game sub-rectangle,
  // at the exported slot fractions so constant refinements keep tests true.
  // The game is deliberately SMALL (640 wide in a 1600 frame): the plate is
  // then ~6.4% of frame width, UNDER detectBattlePanels' 7% floor, so the
  // fast path finds nothing and the rescue loop is genuinely exercised
  // (with a larger game the fast path's rung 3 would already succeed and
  // gameRect would legitimately stay null).
  function paintLetterboxed(slot: { x0: number; x1: number; y0: number }) {
    const img = blank(1600, 1200);
    const game = { x: 480, y: 300, w: 640, h: 360 };
    const px = game.x + Math.round(game.w * slot.x0);
    const pw = Math.round(game.w * (slot.x1 - slot.x0));
    const py = game.y + Math.round(game.h * slot.y0);
    const ph = Math.round(game.h * 0.06);
    paintBattlePlate(img, px, py, pw, ph, 'opponent');
    paintBattlePlate(img, game.x + 40, game.y + Math.round(game.h * 0.88), pw, ph, 'player');
    return { img, game };
  }

  it('recovers the rect from a single plate at the RIGHT slot', () => {
    const { img, game } = paintLetterboxed(PLATE_SLOTS.right);
    const { mode, gameRect } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(gameRect).not.toBeNull();
    expect(Math.abs(gameRect!.x - game.x)).toBeLessThan(game.w * 0.08);
    expect(Math.abs(gameRect!.w - game.w)).toBeLessThan(game.w * 0.08);
  });

  it('recovers the rect from a single plate at the LEFT slot', () => {
    const { img, game } = paintLetterboxed(PLATE_SLOTS.left);
    const { mode, gameRect } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(gameRect).not.toBeNull();
    expect(Math.abs(gameRect!.x - game.x)).toBeLessThan(game.w * 0.08);
  });

  it('a plate-shaped junk blob does not hijack the rect (validation wins)', () => {
    const { img, game } = paintLetterboxed(PLATE_SLOTS.right);
    // Shiny-model fragment: plate-aspect magenta blob, LARGER than the real
    // plate so its hypotheses are tried FIRST. Its solved rects sit far below
    // the game area (y anchor ~0.037 puts the crop at ~y 770), so re-detection
    // inside them finds nothing and the loop falls through to the real plate.
    fillRect(img, 700, 800, 220, 70, 235, 45, 130);
    const { mode, gameRect } = detectScanTargets(img);
    expect(mode).toBe('battle');
    expect(gameRect).not.toBeNull();
    expect(Math.abs(gameRect!.x - game.x)).toBeLessThan(game.w * 0.08);
  });
});
```

Run: `npx vitest run src/features/scan/scanTargets.test.ts`
Expected: the 3 new tests FAIL (mode `'team'` / `gameRect` null — the rescue path has no single-plate anchor yet).

- [ ] **Step 4: Rework `detectScanTargets` to loop candidates**

Replace the body of `detectScanTargets` in `src/features/scan/scanTargets.ts` (change the `./gameRect` import from `inferGameRect` to `inferGameRectCandidates`):

```typescript
export function detectScanTargets(img: RgbaImage, allowInfer = true): ScanDetection {
  const fast = detect(img);
  if (isConfident(fast) || !allowInfer) return { ...fast, gameRect: null };

  // Try candidate game rects strongest-anchor-first; the first one whose
  // re-detection is CONFIDENT wins. Single-plate hypotheses (and junk blobs
  // from plate-colored Pokemon bodies) are validated by this re-detection —
  // a wrong rect yields no verified plates / no card column and is skipped.
  let fallback: ScanDetection | null = null;
  for (const rect of inferGameRectCandidates(img)) {
    const inner = detect(cropImage(img, rect));
    const shifted: ScanDetection = {
      mode: inner.mode,
      gameRect: rect,
      targets: inner.targets.map((t) => ({
        ...t,
        box: { ...t.box, x: t.box.x + rect.x, y: t.box.y + rect.y },
      })),
    };
    if (isConfident(inner)) return shifted;
    if (!fallback && inner.targets.length > fast.targets.length) fallback = shifted;
  }
  return fallback ?? { ...fast, gameRect: null };
}
```

(Behavior parity with the old code for the stack/pair candidate: confident inner wins; otherwise more-targets-than-fast wins; otherwise the fast result. Single-plate candidates only ADD acceptance paths.)

- [ ] **Step 5: Run the scan tests, then the full suite**

Run: `npx vitest run src/features/scan/scanTargets.test.ts` — Expected: ALL PASS.
Run: `npm test` — Expected: all pass (`scripts/hp-accuracy.test.ts` again the canary: `battleView` uses the untouched `inferGameRect`, so HP results must be identical).

- [ ] **Step 6: Commit**

```bash
git add scripts/measure-plate-slots.ts src/features/scan/gameRect.ts src/features/scan/scanTargets.ts src/features/scan/scanTargets.test.ts
git commit -m "feat: single-plate game-rect hypotheses, validated by re-detection"
```

---

### Task 4: Golden seed, runner, and zero-wrong-modes floor

**Files:**
- Create: `scripts/build-scan-golden.ts`, `scripts/scan-accuracy-core.ts`, `scripts/scan-mode-accuracy.ts`
- Create: `training/scan-golden.json` (generated)
- Test: `scripts/scan-mode-accuracy.test.ts`
- Track: `training/scan-golden.draft.json` + the 16 raw jpgs (golden-referenced raw sources must be committed so fresh checkouts resolve — same rule as HP golden)

**Interfaces:**
- Consumes: `detectScanTargets` from `../src/features/scan/scanTargets`; `loadPng(path): RgbaImage` and `resolveGoldenPng(key, dir): string` from `./hp-accuracy-core` (jpg-derived keys use the `<stem>_jpg.png` convention; resolution order: tracked png → `.converted-screenshots` → sips-reconvert from the tracked raw jpg).
- Produces: `training/scan-golden.json` `{ entries: ScanGoldenEntry[] }`; `scanSweep(golden, load): ScanSweepRow[]` used by both the CLI and the floor test.

- [ ] **Step 1: Confirm the two team-frame picks are actually team-select screens**

Run: `open training/screenshots/Xnip2026-04-23_00-27-35.png training/screenshots/Xnip2026-04-23_00-32-20.png`
Expected: both show the "Select Pokémon" team screen (6 opponent cards right, 6 player cards left). If either is not a team screen, substitute any sibling `Xnip2026-04-23_*.png` that is, and use that name in Step 2. (These April files are the Phase-1 labeling sources, so team screens are the norm.)

- [ ] **Step 2: Write and run the golden builder**

```typescript
// scripts/build-scan-golden.ts
// Regenerates training/scan-golden.json: the reviewed draft's 16 single-plate
// frames (truth fields only), 4 native 2v2 frames from the HP golden, and 2
// team-select frames as mode-regression guards.
// Run: npx tsx scripts/build-scan-golden.ts
import * as fs from 'fs';

interface DraftEntry { file: string; mode: 'battle' | 'team'; opponentPlates: number; playerPlates: number }

const draft = JSON.parse(fs.readFileSync('training/scan-golden.draft.json', 'utf8')) as { entries: DraftEntry[] };
const hp = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8')) as Record<string, { opponent: string[]; player: string[] }>;

const PAIR_FRAMES = [
  'Xnip2026-07-01_03-26-01.png',
  'Xnip2026-07-01_19-38-20.png',
  'Xnip2026-07-01_05-34-16.png',
  'Xnip2026-07-01_18-08-40.png',
];
const TEAM_FRAMES = ['Xnip2026-04-23_00-27-35.png', 'Xnip2026-04-23_00-32-20.png'];

const entries = [
  ...draft.entries.map((e) => ({
    // jpg sources are keyed by their converted name, per resolveGoldenPng
    file: e.file.replace(/\.jpe?g$/i, '_jpg.png'),
    mode: e.mode,
    opponentPlates: e.opponentPlates,
    playerPlates: e.playerPlates,
  })),
  ...PAIR_FRAMES.map((f) => ({
    file: f, mode: 'battle' as const,
    opponentPlates: hp[f].opponent.length, playerPlates: hp[f].player.length,
  })),
  ...TEAM_FRAMES.map((f) => ({ file: f, mode: 'team' as const, opponentPlates: 0, playerPlates: 0 })),
];
fs.writeFileSync('training/scan-golden.json', JSON.stringify({ entries }, null, 2) + '\n');
console.log(`wrote ${entries.length} entries`);
```

Run: `npx tsx scripts/build-scan-golden.ts`
Expected: `wrote 22 entries`. If a `PAIR_FRAMES` key throws (missing from hp-golden), list keys with `python3 -c "import json; print([k for k in json.load(open('training/hp-golden.json')) if '_jpg' not in k])"` and substitute another native png key.

- [ ] **Step 3: Write the sweep core**

```typescript
// scripts/scan-accuracy-core.ts
// Shared by the scan-mode CLI and the floor test — mirrors hp-accuracy-core's
// split so the two never drift.
import { detectScanTargets } from '../src/features/scan/scanTargets';
import type { RgbaImage } from '../src/features/scan/types';

export interface ScanGoldenEntry {
  file: string;
  mode: 'battle' | 'team';
  opponentPlates: number;
  playerPlates: number;
  /** Reason string. Excluded from the zero-wrong-modes floor, still reported. */
  knownMiss?: string;
}
export interface ScanGoldenFile { entries: ScanGoldenEntry[] }

export interface ScanSweepRow {
  file: string;
  expectedMode: string; mode: string; modeOk: boolean;
  expectedOpp: number; opp: number;
  expectedPlayer: number; player: number;
  platesOk: boolean;
  knownMiss: boolean;
}

export function scanSweep(golden: ScanGoldenFile, load: (file: string) => RgbaImage): ScanSweepRow[] {
  return golden.entries.map((e) => {
    const det = detectScanTargets(load(e.file));
    const opp = det.targets.filter((t) => t.side === 'opponent').length;
    const player = det.targets.filter((t) => t.side === 'player').length;
    return {
      file: e.file,
      expectedMode: e.mode, mode: det.mode, modeOk: det.mode === e.mode,
      expectedOpp: e.opponentPlates, opp,
      expectedPlayer: e.playerPlates, player,
      // plate counts are REPORTED for battle frames, not floor-gated
      platesOk: e.mode !== 'battle' || (opp === e.opponentPlates && player === e.playerPlates),
      knownMiss: e.knownMiss != null,
    };
  });
}
```

- [ ] **Step 4: Write the CLI**

```typescript
// scripts/scan-mode-accuracy.ts
// Golden sweep for scan-mode detection. Run: npx tsx scripts/scan-mode-accuracy.ts
import * as fs from 'fs';
import { loadPng, resolveGoldenPng } from './hp-accuracy-core';
import { scanSweep, type ScanGoldenFile } from './scan-accuracy-core';

const golden: ScanGoldenFile = JSON.parse(fs.readFileSync('training/scan-golden.json', 'utf8'));
const rows = scanSweep(golden, (f) => loadPng(resolveGoldenPng(f, 'training/screenshots')));

for (const r of rows) {
  const flag = r.modeOk ? (r.platesOk ? 'ok    ' : 'PLATES') : r.knownMiss ? 'MISS* ' : 'WRONG ';
  console.log(`${flag} ${r.file}  mode ${r.mode}/${r.expectedMode}  opp ${r.opp}/${r.expectedOpp}  player ${r.player}/${r.expectedPlayer}`);
}
const wrong = rows.filter((r) => !r.modeOk && !r.knownMiss);
const missed = rows.filter((r) => !r.modeOk && r.knownMiss);
const plates = rows.filter((r) => r.modeOk && !r.platesOk);
console.log(`\n${rows.length} frames — wrong modes ${wrong.length}, knownMiss ${missed.length}, plate mismatches ${plates.length}`);
process.exitCode = wrong.length ? 1 : 0;
```

Run: `npx tsx scripts/scan-mode-accuracy.ts`
Expected: 22 rows. First run may show `WRONG` rows — that is the point of the next step. (The 16 jpg frames convert via sips on first load; the run is slower once, then cached in `.converted-screenshots/`.)

- [ ] **Step 5: Drive wrong modes to zero (or knownMiss)**

For each `WRONG` row, diagnose before touching anything:
1. `npx tsx scripts/read-hp.ts training/screenshots/<raw-file> --debug` (or `scripts/preview-crops.ts`) to see what the detectors found on that frame.
2. Classify the failure: (a) plate detected but verifier rejected → inspect the bar window (most likely `hasHpBarStrip` thresholds vs compression; adjust ONLY with all Task 1 unit tests still green); (b) plate not detected at all on a letterboxed frame → rect candidates missed (check `inferGameRectCandidates` output; the blob may fail the plate-aspect filter); (c) genuinely unrecoverable (plate unreadable even to a human at that compression) → record it as a knownMiss. knownMiss lives in `scripts/build-scan-golden.ts` as a map applied during generation (so regenerating the golden preserves it), which is also how it reaches `training/scan-golden.json`. Add to the builder:

```typescript
const KNOWN_MISS: Record<string, string> = {
  // '<golden key>': '<one-line reason>',
};
```

and change the draft-entry mapping to apply it:

```typescript
  ...draft.entries.map((e) => {
    const file = e.file.replace(/\.jpe?g$/i, '_jpg.png');
    return {
      file,
      mode: e.mode,
      opponentPlates: e.opponentPlates,
      playerPlates: e.playerPlates,
      ...(KNOWN_MISS[file] ? { knownMiss: KNOWN_MISS[file] } : {}),
    };
  }),
```

then re-run `npx tsx scripts/build-scan-golden.ts`.

3. Also check the 8 glow-frame rows (`23-46-07, 23-51-43, 00-06-40, 00-07-08, 00-08-23, 00-09-26, 00-10-52, 00-11-25`): if ≥2 show `player` count below `expectedPlayer`, the green glow IS eroding the indigo mask — sample the glow-border pixels (tiny one-off tsx snippet printing rgb at the plate border) and relax `SIDES.player.isPanelPixel` in `battleDetection.ts` by the measured margin (e.g. `b > g + 50` → `b > g + 35`), then re-run `npm test` AND this sweep to confirm nothing else moved. If fewer than 2, leave the predicate alone and record the observation in the commit message.

Re-run `npx tsx scripts/scan-mode-accuracy.ts` after each change.
Expected end state: `wrong modes 0`.

- [ ] **Step 6: Write the floor test**

```typescript
// scripts/scan-mode-accuracy.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { loadPng, resolveGoldenPng } from './hp-accuracy-core';
import { scanSweep, type ScanGoldenFile } from './scan-accuracy-core';

// The invariant that never bends: zero wrong MODES outside knownMiss.
// (Plate-count recall is reported by the CLI, not gated here — see spec.)
const golden: ScanGoldenFile = JSON.parse(fs.readFileSync('training/scan-golden.json', 'utf8'));

describe('scan-mode golden floor', () => {
  it('zero wrong modes outside knownMiss', () => {
    const rows = scanSweep(golden, (f) => loadPng(resolveGoldenPng(f, 'training/screenshots')));
    const wrong = rows.filter((r) => !r.modeOk && !r.knownMiss);
    expect(wrong.map((r) => `${r.file}: ${r.mode} (expected ${r.expectedMode})`)).toEqual([]);
  });
});
```

Run: `npx vitest run scripts/scan-mode-accuracy.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit (track the raw jpgs explicitly)**

```bash
git add scripts/build-scan-golden.ts scripts/scan-accuracy-core.ts scripts/scan-mode-accuracy.ts scripts/scan-mode-accuracy.test.ts \
  training/scan-golden.json training/scan-golden.draft.json \
  training/screenshots/Xnip2026-07-06_23-38-43.jpg training/screenshots/Xnip2026-07-06_23-46-07.jpg \
  training/screenshots/Xnip2026-07-06_23-49-20.jpg training/screenshots/Xnip2026-07-06_23-50-20.jpg \
  training/screenshots/Xnip2026-07-06_23-50-56.jpg training/screenshots/Xnip2026-07-06_23-51-43.jpg \
  training/screenshots/Xnip2026-07-06_23-59-33.jpg training/screenshots/Xnip2026-07-07_00-03-43.jpg \
  training/screenshots/Xnip2026-07-07_00-06-40.jpg training/screenshots/Xnip2026-07-07_00-07-08.jpg \
  training/screenshots/Xnip2026-07-07_00-08-23.jpg training/screenshots/Xnip2026-07-07_00-09-26.jpg \
  training/screenshots/Xnip2026-07-07_00-10-00.jpg training/screenshots/Xnip2026-07-07_00-10-52.jpg \
  training/screenshots/Xnip2026-07-07_00-11-25.jpg training/screenshots/Xnip2026-07-07_00-12-02.jpg
git commit -m "feat: scan-mode golden harness — 22 frames, zero-wrong-modes floor"
```

---

### Task 5: Full verification

**Files:** none new — verification only.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass (previously ~175 + the new plateVerify/scanTargets/floor tests).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Golden sweep, final numbers for the record**

Run: `npx tsx scripts/scan-mode-accuracy.ts`
Expected: `wrong modes 0`. Paste the summary line into the final report; note any knownMiss entries and plate mismatches (they are the follow-up backlog, e.g. glow-eroded player counts if the predicate was left alone).

- [ ] **Step 4: Commit anything the sweep iteration touched, then hand off**

```bash
git status --short   # must be clean; if not, commit the stragglers by exact path
```

Use superpowers:finishing-a-development-branch to merge/PR `feat/single-plate-detection`.
