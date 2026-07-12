# Overlay My-Team Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Android floating bubble recognizes the game's "Replicate This Battle Team?" screens (Moves & More / Stats) and runs the existing full-detail player scan, saving the result as a Team — while the opponent team-preview scan stays exactly as it is.

**Architecture:** One capture path, screen-type dispatch: `OverlayApp.runScan` calls `detectPlayerPanels` (strict pure-pixel 2×3 purple-grid detector) on every decoded frame; a hit routes to a new `playerScan` view hosting the existing `PlayerScanPanel` (which owns `usePlayerTeamScan` state), a miss falls through to the unchanged `scanFrame` flow. The panel survives minimize (window `hidden`, view kept) so the user can flip the game to the second screen and tap the bubble to add it. Saving creates a Team via `useTeams` (its restore-from-localStorage effect prevents clobbering existing teams across WebViews). Zero native (Java) changes.

**Tech Stack:** React 18 + TypeScript, Vitest (+ jsdom + @testing-library/react), sql.js/drizzle, Capacitor Android overlay (untouched).

**Spec:** `docs/superpowers/specs/2026-07-13-overlay-my-team-scan-design.md`

## Global Constraints

- Branch: `claude/android-bubble-team-scan-674ac2` (worktree at `.claude/worktrees/android-bubble-team-scan-674ac2`).
- Fresh worktrees lack `node_modules` and untracked fixtures: run `npm install --legacy-peer-deps` if `node_modules` is missing, and symlink fixtures from the root checkout before running tests: `ln -s /Users/brianwong/Project/react/pokemon-champions-vgc/training/screenshots training/screenshots` and `ln -s /Users/brianwong/Project/react/pokemon-champions-vgc/training/player-screens training/player-screens` (skip if they already exist).
- Do NOT modify: `scanFrame.ts`, `scanTargets.ts`, `playerPanels.ts`, `usePlayerTeamScan.ts`, `overlayScan.ts`, any native Java, any golden/accuracy harness.
- Do NOT touch `calc.myTeamId` (user decision: save the Team only) or `scan.battleRoster`.
- `git add` exact file paths only — never `git add -A`.
- Full-suite commands: `npx vitest run` and `npx tsc --noEmit`.

---

### Task 1: `PlayerScanPanel` hosting seams — `sources`, `hint`, `frame` props

The overlay hosts the existing `PlayerScanPanel` but must (a) hide the file-picker/camera buttons (frames arrive from bubble captures), (b) replace the intro copy with bubble instructions, and (c) feed externally captured frames into the panel's internal `usePlayerTeamScan`. Three optional props, all defaulting to current behavior so the Teams-page flows are untouched.

**Files:**
- Modify: `src/features/scan/PlayerScanPanel.tsx`
- Test (create): `src/features/scan/PlayerScanPanel.test.tsx`

**Interfaces:**
- Consumes: existing `PlayerScanPanel` internals (`usePlayerTeamScan`, `captureFor`, `renderChip`), `CaptureSource`/`CaptureSourceKind` from `./captureSource`.
- Produces (Task 2 relies on these exact names/types on `PlayerScanPanelProps`):
  - `sources?: CaptureSource[]` — capture buttons rendered per screen chip; default `[filePickerSource, cameraSource]`; `[]` hides them.
  - `hint?: React.ReactNode` — replaces the default intro `<p>`.
  - `frame?: { blob: Blob; seq: number } | null` — externally captured frame; the panel scans it whenever `seq` advances (never twice for the same seq).

- [ ] **Step 1: Write the failing tests**

Create `src/features/scan/PlayerScanPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import PlayerScanPanel from './PlayerScanPanel';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

const pokemonList = [
  { id: 7, nameEn: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65,
    baseSpAtk: 50, baseSpDef: 64, baseSpeed: 43, type1: 'Water', type2: null, identifier: 'squirtle', nameZh: null },
] as any;

const movesFrame = {
  kind: 'moves',
  panels: Array.from({ length: 6 }, (_, slot) => ({
    slot, species: [{ id: 7, score: 0.9 }], ability: null, item: null, moves: [null, null, null, null],
  })),
} as any;

// Fake usePlayerTeamScan deps (pattern from PlayerScanModal.test.tsx) that
// count how many frames reached the scanner.
const mkDeps = () => {
  const scanCalls: unknown[] = [];
  const deps = {
    blobToRgbaImage: async () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    loadVocab: async () => buildPlayerScanVocab({ moves: [], learnset: [], abilities: [], items: [] }),
    scanDeps: {} as any,
    detect: () => null as any,
    scan: async () => { scanCalls.push(1); return movesFrame; },
  } as any;
  return { deps, scanCalls };
};

afterEach(cleanup);

describe('PlayerScanPanel hosting seams', () => {
  it('renders the default file + camera capture buttons when sources is omitted', () => {
    const { deps } = mkDeps();
    render(<PlayerScanPanel pokemonList={pokemonList} moveList={[]} onSave={() => {}} deps={deps} />);
    // one per screen chip (moves + stats)
    expect(screen.getAllByRole('button', { name: 'Add screenshot' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Take photo' })).toHaveLength(2);
  });

  it('sources=[] hides the capture buttons (overlay hosting)', () => {
    const { deps } = mkDeps();
    render(<PlayerScanPanel pokemonList={pokemonList} moveList={[]} onSave={() => {}} deps={deps} sources={[]} />);
    expect(screen.queryByRole('button', { name: 'Add screenshot' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Take photo' })).toBeNull();
  });

  it('hint replaces the default intro copy', () => {
    const { deps } = mkDeps();
    render(<PlayerScanPanel pokemonList={pokemonList} moveList={[]} onSave={() => {}} deps={deps} hint={<p>bubble-hint</p>} />);
    expect(screen.getByText('bubble-hint')).toBeTruthy();
    expect(screen.queryByText(/Add both screens of your team/)).toBeNull();
  });

  it('scans an externally captured frame whenever seq advances, never twice per seq', async () => {
    const { deps, scanCalls } = mkDeps();
    const blob = new Blob(['x']);
    const props = { pokemonList, moveList: [], onSave: () => {}, deps, sources: [] as any[] };
    const view = render(<PlayerScanPanel {...(props as any)} frame={{ blob, seq: 1 }} />);
    await act(async () => {});
    expect(scanCalls).toHaveLength(1);

    view.rerender(<PlayerScanPanel {...(props as any)} frame={{ blob, seq: 1 }} />);
    await act(async () => {});
    expect(scanCalls).toHaveLength(1); // same seq -> no rescan

    view.rerender(<PlayerScanPanel {...(props as any)} frame={{ blob, seq: 2 }} />);
    await act(async () => {});
    expect(scanCalls).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/scan/PlayerScanPanel.test.tsx`
Expected: 4 FAIL — TypeScript/props errors or "Unable to find an element"; the `sources=[]` test fails because the hardcoded buttons still render, the `frame` test fails with `scanCalls` length 0.

- [ ] **Step 3: Implement the three props in `PlayerScanPanel.tsx`**

3a. Extend the `captureSource` import (line 10) and add module consts after `CHIP_LABEL` (line 39):

```tsx
import { filePickerSource, cameraSource, type CaptureSource, type CaptureSourceKind } from './captureSource';
```

```tsx
const DEFAULT_SOURCES: CaptureSource[] = [filePickerSource, cameraSource];
const SOURCE_LABEL: Record<CaptureSourceKind, string> = {
  file: 'Add screenshot',
  camera: 'Take photo',
  mediaProjection: 'Scan this screen',
};
```

3b. Add the props to `PlayerScanPanelProps` (after `deps`):

```tsx
  /** Capture affordances rendered in each screen chip. Defaults to file picker +
   *  camera (Teams flows). Pass [] to hide them (overlay: frames arrive via `frame`). */
  sources?: CaptureSource[];
  /** Replaces the default intro copy (overlay: minimize-and-bubble-tap instructions). */
  hint?: React.ReactNode;
  /** Externally captured frame; scanned whenever `seq` advances (overlay bubble taps). */
  frame?: { blob: Blob; seq: number } | null;
```

3c. Destructure them (component signature):

```tsx
export const PlayerScanPanel: React.FC<PlayerScanPanelProps> = ({ pokemonList, moveList, onSave, onCancel, active = true, deps, sources, hint, frame }) => {
```

3d. Widen `captureFor`'s parameter type:

```tsx
  const captureFor = async (source: CaptureSource) => {
    const frame2 = await source.capture();
    if (frame2) await addFrame(frame2.blob);
  };
```

(rename the local from `frame` to `frame2` to avoid shadowing the new prop).

3e. Add the frame-ingest effect next to the other effects (after the `prevStatusesRef` effect):

```tsx
  // Externally captured frames (overlay bubble taps): scan each seq exactly once.
  const lastFrameSeq = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (frame && frame.seq !== lastFrameSeq.current) {
      lastFrameSeq.current = frame.seq;
      void addFrame(frame.blob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.seq]);
```

3f. In `renderChip`, replace the two hardcoded capture buttons (keep the crop-retry button unchanged):

```tsx
          <div className="flex flex-wrap gap-2">
            {(sources ?? DEFAULT_SOURCES).map((s) => (
              <button
                key={s.kind}
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-accent text-accent-ink hover:bg-accent-hover transition-colors"
                onClick={() => captureFor(s)}
              >
                {SOURCE_LABEL[s.kind]}
              </button>
            ))}
            {state.blob && (
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-line-2 text-ink-2 hover:bg-raise"
                onClick={() => setCroppingKind(kind)}
              >
                Crop &amp; retry
              </button>
            )}
          </div>
```

3g. Replace the intro `<p>` (first child of the returned root div):

```tsx
      {hint ?? <p className="text-sm text-ink-3">Add both screens of your team — moves/item and stats. Order doesn't matter.</p>}
```

- [ ] **Step 4: Run the new tests and the existing modal tests**

Run: `npx vitest run src/features/scan/PlayerScanPanel.test.tsx src/features/scan/PlayerScanModal.test.tsx`
Expected: all PASS (2 existing modal tests prove default behavior is unchanged).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/features/scan/PlayerScanPanel.tsx src/features/scan/PlayerScanPanel.test.tsx
git commit -m "feat(scan): PlayerScanPanel hosting seams — sources, hint, external frame props"
```

---

### Task 2: Overlay routing + playerScan/playerSaved views + team save

`OverlayApp` routes every captured frame: player-panel grid detected → `playerScan` view (PlayerScanPanel, minimize-preserving); otherwise the existing `scanFrame` flow. Saving creates a Team via `useTeams`.

**Files:**
- Create: `src/features/overlay/useMoveList.ts`
- Modify: `src/features/overlay/OverlayApp.tsx`
- Test (modify): `src/features/overlay/OverlayApp.test.tsx`

**Interfaces:**
- Consumes: `PlayerScanPanelProps.sources/hint/frame` from Task 1 (exact shapes above); `detectPlayerPanels(img: RgbaImage): PlayerFrameDetection | null` from `../scan/playerPanels`; `useTeams()` → `{ createTeam(name: string, members: PokemonConfig[]): Promise<string> }` from `@/features/teams/hooks/useTeams`.
- Produces: `useMoveList(): MoveData[]` (overlay-local hook); `View` union extended with `'playerScan' | 'playerSaved'`.

- [ ] **Step 1: Write the failing tests**

In `src/features/overlay/OverlayApp.test.tsx`:

1a. Add hoisted mocks next to the existing ones (after `scanFrameMock`, line 16):

```tsx
const detectPlayerPanelsMock = vi.hoisted(() => vi.fn((): unknown => null));
const createTeamMock = vi.hoisted(() => vi.fn(async () => 'team-1'));
```

1b. Add module mocks next to the existing `vi.mock` calls:

```tsx
vi.mock('../scan/playerPanels', () => ({ detectPlayerPanels: detectPlayerPanelsMock }));
vi.mock('./useMoveList', () => ({ useMoveList: () => [] }));
vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: () => ({
    teams: [], loading: false, error: null,
    createTeam: createTeamMock,
    fetchTeams: vi.fn(), updateTeam: vi.fn(), deleteTeam: vi.fn(), getTeam: vi.fn(),
  }),
}));
vi.mock('../scan/PlayerScanPanel', () => ({
  default: ({ onSave, onCancel, frame }: any) => (
    <div data-testid="player-scan" data-frame-seq={frame?.seq ?? 'none'}>
      <button onClick={() => onSave([{ selectedId: 445 }])}>save-stub</button>
      <button onClick={onCancel}>cancel-stub</button>
    </div>
  ),
}));
```

1c. Reset the routing default in `beforeEach` (mockReturnValue survives `clearAllMocks`):

```tsx
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); detectPlayerPanelsMock.mockReturnValue(null); });
```

1d. Append the new tests inside the `describe`:

```tsx
  it('bubble tap on a player-team screen routes to the my-team scan, not scanFrame', async () => {
    detectPlayerPanelsMock.mockReturnValue({ kind: 'moves', panels: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    const panel = await screen.findByTestId('player-scan');
    expect(panel.getAttribute('data-frame-seq')).not.toBe('none');
    expect(scanFrameMock).not.toHaveBeenCalled();
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('panel');
  });

  it('bubble tap while the my-team scan is open adds a frame instead of restarting', async () => {
    detectPlayerPanelsMock.mockReturnValue({ kind: 'moves', panels: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    const seq1 = (await screen.findByTestId('player-scan')).getAttribute('data-frame-seq');
    await act(async () => { (globalThis as any).__tap(); });
    const seq2 = (await screen.findByTestId('player-scan')).getAttribute('data-frame-seq');
    expect(seq2).not.toBe(seq1); // new frame reached the SAME mounted panel
    expect(scanFrameMock).not.toHaveBeenCalled();
  });

  it('saving the scanned team creates it named after the first species and shows the saved card', async () => {
    detectPlayerPanelsMock.mockReturnValue({ kind: 'moves', panels: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    await screen.findByTestId('player-scan');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'save-stub' })); });
    expect(createTeamMock).toHaveBeenCalledWith("Garchomp's Team", [{ selectedId: 445 }]);
    expect(await screen.findByText('Team saved')).toBeTruthy();
  });

  it('cancelling the my-team scan closes the panel back to idle', async () => {
    detectPlayerPanelsMock.mockReturnValue({ kind: 'moves', panels: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    await screen.findByTestId('player-scan');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'cancel-stub' })); });
    expect(screen.queryByTestId('player-scan')).toBeNull();
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('hidden'); // no roster -> window hidden
  });
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run src/features/overlay/OverlayApp.test.tsx`
Expected: the 8 existing tests PASS (routing default null keeps behavior); the 4 new tests FAIL ("Unable to find an element by: [data-testid=player-scan]").

- [ ] **Step 3: Create `src/features/overlay/useMoveList.ts`**

```tsx
// Full move table for the overlay's my-team scan (PlayerScanPanel needs
// MoveData for learnset display + buildConfigs). Mirrors usePokemonList;
// ponytail: extract a shared fetch hook if a third consumer appears.
import { useEffect, useState } from 'react';
import { getDb } from '@/db';
import { moves } from '@/db/schema';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

export function useMoveList(): MoveData[] {
  const [list, setList] = useState<MoveData[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.select().from(moves);
        if (!cancelled) setList(rows as MoveData[]);
      } catch (e) {
        console.error('[overlay] move list load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return list;
}
```

- [ ] **Step 4: Wire routing, views, and save into `OverlayApp.tsx`**

4a. Imports (add to the existing block):

```tsx
import PlayerScanPanel from '../scan/PlayerScanPanel';
import { detectPlayerPanels } from '../scan/playerPanels';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { useMoveList } from './useMoveList';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
```

4b. Extend the view union:

```tsx
type View = 'idle' | 'scanning' | 'confirm' | 'calc' | 'error' | 'playerScan' | 'playerSaved';
```

4c. New state/hooks inside the component (after `const { roster, confirmRoster } = useBattleRoster();`):

```tsx
  const moveList = useMoveList();
  // Restore-from-localStorage inside useTeams hydrates this WebView's in-memory
  // DB with existing teams BEFORE any save — otherwise the persist effect would
  // clobber localStorage['vgc_teams'] with only the new team.
  const { createTeam } = useTeams();
  const [playerFrame, setPlayerFrame] = useState<{ blob: Blob; seq: number } | null>(null);
```

4d. In `runScan`, add the routing branch immediately after the decode line (`const image = await DEFAULT_DEPS.blobToRgbaImage(blob);`):

```tsx
      // "Replicate This Battle Team?" screens (2x3 purple panel grid) route to
      // the my-team scan; team-preview/battle frames fall through to scanFrame.
      if (detectPlayerPanels(image)) {
        seqRef.current += 1;
        setPlayerFrame({ blob, seq: seqRef.current });
        setView('playerScan');
        return;
      }
```

4e. Replace the bubble-tap effect (keep its existing comment, extend it):

```tsx
  // Roster locked -> the bubble is a calculator shortcut: open instantly, no
  // capture. In-battle scanning (species + HP) was removed — not accurate
  // enough (2026-07-12). No roster -> scan; the frame routes by screen type.
  // While the my-team scan is open (possibly minimized so the user can flip
  // the game to its other team screen), a tap adds the frame to THAT scan.
  useEffect(() => overlayBridge.onBubbleTap(() => {
    if (view === 'playerScan') {
      const blob = overlayBridge.blinkAndCapture();
      if (blob) { seqRef.current += 1; setPlayerFrame({ blob, seq: seqRef.current }); }
      overlayBridge.setWindowState('panel');
      return;
    }
    if (readBattleRoster()) {
      setView('calc');
      overlayBridge.setWindowState('panel');
    } else {
      void runScan(overlayBridge.blinkAndCapture());
    }
  }), [view, runScan]);
```

4f. Make native Back minimize (not destroy) the player scan — replace the `onBack` effect:

```tsx
  useEffect(() => overlayBridge.onBack(view === 'playerScan' ? minimizePlayerScan : closePanel), [view, closePanel, minimizePlayerScan]);
```

4g. Handlers (place after `closePanel`, before `runScan` — `minimizePlayerScan` must be declared before the `onBack` effect uses it):

```tsx
  // Minimize, don't destroy: the scan state must survive while the user flips
  // the game to the other team screen; a bubble tap re-opens + adds the frame.
  const minimizePlayerScan = useCallback(() => {
    overlayBridge.setWindowState('hidden');
    overlayBridge.setBubbleTag('scan');
  }, []);

  const cancelPlayerScan = useCallback(() => {
    setPlayerFrame(null);
    closePanel();
  }, [closePanel]);

  const handlePlayerSave = useCallback(async (members: PokemonConfig[]) => {
    if (members.length === 0) return;
    const first = pokemonList.find((p) => p.id === members[0].selectedId);
    try {
      await createTeam(`${first?.nameEn ?? 'Scanned'}'s Team`, members);
      setPlayerFrame(null);
      setView('playerSaved');
    } catch (e) {
      console.error('[overlay] save team failed', e);
    }
  }, [pokemonList, createTeam]);
```

4h. Render the views — insert this block BEFORE `if (view === 'calc')`:

```tsx
  if (view === 'playerScan' || view === 'playerSaved') {
    return (
      <div className="w-full h-screen p-2" onClick={view === 'playerScan' ? minimizePlayerScan : cancelPlayerScan}>
        <div
          className="w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-page)', border: '1px solid var(--line-2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 px-3 h-8 shrink-0" style={{ borderBottom: '1px solid var(--line-1)', color: 'var(--ink-1)' }}>
            <Icon name="scan-line" size={14} color="var(--accent)" />
            <span className="text-xs font-bold">Scan my team</span>
            <span className="flex-1" />
            {view === 'playerScan' && (
              <button aria-label="Minimize" onClick={minimizePlayerScan} className="text-[11px] px-2 py-1 rounded" style={{ border: '1px solid var(--line-2)', background: 'var(--surface-inset)', color: 'var(--ink-2)' }}>
                ▾
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {view === 'playerSaved' ? (
              <div className="h-full grid place-items-center">
                <div className="text-center space-y-3">
                  <div className="text-sm font-bold" style={{ color: 'var(--ink-1)' }}>Team saved</div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Find it on the Teams page — moves, item and EVs included.</div>
                  <button onClick={cancelPlayerScan} className="h-9 px-5 rounded-lg font-bold text-sm" style={{ background: 'var(--accent)', color: 'var(--navy-900)' }}>Done</button>
                </div>
              </div>
            ) : (
              <PlayerScanPanel
                pokemonList={pokemonList}
                moveList={moveList}
                sources={[]}
                hint={
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                    Scanned from the game's team screens. To add the other screen (moves or stats), minimize this panel (▾), flip the screen in-game, and tap the bubble again.
                  </p>
                }
                frame={playerFrame}
                onSave={(members) => void handlePlayerSave(members)}
                onCancel={cancelPlayerScan}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 5: Run the OverlayApp tests**

Run: `npx vitest run src/features/overlay/OverlayApp.test.tsx`
Expected: all 12 PASS (8 existing + 4 new).

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/features/overlay/OverlayApp.tsx src/features/overlay/OverlayApp.test.tsx src/features/overlay/useMoveList.ts
git commit -m "feat(overlay): bubble routes player-team screens to a my-team scan that saves a Team"
```

---

### Task 3: Full verification — suite, typecheck, live browser flow

**Files:** none created/modified (verification only; temp file under `public/` is removed before finishing).

**Interfaces:** n/a.

- [ ] **Step 1: Full test suite + typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: every test file passes (~500 tests incl. golden floors — needs the `training/` symlinks from Global Constraints), tsc clean. Report exact totals.

- [ ] **Step 2: Live browser verification of the routing + save flow**

The overlay page runs fine in a normal browser (bridge no-ops); stub the native bridge with a golden screenshot so a synthetic bubble tap drives the REAL pipeline (detection, panel carving, species classify, save).

1. Copy one golden player screenshot where the dev server can serve it (check `training/player-screens/MANIFEST.md` for an English "moves" frame; use `ls training/player-screens/` to get exact names):

```bash
cp "training/player-screens/<english-moves-frame>.png" public/__verify-moves.png
```

2. Start the dev server via the Browser pane (`preview_start` with the launch.json entry; base URL is `/pokemon-champions-vgc/`) and navigate to `http://localhost:<port>/pokemon-champions-vgc/#/overlay`.

3. In the page (javascript_tool), stub the bridge and tap:

```js
const res = await fetch('/pokemon-champions-vgc/__verify-moves.png');
const buf = new Uint8Array(await res.arrayBuffer());
let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
const b64 = btoa(bin);
window.OverlayBridge = {
  blinkAndCapture: () => b64,
  setWindowState: (s) => console.log('[verify] windowState', s),
  setBubbleTag: (t) => console.log('[verify] bubbleTag', t),
};
window.__overlayBubbleTap();
```

4. Verify with read_page / screenshot: the "Scan my team" panel opens with 6 parsed slots (species thumbnails + moves/item fields), NOT the "Confirm opponent roster" view and NOT the error card.

5. Click "Save team" (fix nothing — defaults are fine for verification), then check persistence:

```js
JSON.parse(localStorage.getItem('vgc_teams')).map(t => ({ name: t.name, members: t.members.length }))
```

Expected: an entry named `<first species>'s Team` with 6 members; the panel shows the "Team saved" card, Done returns to idle.

6. Regression check the opponent path in the same session: navigate to a fresh reload of `#/overlay`, re-stub `window.OverlayBridge` the same way but with a TEAM-PREVIEW golden (e.g. copy `training/screenshots/<team-preview>.png` to `public/__verify-preview.png` first), call `window.__overlayBubbleTap()`, and confirm the "Confirm opponent roster" view appears.

7. Clean up:

```bash
rm -f public/__verify-moves.png public/__verify-preview.png
```

- [ ] **Step 3: Report**

Summarize: suite totals, tsc result, and the two browser proofs (my-team panel + saved `vgc_teams` entry; opponent confirm regression) with screenshots.

---

## Self-Review Notes

- **Spec coverage:** routing (§1) → Task 2 step 4d/4e; overlay player flow + minimize semantics (§2) → Task 2 steps 4e–4h; `sources`/hint/frame seams (§2) → Task 1; data & saving (§3) → Task 2 steps 3, 4c, 4g; error handling (§4) → inherited (hook errors render in the panel; non-player/non-preview frames keep the existing error card — asserted by existing tests); risks accepted per spec; testing (§Testing) → Tasks 1–3.
- **Deviation from spec, deliberate:** the spec's "Scan this screen" in-panel capture button is NOT wired in the overlay (`sources=[]`) — with the panel open, the screen behind still shows the already-scanned frame, so an in-panel capture is useless for screen 2; minimize→flip→bubble-tap is the honest gesture and the hint copy teaches it. The `SOURCE_LABEL.mediaProjection` entry stays for type-completeness of the seam.
- **Type consistency:** `frame?: { blob: Blob; seq: number } | null` used identically in Task 1 props, Task 2 state, and both test stubs; `createTeam(name, members)` matches `useTeams`; `View` literals `'playerScan' | 'playerSaved'` used consistently.
