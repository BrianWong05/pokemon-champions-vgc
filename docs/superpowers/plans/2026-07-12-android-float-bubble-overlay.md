# Android Float-Bubble Overlay UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bubble tap captures the game screen at tap time and opens a floating overlay over the game — team preview routes to a confirm-roster panel, battle routes to the damage calculator with the scanned opponent + HP pre-applied — per the approved spec `docs/superpowers/specs/2026-07-12-android-float-bubble-overlay-design.md`.

**Architecture:** A second `TYPE_APPLICATION_OVERLAY` window owned by `ScreenCaptureService` hosts an Android WebView that loads the existing app bundle at a new `/overlay` route (same origin as the main Capacitor WebView via `BridgeWebViewClient`, so localStorage is shared). A thin `OverlayBridge` JavascriptInterface exposes capture/window-state/bubble-tag. All routing and UI logic lives in React; native only captures frames and moves windows.

**Tech Stack:** React 18 + TypeScript + vitest (jsdom/RTL), Capacitor 7 Android, sql.js DB, existing scan pipeline (`scanFrame`, classifier, `buildLegalIdsResolver`).

## Global Constraints

- Repo: `/Users/brianwong/Project/react/pokemon-champions-vgc`, branch `claude/float-bubble-overlay-ux`. All paths below are relative to the repo root.
- Android-only: every new web behavior must be inert outside the overlay WebView (guard on `window.OverlayBridge` presence); iOS/web in-app flows (file picker, camera, `ScanTeamModal`) must not change behavior.
- Out of scope (do NOT build): FloatMenu quick-panel, FloatOn onboarding, FloatFace animated faces, Arena-DS calculator restyle, bubble dragging.
- `battleRoster` localStorage (`scan.battleRoster`) stays the single source of truth for the roster; the new HP store is separate and cleared with it.
- Defender pick from a battle scan = left-most detected opponent panel.
- TDD: write the failing test first for every pure-logic and component task. Run tests with `npx vitest run <file>`.
- Commit after every task (small, conventional-commit messages).
- The repo has two pre-existing dirty files (`android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`) — never `git add -A`; always stage explicit paths.

---

### Task 1: `lastScanHp` store + apply stored HP on roster-chip pick

**Files:**
- Create: `src/features/scan/lastScanHp.ts`
- Create: `src/features/scan/lastScanHp.test.ts`
- Modify: `src/features/scan/battleRoster.ts` (clear HP with roster)
- Modify: `src/pages/DamageCalculator/index.tsx` (chip pick applies stored HP)

**Interfaces:**
- Produces: `readLastScanHp(): Record<number, number>`, `saveScanHp(entries: Array<{ id: number; hpPercent: number | null | undefined }>): void`, `clearLastScanHp(): void` — localStorage key `scan.lastScanHp`. Later tasks (OverlayApp) call all three.
- Consumes: `clearBattleRoster()` from `battleRoster.ts` (already exists).

- [ ] **Step 1: Write the failing test**

`src/features/scan/lastScanHp.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readLastScanHp, saveScanHp, clearLastScanHp } from './lastScanHp';
import { clearBattleRoster } from './battleRoster';

describe('lastScanHp', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty map when nothing stored', () => {
    expect(readLastScanHp()).toEqual({});
  });

  it('merges entries and skips null hp', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }, { id: 823, hpPercent: null }]);
    saveScanHp([{ id: 823, hpPercent: 100 }]);
    expect(readLastScanHp()).toEqual({ 445: 56, 823: 100 });
  });

  it('overwrites an existing entry on re-scan', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }]);
    saveScanHp([{ id: 445, hpPercent: 31 }]);
    expect(readLastScanHp()[445]).toBe(31);
  });

  it('drops garbage stored values', () => {
    localStorage.setItem('scan.lastScanHp', JSON.stringify({ 445: 'high', 823: 200, 970: 42 }));
    expect(readLastScanHp()).toEqual({ 970: 42 });
  });

  it('clears', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }]);
    clearLastScanHp();
    expect(readLastScanHp()).toEqual({});
  });

  it('is cleared together with the battle roster', () => {
    saveScanHp([{ id: 445, hpPercent: 56 }]);
    clearBattleRoster();
    expect(readLastScanHp()).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/scan/lastScanHp.test.ts`
Expected: FAIL — `Cannot find module './lastScanHp'`

- [ ] **Step 3: Write the implementation**

`src/features/scan/lastScanHp.ts`:

```ts
// Scanned in-battle HP memory, keyed by species id. Written by each battle
// scan, applied when a defender is picked from the strip/roster chips,
// cleared together with the battle roster.
const KEY = 'scan.lastScanHp';

export function readLastScanHp(): Record<number, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === 'number' && v >= 0 && v <= 100) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveScanHp(entries: Array<{ id: number; hpPercent: number | null | undefined }>): void {
  const merged = readLastScanHp();
  for (const e of entries) {
    if (e.hpPercent != null && e.hpPercent >= 0 && e.hpPercent <= 100) merged[e.id] = e.hpPercent;
  }
  try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* storage unavailable */ }
}

export function clearLastScanHp(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
```

In `src/features/scan/battleRoster.ts`, add the import at the top and one line inside `clearBattleRoster`:

```ts
import { clearLastScanHp } from './lastScanHp';
```

```ts
export function clearBattleRoster(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  clearLastScanHp();
}
```

Also update that file's header comment: change `Species only — no HP memory (spec decision).` to `Species only — scanned HP lives in the separate lastScanHp store (2026-07-12 overlay spec).`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/scan/lastScanHp.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire stored HP into roster-chip picks**

In `src/pages/DamageCalculator/index.tsx`, add the import:

```ts
import { readLastScanHp } from '@/features/scan/lastScanHp';
```

and change the `rosterChips` `onPick` line from:

```tsx
onPick={(id) => void handleLoadDefender(id)}
```

to:

```tsx
onPick={(id) => void handleLoadDefender(id, { hpPercent: readLastScanHp()[id] ?? null })}
```

- [ ] **Step 6: Run the full suite and commit**

Run: `npx vitest run`
Expected: all existing tests still PASS.

```bash
git add src/features/scan/lastScanHp.ts src/features/scan/lastScanHp.test.ts src/features/scan/battleRoster.ts src/pages/DamageCalculator/index.tsx
git commit -m "feat(scan): lastScanHp store, applied on roster-chip defender picks"
```

---

### Task 2: `routeScan` — overlay routing decision

**Files:**
- Create: `src/features/overlay/overlayScan.ts`
- Create: `src/features/overlay/overlayScan.test.ts`

**Interfaces:**
- Consumes: `SlotResult` from `src/features/scan/types.ts` (`{ box: TileBox; candidates: Candidate[]; side?: 'player' | 'opponent'; hpPercent?: number | null }`), `ScanMode = 'team' | 'battle'` from `src/features/scan/scanTargets.ts`.
- Produces: `routeScan(mode: ScanMode | null, slots: SlotResult[]): OverlayRoute` where

```ts
export type OverlayRoute =
  | { view: 'confirm'; slots: SlotResult[] }
  | { view: 'calc'; defenderId: number; hpPercent: number | null; hpEntries: Array<{ id: number; hpPercent: number | null }> }
  | { view: 'error'; reason: 'empty' | 'no-roster-match' };
```

- [ ] **Step 1: Write the failing test**

`src/features/overlay/overlayScan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { routeScan } from './overlayScan';
import type { SlotResult } from '../scan/types';

const box = (x: number) => ({ x, y: 10, w: 100, h: 40 });
const slot = (over: Partial<SlotResult>): SlotResult => ({ box: box(0), candidates: [], ...over });

describe('routeScan', () => {
  it('team mode with candidates -> confirm view with the slots', () => {
    const slots = [slot({ candidates: [{ id: 445, score: 0.9 }] })];
    expect(routeScan('team', slots)).toEqual({ view: 'confirm', slots });
  });

  it('team mode with zero identified slots -> empty error', () => {
    expect(routeScan('team', [slot({})])).toEqual({ view: 'error', reason: 'empty' });
  });

  it('battle mode -> left-most opponent is defender, both HP entries kept', () => {
    const slots = [
      slot({ box: box(900), side: 'opponent', candidates: [{ id: 823, score: 0.8 }], hpPercent: 100 }),
      slot({ box: box(500), side: 'opponent', candidates: [{ id: 445, score: 0.9 }], hpPercent: 56 }),
      slot({ box: box(100), side: 'player', candidates: [{ id: 970, score: 0.9 }], hpPercent: 80 }),
    ];
    expect(routeScan('battle', slots)).toEqual({
      view: 'calc',
      defenderId: 445,
      hpPercent: 56,
      hpEntries: [{ id: 445, hpPercent: 56 }, { id: 823, hpPercent: 100 }],
    });
  });

  it('battle slot without hp -> hpPercent null', () => {
    const slots = [slot({ side: 'opponent', candidates: [{ id: 445, score: 0.9 }] })];
    expect(routeScan('battle', slots)).toMatchObject({ view: 'calc', defenderId: 445, hpPercent: null });
  });

  it('battle mode with no identified opponents -> no-roster-match error', () => {
    const slots = [slot({ side: 'opponent', candidates: [] })];
    expect(routeScan('battle', slots)).toEqual({ view: 'error', reason: 'no-roster-match' });
  });

  it('null mode -> empty error', () => {
    expect(routeScan(null, [])).toEqual({ view: 'error', reason: 'empty' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/overlay/overlayScan.test.ts`
Expected: FAIL — `Cannot find module './overlayScan'`

- [ ] **Step 3: Write the implementation**

`src/features/overlay/overlayScan.ts`:

```ts
// Decides which overlay view a scanned frame routes to (2026-07-12 spec):
// team preview -> confirm roster; battle -> calculator with the LEFT-MOST
// detected opponent as defender and every detected opponent's HP stored.
import type { SlotResult } from '../scan/types';
import type { ScanMode } from '../scan/scanTargets';

export type OverlayRoute =
  | { view: 'confirm'; slots: SlotResult[] }
  | { view: 'calc'; defenderId: number; hpPercent: number | null; hpEntries: Array<{ id: number; hpPercent: number | null }> }
  | { view: 'error'; reason: 'empty' | 'no-roster-match' };

export function routeScan(mode: ScanMode | null, slots: SlotResult[]): OverlayRoute {
  if (mode === 'team') {
    if (!slots.some((s) => s.candidates.length > 0)) return { view: 'error', reason: 'empty' };
    return { view: 'confirm', slots };
  }
  if (mode === 'battle') {
    const opp = slots
      .filter((s) => s.side === 'opponent' && s.candidates.length > 0)
      .sort((a, b) => a.box.x - b.box.x);
    if (opp.length === 0) return { view: 'error', reason: 'no-roster-match' };
    const hpEntries = opp.map((s) => ({ id: s.candidates[0].id, hpPercent: s.hpPercent ?? null }));
    return { view: 'calc', defenderId: hpEntries[0].id, hpPercent: hpEntries[0].hpPercent, hpEntries };
  }
  return { view: 'error', reason: 'empty' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/overlay/overlayScan.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/overlay/overlayScan.ts src/features/overlay/overlayScan.test.ts
git commit -m "feat(overlay): routeScan maps scanned frame to confirm/calc/error view"
```

---

### Task 3: `overlayBridge` — typed wrapper over the native JavascriptInterface

**Files:**
- Modify: `src/features/scan/mediaProjectionSource.ts` (export `base64ToBlob`)
- Create: `src/features/overlay/overlayBridge.ts`
- Create: `src/features/overlay/overlayBridge.test.ts`

**Interfaces:**
- Produces (consumed by OverlayApp in Task 7 and implemented natively in Task 8):

```ts
export type WindowState = 'hidden' | 'strip' | 'panel';
export type BubbleTag = 'scan' | 'calc';
export const overlayBridge: {
  isAvailable(): boolean;
  captureFrame(): Blob | null;        // frame stored natively at bubble-tap time
  blinkAndCapture(): Blob | null;     // native hides panel ~300ms, captures, restores
  setWindowState(state: WindowState): void;
  setBubbleTag(tag: BubbleTag): void;
  onBubbleTap(cb: () => void): () => void;  // native calls window.__overlayBubbleTap()
  onBack(cb: () => void): () => void;       // native calls window.__overlayBack()
};
```

- [ ] **Step 1: Export `base64ToBlob`**

In `src/features/scan/mediaProjectionSource.ts` change `function base64ToBlob` to `export function base64ToBlob` (no other change).

- [ ] **Step 2: Write the failing test**

`src/features/overlay/overlayBridge.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { overlayBridge } from './overlayBridge';

// 1x1 transparent PNG
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

declare global {
  interface Window { OverlayBridge?: any }
}

describe('overlayBridge', () => {
  beforeEach(() => { delete window.OverlayBridge; delete (window as any).__overlayBubbleTap; });

  it('is unavailable and inert without the native interface', () => {
    expect(overlayBridge.isAvailable()).toBe(false);
    expect(overlayBridge.captureFrame()).toBeNull();
    expect(() => overlayBridge.setWindowState('strip')).not.toThrow();
  });

  it('converts captured base64 to a png Blob', () => {
    window.OverlayBridge = { captureFrame: () => PNG_B64 };
    const blob = overlayBridge.captureFrame();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe('image/png');
    expect(blob!.size).toBeGreaterThan(0);
  });

  it('forwards window state and bubble tag', () => {
    const setWindowState = vi.fn();
    const setBubbleTag = vi.fn();
    window.OverlayBridge = { setWindowState, setBubbleTag };
    overlayBridge.setWindowState('panel');
    overlayBridge.setBubbleTag('calc');
    expect(setWindowState).toHaveBeenCalledWith('panel');
    expect(setBubbleTag).toHaveBeenCalledWith('calc');
  });

  it('registers and unregisters the bubble-tap callback', () => {
    const cb = vi.fn();
    const off = overlayBridge.onBubbleTap(cb);
    (window as any).__overlayBubbleTap();
    expect(cb).toHaveBeenCalledOnce();
    off();
    expect((window as any).__overlayBubbleTap).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/overlay/overlayBridge.test.ts`
Expected: FAIL — `Cannot find module './overlayBridge'`

- [ ] **Step 4: Write the implementation**

`src/features/overlay/overlayBridge.ts`:

```ts
// Thin typed wrapper over the native OverlayBridge JavascriptInterface
// (OverlayPanelController.java). Everything no-ops outside the Android
// overlay WebView so the /overlay route is harmless in a normal browser.
import { base64ToBlob } from '../scan/mediaProjectionSource';

export type WindowState = 'hidden' | 'strip' | 'panel';
export type BubbleTag = 'scan' | 'calc';

interface NativeOverlayBridge {
  captureFrame(): string | null;
  blinkAndCapture(): string | null;
  setWindowState(state: string): void;
  setBubbleTag(tag: string): void;
}

declare global {
  interface Window {
    OverlayBridge?: NativeOverlayBridge;
    __overlayBubbleTap?: () => void;
    __overlayBack?: () => void;
  }
}

const native = () => (typeof window !== 'undefined' ? window.OverlayBridge : undefined);
const toBlob = (b64: string | null | undefined) => (b64 ? base64ToBlob(b64) : null);

export const overlayBridge = {
  isAvailable: (): boolean => !!native(),
  captureFrame: (): Blob | null => toBlob(native()?.captureFrame()),
  blinkAndCapture: (): Blob | null => toBlob(native()?.blinkAndCapture()),
  setWindowState(state: WindowState): void { native()?.setWindowState(state); },
  setBubbleTag(tag: BubbleTag): void { native()?.setBubbleTag(tag); },
  onBubbleTap(cb: () => void): () => void {
    window.__overlayBubbleTap = cb;
    return () => { if (window.__overlayBubbleTap === cb) delete window.__overlayBubbleTap; };
  },
  onBack(cb: () => void): () => void {
    window.__overlayBack = cb;
    return () => { if (window.__overlayBack === cb) delete window.__overlayBack; };
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/overlay/overlayBridge.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/mediaProjectionSource.ts src/features/overlay/overlayBridge.ts src/features/overlay/overlayBridge.test.ts
git commit -m "feat(overlay): typed overlayBridge wrapper over the native JS interface"
```

---

### Task 4: `StripView` — docked roster strip

**Files:**
- Create: `src/features/overlay/StripView.tsx`
- Create: `src/features/overlay/StripView.test.tsx`

**Interfaces:**
- Consumes: `PokemonImage` atom (`{ id, name, className }`), `PokemonBaseStats`.
- Produces: `<StripView roster={number[]} byId={Map<number, PokemonBaseStats>} hpById={Record<number, number>} activeId={number | null} onPick={(id: number) => void} />`

- [ ] **Step 1: Write the failing test**

`src/features/overlay/StripView.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StripView from './StripView';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);
const byId = new Map([445, 823, 970].map((id) => [id, mon(id, `Mon${id}`)]));

describe('StripView', () => {
  it('renders one tile per roster mon with HP badge where known', () => {
    render(<StripView roster={[445, 823, 970]} byId={byId} hpById={{ 445: 56 }} activeId={823} onPick={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('56%')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mon823/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('fires onPick with the species id', () => {
    const onPick = vi.fn();
    render(<StripView roster={[445]} byId={byId} hpById={{}} activeId={null} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /Mon445/ }));
    expect(onPick).toHaveBeenCalledWith(445);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/overlay/StripView.test.tsx`
Expected: FAIL — `Cannot find module './StripView'`

- [ ] **Step 3: Write the implementation**

`src/features/overlay/StripView.tsx`:

```tsx
// Docked bottom strip over the game (window state 'strip'): the locked
// opponent roster; tap sets the active defender for the next calc open.
import React from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface StripViewProps {
  roster: number[];
  byId: Map<number, PokemonBaseStats>;
  hpById: Record<number, number>;
  activeId: number | null;
  onPick: (id: number) => void;
}

const StripView: React.FC<StripViewProps> = ({ roster, byId, hpById, activeId, onPick }) => (
  <div className="w-full h-full flex items-end justify-center gap-2 pb-1 bg-gradient-to-t from-black/80 to-transparent">
    {roster.map((id) => {
      const name = byId.get(id)?.nameEn ?? `#${id}`;
      const active = id === activeId;
      const hp = hpById[id];
      return (
        <button
          key={id}
          aria-label={`Set ${name} as defender`}
          aria-pressed={active}
          onClick={() => onPick(id)}
          className={`relative rounded-lg p-0.5 border-2 transition-transform ${
            active ? 'border-blue-400 bg-blue-500/20 -translate-y-1' : 'border-rose-500/50 bg-slate-900/90'
          }`}
        >
          <PokemonImage id={id} name={name} className="w-10 h-10" />
          {hp != null && (
            <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1 rounded-full bg-slate-950 text-emerald-400 border border-emerald-500/50">
              {hp}%
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default StripView;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/overlay/StripView.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/overlay/StripView.tsx src/features/overlay/StripView.test.tsx
git commit -m "feat(overlay): docked roster StripView with HP badges"
```

---

### Task 5: `ConfirmRosterView` — team-preview confirm panel

**Files:**
- Create: `src/features/overlay/ConfirmRosterView.tsx`
- Create: `src/features/overlay/ConfirmRosterView.test.tsx`

**Interfaces:**
- Consumes: `SlotResult`, `Candidate` from scan types; `PokemonImage`; `PokemonImagePicker` (`{ pokemonList, selectedId, onSelect }`).
- Produces: `<ConfirmRosterView slots={SlotResult[]} pokemonList={PokemonBaseStats[]} onConfirm={(ids: number[]) => void} onRescan={() => void} onClose={() => void} />` — parent must remount with a new `key` per scan so internal picks reset.

- [ ] **Step 1: Write the failing test**

`src/features/overlay/ConfirmRosterView.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmRosterView from './ConfirmRosterView';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { SlotResult } from '../scan/types';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);
const list = [mon(445, 'Garchomp'), mon(149, 'Dragonite'), mon(823, 'Corviknight')];
const slot = (candidates: Array<{ id: number; score: number }>): SlotResult =>
  ({ box: { x: 0, y: 0, w: 10, h: 10 }, candidates });

describe('ConfirmRosterView', () => {
  it('shows top candidate per slot with confidence and confirms the ids', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmRosterView
        slots={[slot([{ id: 445, score: 0.92 }]), slot([{ id: 823, score: 0.99 }])]}
        pokemonList={list}
        onConfirm={onConfirm}
        onRescan={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Garchomp')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Confirm & lock roster/ }));
    expect(onConfirm).toHaveBeenCalledWith([445, 823]);
  });

  it('lets the user swap a slot to another candidate', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmRosterView
        slots={[slot([{ id: 445, score: 0.61 }, { id: 149, score: 0.26 }])]}
        pokemonList={list}
        onConfirm={onConfirm}
        onRescan={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Fix Garchomp/ }));
    fireEvent.click(screen.getByRole('button', { name: /Use Dragonite/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm & lock roster/ }));
    expect(onConfirm).toHaveBeenCalledWith([149]);
  });

  it('wires rescan and close', () => {
    const onRescan = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmRosterView slots={[slot([{ id: 445, score: 0.9 }])]} pokemonList={list} onConfirm={() => {}} onRescan={onRescan} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Re-scan/ }));
    fireEvent.click(screen.getByRole('button', { name: /Minimize/ }));
    expect(onRescan).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/overlay/ConfirmRosterView.test.tsx`
Expected: FAIL — `Cannot find module './ConfirmRosterView'`

- [ ] **Step 3: Write the implementation**

`src/features/overlay/ConfirmRosterView.tsx`:

```tsx
// Team-preview confirm panel (window state 'panel'): 6 detected mons with
// confidence, tap a card to fix from candidates or full search, confirm
// locks the roster. Parent remounts (key) per scan.
import React, { useMemo, useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import PokemonImagePicker from '../scan/PokemonImagePicker';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { SlotResult } from '../scan/types';

interface ConfirmRosterViewProps {
  slots: SlotResult[];
  pokemonList: PokemonBaseStats[];
  onConfirm: (ids: number[]) => void;
  onRescan: () => void;
  onClose: () => void;
}

const pct = (score: number) => `${Math.max(0, Math.min(99, Math.round(score * 100)))}%`;

const ConfirmRosterView: React.FC<ConfirmRosterViewProps> = ({ slots, pokemonList, onConfirm, onRescan, onClose }) => {
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const [picks, setPicks] = useState<(number | null)[]>(() => slots.map((s) => s.candidates[0]?.id ?? null));
  const [fixing, setFixing] = useState<number | null>(null);
  const [searchAll, setSearchAll] = useState(false);

  const nameOf = (id: number | null) => (id == null ? 'Unknown' : byId.get(id)?.nameEn ?? `#${id}`);
  const setPick = (slotIdx: number, id: number) => {
    setPicks((prev) => prev.map((p, i) => (i === slotIdx ? id : p)));
    setFixing(null);
    setSearchAll(false);
  };
  const ids = picks.filter((p): p is number => p != null);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/95 text-slate-100">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-slate-800 shrink-0">
        <span className="text-xs font-bold">Confirm opponent roster</span>
        <span className="flex-1" />
        <button aria-label="Re-scan team" onClick={onRescan} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          Re-scan
        </button>
        <button aria-label="Minimize" onClick={onClose} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          ▾
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s, i) => {
            const low = (s.candidates[0]?.score ?? 0) < 0.75;
            const manual = picks[i] != null && picks[i] !== s.candidates[0]?.id;
            return (
              <button
                key={i}
                aria-label={`Fix ${nameOf(picks[i])}`}
                onClick={() => { setFixing(fixing === i ? null : i); setSearchAll(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${
                  fixing === i ? 'border-blue-400 bg-blue-500/10' : low && !manual ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-900'
                }`}
              >
                {picks[i] != null && <PokemonImage id={picks[i]!} name={nameOf(picks[i])} className="w-12 h-12" />}
                <span className="text-[11px] font-semibold truncate max-w-full">{nameOf(picks[i])}</span>
                <span className={`text-[10px] font-bold ${manual ? 'text-blue-400' : low ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {manual ? 'Set' : s.candidates[0] ? pct(s.candidates[0].score) : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {fixing != null && (
          <div className="mt-3 p-2 rounded-lg border border-slate-800 bg-slate-900">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Fix this slot</div>
            <div className="flex flex-wrap gap-2">
              {slots[fixing].candidates.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  aria-label={`Use ${nameOf(c.id)}`}
                  onClick={() => setPick(fixing, c.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded border ${picks[fixing] === c.id ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700'}`}
                >
                  <PokemonImage id={c.id} name={nameOf(c.id)} className="w-7 h-7" />
                  <span className="text-[11px]">{nameOf(c.id)}</span>
                  <span className="text-[10px] text-slate-400">{pct(c.score)}</span>
                </button>
              ))}
              <button onClick={() => setSearchAll((v) => !v)} className="text-[11px] px-2 py-1 rounded border border-dashed border-slate-600 text-slate-300">
                Search all…
              </button>
            </div>
            {searchAll && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                <PokemonImagePicker pokemonList={pokemonList} selectedId={picks[fixing]} onSelect={(id) => setPick(fixing, id)} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 shrink-0 border-t border-slate-800">
        <button
          disabled={ids.length === 0}
          onClick={() => onConfirm(ids)}
          className="w-full h-10 rounded-lg font-bold text-sm bg-blue-500 text-slate-950 disabled:opacity-40"
        >
          Confirm &amp; lock roster
        </button>
      </div>
    </div>
  );
};

export default ConfirmRosterView;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/overlay/ConfirmRosterView.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/overlay/ConfirmRosterView.tsx src/features/overlay/ConfirmRosterView.test.tsx
git commit -m "feat(overlay): ConfirmRosterView with candidate fixing and roster lock"
```

---

### Task 6: DamageCalculator page — `overlayDefender` + `onOpenScanOverride` props

**Files:**
- Modify: `src/pages/DamageCalculator/index.tsx`

**Interfaces:**
- Produces (consumed by OverlayApp in Task 7):

```ts
export interface OverlayDefender { id: number; hpPercent: number | null; seq: number }
interface DamageCalculatorPageProps {
  overlayDefender?: OverlayDefender | null;   // applied whenever seq changes (after pokemonList loads)
  onOpenScanOverride?: () => void;            // replaces navigate('/scan') in the mobile calculators
}
```

- Consumes: existing `handleLoadDefender(pokemonId, { hpPercent })` inside the page (unchanged).

- [ ] **Step 1: Add the props and the apply effect**

In `src/pages/DamageCalculator/index.tsx`:

Change the component declaration from:

```tsx
const DamageCalculatorPage: React.FC = () => {
```

to:

```tsx
export interface OverlayDefender { id: number; hpPercent: number | null; seq: number }
interface DamageCalculatorPageProps {
  /** Overlay mode: defender to load (re-applied whenever seq changes). */
  overlayDefender?: OverlayDefender | null;
  /** Overlay mode: replaces the mobile calculators' navigate('/scan'). */
  onOpenScanOverride?: () => void;
}

const DamageCalculatorPage: React.FC<DamageCalculatorPageProps> = ({ overlayDefender, onOpenScanOverride }) => {
```

Add this effect directly after the existing `handleLoadAttacker` definition (it needs `handleLoadDefender` and `pokemonList` in scope):

```tsx
  // Overlay scan result: (re)apply the detected defender + HP once data is up.
  useEffect(() => {
    if (!overlayDefender || pokemonList.length === 0) return;
    void handleLoadDefender(overlayDefender.id, { hpPercent: overlayDefender.hpPercent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayDefender?.seq, pokemonList.length]);
```

Change the mobile branch's scan handler from:

```tsx
          onOpenScan={() => navigate('/scan')}
```

to:

```tsx
          onOpenScan={onOpenScanOverride ?? (() => navigate('/scan'))}
```

- [ ] **Step 2: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests PASS. (No new unit test — the effect is a two-liner exercised by Task 7's shell test and the on-device checklist.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/DamageCalculator/index.tsx
git commit -m "feat(calc): overlayDefender and onOpenScanOverride props for overlay hosting"
```

---

### Task 7: OverlayApp shell + `/overlay` route

**Files:**
- Create: `src/features/overlay/usePokemonList.ts`
- Create: `src/features/overlay/OverlayApp.tsx`
- Create: `src/features/overlay/OverlayApp.test.tsx`
- Modify: `src/App.tsx` (register the route)

**Interfaces:**
- Consumes: `overlayBridge` (Task 3), `routeScan` (Task 2), `StripView` (Task 4), `ConfirmRosterView` (Task 5), `DamageCalculatorPage` + `OverlayDefender` (Task 6), `saveScanHp`/`readLastScanHp` (Task 1), existing `useBattleRoster`, `formFamilyIds`, `buildLegalIdsResolver`, `scanFrame`, `DEFAULT_DEPS`, `useFormat`.
- Produces: route `/overlay` rendering `<OverlayApp />` (registered outside `Layout` so no app nav chrome).

- [ ] **Step 1: Write `usePokemonList`**

`src/features/overlay/usePokemonList.ts`:

```ts
// Format-scoped pokemon list for the overlay shell (confirm/strip views).
// ponytail: duplicates the pokemon half of DamageCalculatorPage's fetch;
// extract a shared hook if a third consumer appears.
import { useEffect, useState } from 'react';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pokemon, formatPokemon, formats } from '@/db/schema';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

export function usePokemonList(format: string): PokemonBaseStats[] {
  const [list, setList] = useState<PokemonBaseStats[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const rows = await db
          .select({
            id: pokemon.id,
            identifier: pokemon.identifier,
            nameEn: pokemon.nameEn,
            nameZh: pokemon.nameZh,
            type1: pokemon.type1,
            type2: pokemon.type2,
            baseHp: pokemon.baseHp,
            baseAttack: pokemon.baseAttack,
            baseDefense: pokemon.baseDefense,
            baseSpAtk: pokemon.baseSpAtk,
            baseSpDef: pokemon.baseSpDef,
            baseSpeed: pokemon.baseSpeed,
          })
          .from(pokemon)
          .innerJoin(formatPokemon, eq(pokemon.id, formatPokemon.pokemonId))
          .innerJoin(formats, eq(formatPokemon.formatId, formats.id))
          .where(eq(formats.name, format));
        if (!cancelled) setList(rows as PokemonBaseStats[]);
      } catch (e) {
        console.error('[overlay] pokemon list load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [format]);
  return list;
}
```

- [ ] **Step 2: Write the failing shell test**

`src/features/overlay/OverlayApp.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);

const bridgeMock = vi.hoisted(() => ({
  isAvailable: () => true,
  captureFrame: vi.fn((): Blob | null => new Blob(['x'], { type: 'image/png' })),
  blinkAndCapture: vi.fn((): Blob | null => new Blob(['x'], { type: 'image/png' })),
  setWindowState: vi.fn(),
  setBubbleTag: vi.fn(),
  onBubbleTap: vi.fn((cb: () => void) => { (globalThis as any).__tap = cb; return () => {}; }),
  onBack: vi.fn(() => () => {}),
}));
const scanFrameMock = vi.hoisted(() => vi.fn());

vi.mock('./overlayBridge', () => ({ overlayBridge: bridgeMock }));
vi.mock('./usePokemonList', () => ({ usePokemonList: () => [mon(445, 'Garchomp'), mon(823, 'Corviknight')] }));
vi.mock('../formats/FormatContext', () => ({ useFormat: () => ({ format: 'reg-h' }) }));
vi.mock('../scan/scanFrame', async (importOriginal) => {
  const orig = await importOriginal<any>();
  return {
    ...orig,
    scanFrame: scanFrameMock,
    // jsdom has no canvas/createImageBitmap — stub the decode step.
    DEFAULT_DEPS: { ...orig.DEFAULT_DEPS, blobToRgbaImage: async () => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) }) },
  };
});
vi.mock('@/pages/DamageCalculator', () => ({
  default: ({ overlayDefender }: any) => <div data-testid="calc">{overlayDefender?.id}:{String(overlayDefender?.hpPercent)}</div>,
}));

import OverlayApp from './OverlayApp';

describe('OverlayApp', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('reflects a locked roster to native on mount (strip + calc tag)', () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    render(<OverlayApp />);
    expect(bridgeMock.setBubbleTag).toHaveBeenCalledWith('calc');
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('strip');
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0); // strip tiles
  });

  it('bubble tap on a team-preview frame opens the confirm view', async () => {
    scanFrameMock.mockResolvedValue({ mode: 'team', slots: [{ box: { x: 0, y: 0, w: 1, h: 1 }, candidates: [{ id: 445, score: 0.9 }] }] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('panel');
    expect(await screen.findByText(/Confirm opponent roster/)).toBeTruthy();
  });

  it('bubble tap on a battle frame opens the calc with defender + hp and stores hp', async () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    scanFrameMock.mockResolvedValue({
      mode: 'battle',
      slots: [
        { box: { x: 100, y: 0, w: 1, h: 1 }, side: 'opponent', candidates: [{ id: 445, score: 0.9 }], hpPercent: 56 },
        { box: { x: 500, y: 0, w: 1, h: 1 }, side: 'opponent', candidates: [{ id: 823, score: 0.8 }], hpPercent: 100 },
      ],
    });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect((await screen.findByTestId('calc')).textContent).toBe('445:56');
    expect(JSON.parse(localStorage.getItem('scan.lastScanHp')!)).toEqual({ 445: 56, 823: 100 });
  });

  it('unreadable frame shows the error card', async () => {
    scanFrameMock.mockResolvedValue({ mode: null, slots: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(await screen.findByText(/Couldn't read the screen/)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/overlay/OverlayApp.test.tsx`
Expected: FAIL — `Cannot find module './OverlayApp'`

- [ ] **Step 4: Write `OverlayApp`**

`src/features/overlay/OverlayApp.tsx`:

```tsx
// Overlay shell (#/overlay): the only page the panel WebView renders.
// Owns the tap -> capture -> scan -> route state machine; native only
// captures frames and moves windows.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { overlayBridge } from './overlayBridge';
import { routeScan } from './overlayScan';
import { usePokemonList } from './usePokemonList';
import StripView from './StripView';
import ConfirmRosterView from './ConfirmRosterView';
import DamageCalculatorPage, { type OverlayDefender } from '@/pages/DamageCalculator';
import { useFormat } from '../formats/FormatContext';
import { useBattleRoster } from '../scan/useBattleRoster';
import { formFamilyIds, buildLegalIdsResolver, readBattleRoster } from '../scan/battleRoster';
import { readLastScanHp, saveScanHp } from '../scan/lastScanHp';
import { scanFrame, DEFAULT_DEPS } from '../scan/scanFrame';
import type { SlotResult } from '../scan/types';

type View = 'idle' | 'scanning' | 'confirm' | 'calc' | 'error';

const OverlayApp: React.FC = () => {
  const { format } = useFormat();
  const pokemonList = usePokemonList(format);
  const { roster, confirmRoster } = useBattleRoster();
  const [view, setView] = useState<View>('idle');
  const [errorReason, setErrorReason] = useState<'empty' | 'no-roster-match'>('empty');
  const [confirmSlots, setConfirmSlots] = useState<SlotResult[]>([]);
  const [scanSeq, setScanSeq] = useState(0);
  const [overlayDefender, setOverlayDefender] = useState<OverlayDefender | null>(null);
  const pendingBlob = useRef<Blob | null>(null);
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);

  // Mount: reflect persisted roster state to the native bubble/window.
  useEffect(() => {
    overlayBridge.setBubbleTag(roster ? 'calc' : 'scan');
    overlayBridge.setWindowState(roster ? 'strip' : 'hidden');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closePanel = useCallback(() => {
    setView('idle');
    // Fresh read (spec): roster changes made in the main app self-correct here.
    overlayBridge.setWindowState(readBattleRoster() ? 'strip' : 'hidden');
  }, []);

  const runScan = useCallback(async (blob: Blob | null) => {
    overlayBridge.setWindowState('panel');
    if (!blob) { setErrorReason('empty'); setView('error'); return; }
    if (pokemonList.length === 0) { pendingBlob.current = blob; setView('scanning'); return; }
    setView('scanning');
    try {
      const image = await DEFAULT_DEPS.blobToRgbaImage(blob);
      const fullLegal = new Set(pokemonList.map((p) => p.id));
      // Fresh read (spec): re-read the roster on every tap, not hook state.
      const lockedRoster = readBattleRoster();
      const maskIds = lockedRoster && lockedRoster.length > 0 ? formFamilyIds(lockedRoster, pokemonList) : null;
      const legal = buildLegalIdsResolver(fullLegal, maskIds, null);
      const { mode, slots } = await scanFrame(image, legal, DEFAULT_DEPS);
      const route = routeScan(mode, slots);
      if (route.view === 'confirm') {
        setConfirmSlots(route.slots);
        setScanSeq((s) => s + 1);
        setView('confirm');
      } else if (route.view === 'calc') {
        saveScanHp(route.hpEntries);
        setScanSeq((s) => {
          setOverlayDefender({ id: route.defenderId, hpPercent: route.hpPercent, seq: s + 1 });
          return s + 1;
        });
        setView('calc');
      } else {
        setErrorReason(route.reason);
        setView('error');
      }
    } catch (e) {
      console.error('[overlay] scan failed', e);
      setErrorReason('empty');
      setView('error');
    }
  }, [pokemonList]);

  // A tap can land before sql.js finishes loading; finish it when data is up.
  useEffect(() => {
    if (pokemonList.length > 0 && pendingBlob.current) {
      const blob = pendingBlob.current;
      pendingBlob.current = null;
      void runScan(blob);
    }
  }, [pokemonList, runScan]);

  useEffect(() => overlayBridge.onBubbleTap(() => void runScan(overlayBridge.captureFrame())), [runScan]);
  useEffect(() => overlayBridge.onBack(closePanel), [closePanel]);

  const rescan = useCallback(() => void runScan(overlayBridge.blinkAndCapture()), [runScan]);

  const handleConfirm = useCallback((ids: number[]) => {
    confirmRoster(ids);
    overlayBridge.setBubbleTag('calc');
    overlayBridge.setWindowState('strip');
    setView('idle');
  }, [confirmRoster]);

  const handleStripPick = useCallback((id: number) => {
    setScanSeq((s) => {
      setOverlayDefender({ id, hpPercent: readLastScanHp()[id] ?? null, seq: s + 1 });
      return s + 1;
    });
  }, []);

  if (view === 'idle') {
    return roster ? (
      <StripView roster={roster} byId={byId} hpById={readLastScanHp()} activeId={overlayDefender?.id ?? null} onPick={handleStripPick} />
    ) : null;
  }

  if (view === 'scanning') {
    return (
      <div className="w-full h-full grid place-items-center bg-slate-950/70">
        <div className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-semibold animate-pulse">
          Scanning…
        </div>
      </div>
    );
  }

  if (view === 'confirm') {
    return (
      <div className="w-full h-full flex" onClick={closePanel}>
        <div className="w-[70%] h-full" onClick={(e) => e.stopPropagation()}>
          <ConfirmRosterView
            key={scanSeq}
            slots={confirmSlots}
            pokemonList={pokemonList}
            onConfirm={handleConfirm}
            onRescan={rescan}
            onClose={closePanel}
          />
        </div>
      </div>
    );
  }

  if (view === 'calc') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950">
        <div className="flex items-center gap-2 px-3 h-8 border-b border-slate-800 text-slate-100 shrink-0">
          <span className="text-xs font-bold">Damage · floating over battle</span>
          <span className="flex-1" />
          {overlayDefender?.hpPercent != null ? (
            <span className="text-[11px] px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-400">
              Read · {overlayDefender.hpPercent}% HP
            </span>
          ) : null}
          <button aria-label="Scan active + HP" onClick={rescan} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
            Scan active + HP
          </button>
          <button aria-label="Minimize" onClick={closePanel} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
            ▾
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <DamageCalculatorPage overlayDefender={overlayDefender} onOpenScanOverride={rescan} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid place-items-center" onClick={closePanel}>
      <div className="w-72 p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-bold mb-1">Couldn't read the screen</div>
        <div className="text-xs text-slate-400 mb-3">
          {errorReason === 'no-roster-match'
            ? 'Nothing on screen matched the locked roster — re-scan the team preview next game.'
            : 'Point at the team-select screen or an active battle and retry.'}
        </div>
        <div className="flex gap-2">
          <button onClick={rescan} className="flex-1 h-9 rounded-lg font-bold text-sm bg-blue-500 text-slate-950">Retry</button>
          <button onClick={closePanel} className="flex-1 h-9 rounded-lg font-bold text-sm border border-slate-700">Close</button>
        </div>
      </div>
    </div>
  );
};

export default OverlayApp;
```

Note: `DamageCalculatorPage` must export `OverlayDefender` (done in Task 6).

- [ ] **Step 5: Register the route**

In `src/App.tsx`, add the import and the route as a sibling of the `Layout` route (inside `FormatProvider`/`Routes`, NOT nested under `Layout`):

```tsx
import OverlayApp from '@/features/overlay/OverlayApp'
```

```tsx
      <Routes>
        <Route path="/overlay" element={<OverlayApp />} />
        <Route path="/" element={<Layout />}>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/features/overlay/OverlayApp.test.tsx`
Expected: PASS (4 tests)

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, full suite PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/overlay/usePokemonList.ts src/features/overlay/OverlayApp.tsx src/features/overlay/OverlayApp.test.tsx src/App.tsx
git commit -m "feat(overlay): OverlayApp shell and /overlay route"
```

---

### Task 8: Native panel window, OverlayBridge, and bubble restyle

**Files:**
- Create: `android/app/src/main/java/com/brianwong/championsvgc/OverlayPanelController.java`
- Modify: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java`
- Modify: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java`

**Interfaces:**
- Consumes: `ScreenCaptureService.captureLatestPng()` (existing), Capacitor `Bridge#getAppUrl()` and `BridgeWebViewClient(Bridge)`.
- Produces: JS interface `window.OverlayBridge` with `captureFrame()`, `blinkAndCapture()`, `setWindowState(String)`, `setBubbleTag(String)`; calls `window.__overlayBubbleTap()` / `window.__overlayBack()` (Task 3's contract).

- [ ] **Step 1: Write `OverlayPanelController`**

`android/app/src/main/java/com/brianwong/championsvgc/OverlayPanelController.java`:

```java
package com.brianwong.championsvgc;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Second overlay window hosting the app's /overlay route. Window states:
 * hidden (removed), strip (short docked bottom bar, not focusable),
 * panel (fullscreen, focusable). The web layer drives all transitions.
 */
public class OverlayPanelController {
    private final ScreenCaptureService service;
    private final WindowManager wm;
    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView webView;
    private String state = "hidden";
    private boolean attached = false;
    private volatile String pendingFrame;

    public OverlayPanelController(ScreenCaptureService service, Bridge bridge) {
        this.service = service;
        wm = (WindowManager) service.getSystemService(Context.WINDOW_SERVICE);
        webView = new WebView(service);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                main.post(OverlayPanelController.this::destroy);
                return true;
            }
        });
        webView.addJavascriptInterface(new JsBridge(), "OverlayBridge");
        webView.setOnKeyListener((v, keyCode, event) -> {
            if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                eval("window.__overlayBack && window.__overlayBack();");
                return true;
            }
            return false;
        });
        String base = bridge.getAppUrl().replaceAll("/+$", "");
        webView.loadUrl(base + "/overlay");
    }

    /** Bubble tap: capture BEFORE any window changes so the frame is clean. */
    public void onBubbleTap() {
        pendingFrame = service.captureLatestPng();
        eval("window.__overlayBubbleTap && window.__overlayBubbleTap();");
    }

    private void eval(String js) {
        main.post(() -> { if (webView != null) webView.evaluateJavascript(js, null); });
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v,
                service.getResources().getDisplayMetrics());
    }

    private WindowManager.LayoutParams paramsFor(String s) {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        if ("panel".equals(s)) {
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    type,
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                            | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    PixelFormat.TRANSLUCENT);
            lp.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
            return lp;
        }
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                dp(64),
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.BOTTOM;
        return lp;
    }

    private void applyWindowState(String s) {
        if (webView == null) return;
        state = s;
        if (attached) { try { wm.removeView(webView); } catch (Exception ignored) {} attached = false; }
        if (!"hidden".equals(s)) {
            wm.addView(webView, paramsFor(s));
            attached = true;
        }
        service.setBubbleVisible(!"panel".equals(s));
    }

    public void destroy() {
        if (attached) { try { wm.removeView(webView); } catch (Exception ignored) {} attached = false; }
        if (webView != null) { webView.destroy(); webView = null; }
    }

    private class JsBridge {
        @JavascriptInterface
        public String captureFrame() { return pendingFrame; }

        @JavascriptInterface
        public String blinkAndCapture() {
            // Runs on the WebView's JS-bridge thread, never the UI thread.
            main.post(() -> { if (webView != null) webView.setVisibility(View.INVISIBLE); });
            try { Thread.sleep(300); } catch (InterruptedException ignored) {}
            String png = service.captureLatestPng();
            main.post(() -> { if (webView != null) webView.setVisibility(View.VISIBLE); });
            pendingFrame = png;
            return png;
        }

        @JavascriptInterface
        public void setWindowState(String s) { main.post(() -> applyWindowState(s)); }

        @JavascriptInterface
        public void setBubbleTag(String tag) { main.post(() -> service.setBubbleTag(tag)); }
    }
}
```

- [ ] **Step 2: Restyle the bubble and integrate the controller in the service**

In `ScreenCaptureService.java`:

Add fields and imports:

```java
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.Bridge;
```

```java
    public static Bridge pendingBridge; // set by the plugin right before startService
    private OverlayPanelController panelController;
    private View bubbleView;
    private TextView bubbleTagView;
```

Replace the `addFloatingButton()` method (and its `floatingButton` field) with:

```java
    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v,
                getResources().getDisplayMetrics());
    }

    private void addFloatingBubble() {
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);

        View circle = new View(this);
        GradientDrawable face = new GradientDrawable();
        face.setShape(GradientDrawable.OVAL);
        face.setColor(0xEE10141C);
        face.setStroke(dp(2), 0xFF5A85FF);
        circle.setBackground(face);
        box.addView(circle, dp(46), dp(46));

        bubbleTagView = new TextView(this);
        bubbleTagView.setText("SCAN");
        bubbleTagView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        bubbleTagView.setTextColor(0xFF0A0F1A);
        bubbleTagView.setTypeface(null, android.graphics.Typeface.BOLD);
        GradientDrawable pill = new GradientDrawable();
        pill.setCornerRadius(dp(9));
        pill.setColor(0xFF5A85FF);
        bubbleTagView.setBackground(pill);
        bubbleTagView.setPadding(dp(7), dp(1), dp(7), dp(1));
        LinearLayout.LayoutParams tagLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tagLp.topMargin = -dp(7);
        box.addView(bubbleTagView, tagLp);

        box.setOnClickListener(v -> { if (panelController != null) panelController.onBubbleTap(); });

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 24;
        lp.y = 240;
        windowManager.addView(box, lp);
        bubbleView = box;
    }

    /** Called from the overlay web layer via OverlayPanelController. */
    public void setBubbleTag(String tag) {
        if (bubbleTagView == null) return;
        boolean calc = "calc".equals(tag);
        bubbleTagView.setText(calc ? "CALC" : "SCAN");
        GradientDrawable pill = new GradientDrawable();
        pill.setCornerRadius(dp(9));
        pill.setColor(calc ? 0xFF36C281 : 0xFF5A85FF);
        bubbleTagView.setBackground(pill);
    }

    public void setBubbleVisible(boolean visible) {
        if (bubbleView != null) bubbleView.setVisibility(visible ? View.VISIBLE : View.GONE);
    }
```

In `onStartCommand`, replace `addFloatingButton();` with:

```java
        addFloatingBubble();
        if (pendingBridge != null) {
            panelController = new OverlayPanelController(this, pendingBridge);
        }
```

In `teardown()`, replace the `floatingButton` block with:

```java
        if (panelController != null) { panelController.destroy(); panelController = null; }
        if (bubbleView != null && windowManager != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
            bubbleTagView = null;
        }
```

Delete the now-unused `TapListener` interface, `tapListener` static field, `instance`-unrelated `Button` import, and the `floatingButton` field. Keep `instance` — the plugin's `capture()` and the controller use it.

- [ ] **Step 3: Hand the Bridge to the service from the plugin**

In `ScreenCapturePlugin.java`, inside `projectionResult` replace:

```java
        ScreenCaptureService.tapListener = () -> notifyListeners("overlayTap", new JSObject());
```

with:

```java
        ScreenCaptureService.pendingBridge = getBridge();
```

and in `stopSession` replace `ScreenCaptureService.tapListener = null;` with `ScreenCaptureService.pendingBridge = null;`.

- [ ] **Step 4: Build the web bundle and the APK**

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug && cd ..
```

Expected: `BUILD SUCCESSFUL` for both.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/brianwong/championsvgc/OverlayPanelController.java android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java
git commit -m "feat(android): overlay panel window with OverlayBridge and restyled bubble"
```

---

### Task 9: Retire the old tap → bring-app-to-front flow

**Files:**
- Modify: `src/features/scan/OneTapCaptureToggle.tsx`
- Modify: `src/pages/DamageCalculator/index.tsx`

**Interfaces:**
- Produces: `<OneTapCaptureToggle />` with **no props** (enable/disable only). The `overlayTap` listener, `mediaProjectionSource.capture()` call, and `bringToFront()` call are removed from the web layer. `ScreenCapture.bringToFront` stays in the plugin interface (harmless, still implemented natively).

- [ ] **Step 1: Simplify the toggle**

Replace the body of `src/features/scan/OneTapCaptureToggle.tsx` with:

```tsx
import React from 'react';
import { ScreenCapture, isAndroidNative } from './mediaProjectionSource';

// Enable/disable the floating overlay session. Bubble taps are handled
// entirely by the native overlay panel (#/overlay route), not this app view.
const OneTapCaptureToggle: React.FC = () => {
  const [active, setActive] = React.useState(false);

  if (!isAndroidNative()) return null;

  const enable = async () => {
    if (!(await ScreenCapture.hasOverlayPermission()).granted) {
      await ScreenCapture.requestOverlayPermission();
      return; // user returns from settings, taps again
    }
    await ScreenCapture.startSession();
    setActive(true);
  };
  const disable = async () => { await ScreenCapture.stopSession(); setActive(false); };

  return (
    <button
      onClick={active ? disable : enable}
      className="px-4 py-2 rounded bg-safe-soft text-safe border border-safe-line text-sm font-semibold hover:bg-safe-soft-hover transition-colors"
    >
      {active ? 'Stop one-tap capture' : 'Enable one-tap capture'}
    </button>
  );
};

export default OneTapCaptureToggle;
```

- [ ] **Step 2: Remove the dead capture plumbing from the page**

In `src/pages/DamageCalculator/index.tsx`:
- Change `<OneTapCaptureToggle onCaptured={handleCaptured} />` to `<OneTapCaptureToggle />`.
- Delete the `handleCaptured` callback and the `const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);` state.
- In both `ScanTeamModal` usages: remove the `externalBlob={capturedBlob}` prop and change `onClose={() => { setIsScanModalOpen(false); setCapturedBlob(null); }}` to `onClose={() => setIsScanModalOpen(false)}`.
- Remove the now-unused `import type { CapturedFrame } from '@/features/scan/captureSource';` if nothing else uses it.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck, full suite PASS.

```bash
git add src/features/scan/OneTapCaptureToggle.tsx src/pages/DamageCalculator/index.tsx
git commit -m "refactor(scan): retire tap->bring-to-front flow; overlay panel owns bubble taps"
```

---

### Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full web verification**

```bash
npx tsc --noEmit && npx vitest run && npm run build
```

Expected: all PASS / BUILD SUCCESSFUL.

- [ ] **Step 2: Android build**

```bash
npx cap sync android && cd android && ./gradlew assembleDebug && cd ..
```

Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: On-device manual checklist (from the spec)**

Install the debug APK on the Android device, then verify each item and record pass/fail:

1. Enable capture in the app, grant overlay + projection permissions → bubble appears with SCAN tag.
2. Open the game at team preview, tap bubble → confirm panel opens with 6 detected mons; the game's opponent column stays visible to the right.
3. Fix one low-confidence slot via candidates; Confirm & lock → panel collapses to the docked strip; bubble tag flips to CALC.
4. In battle, tap bubble → calculator opens with the left-most opponent as defender and its HP applied ("Read · N% HP" chip).
5. Tap "Scan active + HP" → panel blinks, fresh HP applied; the captured frame must NOT contain the panel.
6. Tap the second on-field mon in the roster chips → it loads as defender with its scanned HP.
7. Minimize → strip; tap another strip mon → reopen calc via bubble → that mon is defender.
8. Rotate the device → bubble, strip, and captures still correct.
9. Text input inside the calculator panel works (panel window is focusable); system Back closes the panel.
10. Revoke screen capture from the notification → bubble, strip, and panel all disappear.
11. Open the main app afterwards → the locked roster shows in the calculator's roster chips.

- [ ] **Step 4: Record results and finish**

Append pass/fail notes for the checklist to this plan file, commit, and use superpowers:finishing-a-development-branch to wrap up (PR to main per repo convention).

```bash
git add docs/superpowers/plans/2026-07-12-android-float-bubble-overlay.md
git commit -m "docs: on-device verification results for overlay UX"
```
