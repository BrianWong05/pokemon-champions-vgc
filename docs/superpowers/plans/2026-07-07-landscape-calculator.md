# Landscape Calculator (Battle HUD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a phone- or iPad-mini-sized viewport is in landscape, the calculator renders a three-panel battle HUD (attacker | result | defender) with per-move damage, scenario rows, and a Damage ↔ Speed compare mode.

**Architecture:** A new `useViewportMode` hook supersedes `useIsMobile` and adds an `arena-landscape` mode (`(orientation: landscape) and (max-height: 767px)`). `ArenaShell` gains a landscape variant (left `NavRail`, no AppBar). A third presentational tree `ArenaCalculatorLandscape` sits beside the portrait `ArenaCalculator`, receiving the identical props; all calculator state stays at the page level. Two new capabilities are small additions: `useDamageScenarios` (3 extra calcs on the active move) and `buildSpeedCompare` (pure speed math).

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (desktop) / inline styles + Arena CSS tokens (mobile trees), @smogon/calc, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-07-landscape-calculator-design.md`

## Global Constraints

- Fresh worktrees lack `node_modules`: run `npm install --legacy-peer-deps` once before any test command (plain `npm install` fails on peer conflicts).
- Run commands directly, never piped through `tail`/`grep`/`head` — stream full output.
- Test commands: `npx vitest run <file>` per task; `npx vitest run` and `npm run type-check` for full verification.
- Arena mobile components use **inline `style={}` objects referencing Arena CSS variables** (`var(--ink-1)` etc.) — never Tailwind classes, never hex colors. Desktop files keep Tailwind utilities.
- Copy rules: sentence case everywhere, no exclamation marks, no emoji. Micro-labels ≤11px may be uppercase via `letterSpacing`.
- Champions SP: cap 32 per stat. HP = base + 75 + SP; Stat = floor((base + 20 + SP) × nature).
- Commit with exact file paths only (`git add <paths>`), never `git add -A`.
- No new npm dependencies.
- Every commit message ends with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: `useViewportMode` hook

**Files:**
- Create: `src/hooks/useViewportMode.ts`
- Test: `src/hooks/useViewportMode.test.ts`

**Interfaces:**
- Consumes: nothing (leaf hook). Do NOT touch `src/hooks/useIsMobile.ts` yet (deleted in Task 4).
- Produces: `useViewportMode(): ViewportMode` and `export type ViewportMode = 'desktop' | 'arena' | 'arena-landscape'` — every later task branches on these exact string values.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useViewportMode.test.ts`:

```ts
// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useViewportMode } from './useViewportMode';

/**
 * Mock matchMedia keyed by query: the landscape query contains 'orientation',
 * the portrait query is the plain max-width one.
 */
function mockViewport(initial: { landscape: boolean; portrait: boolean }) {
  const listeners = new Set<() => void>();
  const state = { ...initial };
  // @ts-expect-error test shim
  window.matchMedia = (query: string) => ({
    get matches() {
      return query.includes('orientation') ? state.landscape : state.portrait;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  });
  return {
    set(next: { landscape: boolean; portrait: boolean }) {
      Object.assign(state, next);
      listeners.forEach((cb) => cb());
    },
  };
}

describe('useViewportMode', () => {
  it('375x812 portrait phone → arena', () => {
    mockViewport({ landscape: false, portrait: true });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena');
  });

  it('800x360 landscape phone → arena-landscape', () => {
    mockViewport({ landscape: true, portrait: false });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena-landscape');
  });

  it('landscape wins when both queries match (small landscape phone)', () => {
    mockViewport({ landscape: true, portrait: true });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena-landscape');
  });

  it('1280x800 desktop → desktop', () => {
    mockViewport({ landscape: false, portrait: false });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('desktop');
  });

  it('updates when the device rotates', () => {
    const vp = mockViewport({ landscape: false, portrait: true });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena');
    act(() => vp.set({ landscape: true, portrait: false }));
    expect(result.current).toBe('arena-landscape');
  });
});
```

(1133×744 iPad-mini landscape and 744×1133 portrait are the second and first cases respectively — the media queries only see landscape/portrait matches, which the mock models directly.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useViewportMode.test.ts`
Expected: FAIL — `Cannot find module './useViewportMode'`

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useViewportMode.ts`:

```ts
import { useEffect, useState } from 'react';

export type ViewportMode = 'desktop' | 'arena' | 'arena-landscape';

const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 767px)';
const PORTRAIT_QUERY = '(max-width: 767px)';

function compute(): ViewportMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia(LANDSCAPE_QUERY).matches) return 'arena-landscape';
  if (window.matchMedia(PORTRAIT_QUERY).matches) return 'arena';
  return 'desktop';
}

/**
 * useViewportMode — which of the three app frames to render.
 * - 'arena-landscape': landscape orientation, height <= 767px (phones and
 *   iPad-mini-sized tablets held sideways) → the battle HUD. Wins over 'arena'.
 * - 'arena': portrait mobile width (<= 767px, below Tailwind `md`).
 * - 'desktop': everything else. SSR / no-matchMedia safe.
 * Supersedes useIsMobile.
 */
export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(compute);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const queries = [LANDSCAPE_QUERY, PORTRAIT_QUERY].map((q) => window.matchMedia(q));
    const onChange = () => setMode(compute());
    onChange();
    queries.forEach((mql) => mql.addEventListener('change', onChange));
    return () => queries.forEach((mql) => mql.removeEventListener('change', onChange));
  }, []);

  return mode;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useViewportMode.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useViewportMode.ts src/hooks/useViewportMode.test.ts
git commit -m "feat: useViewportMode hook with arena-landscape mode

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `NavRail`, `RegPill` compact, Icon additions

**Files:**
- Create: `src/design-system/arena/NavRail.tsx`
- Modify: `src/design-system/arena/RegPill.tsx` (add `compact` prop)
- Modify: `src/design-system/arena/Icon.tsx` (add `'arrow-left-right'`, `'rotate-ccw'` to `IconName` + `PATHS`)
- Modify: `src/design-system/arena/index.ts` (export NavRail)
- Test: `src/design-system/arena/nav-rail.test.tsx`

**Interfaces:**
- Consumes: `Icon`, `ARENA_TABS`, `ArenaTab` from the same directory.
- Produces: `NavRail({ active?, onChange?, tabs?, bottom? })` — vertical icon-only nav, each button has `aria-label` = tab label. `RegPill` accepts `compact?: boolean` (renders short code, e.g. "M-B" from "Reg M-B", no chevron). Icons `arrow-left-right` and `rotate-ccw` become valid `IconName`s (used by Tasks 4 and 8).

- [ ] **Step 1: Write the failing test**

Create `src/design-system/arena/nav-rail.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NavRail } from './NavRail';
import { RegPill } from './RegPill';

describe('NavRail', () => {
  it('renders one icon button per tab with aria-labels, no text labels', () => {
    render(<NavRail active="calc" />);
    expect(screen.getByLabelText('Calculator')).toBeTruthy();
    expect(screen.getByLabelText('Teams')).toBeTruthy();
    expect(screen.getByLabelText('EV/SP')).toBeTruthy();
    expect(screen.getByLabelText('Speed tiers')).toBeTruthy();
    expect(screen.queryByText('Calculator')).toBeNull();
  });

  it('marks the active tab and reports clicks', () => {
    const onChange = vi.fn();
    render(<NavRail active="calc" onChange={onChange} />);
    expect(screen.getByLabelText('Calculator').getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByLabelText('Teams'));
    expect(onChange).toHaveBeenCalledWith('teams');
  });

  it('renders the bottom slot', () => {
    render(<NavRail active="calc" bottom={<span>bottom-slot</span>} />);
    expect(screen.getByText('bottom-slot')).toBeTruthy();
  });
});

describe('RegPill compact', () => {
  it('renders only the short code', () => {
    render(<RegPill value="Reg M-B" compact />);
    expect(screen.getByText('M-B')).toBeTruthy();
    expect(screen.queryByText('Reg M-B')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design-system/arena/nav-rail.test.tsx`
Expected: FAIL — `Cannot find module './NavRail'`

- [ ] **Step 3: Create NavRail**

Create `src/design-system/arena/NavRail.tsx`:

```tsx
import React from 'react';
import { Icon } from './Icon';
import { ARENA_TABS, ArenaTab } from './TabBar';

/**
 * NavRail — the landscape counterpart of TabBar: a slim left rail of
 * icon-only tabs (44px targets), with an optional bottom slot for shell
 * controls (theme toggle, reg pill).
 */
export function NavRail({ active = 'calc', onChange, tabs = ARENA_TABS, bottom }: {
  active?: string; onChange?: (id: string) => void; tabs?: ArenaTab[]; bottom?: React.ReactNode;
}) {
  return (
    <nav
      aria-label="Primary"
      style={{
        width: 56,
        flex: '0 0 auto',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 0',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        background: 'var(--bg-appbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--line-1)',
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            title={t.label}
            aria-label={t.label}
            aria-current={on ? 'page' : undefined}
            onClick={() => onChange && onChange(t.id)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--r-md)',
              display: 'grid',
              placeItems: 'center',
              background: on ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'transparent'}`,
              color: on ? 'var(--accent)' : 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'color var(--dur) var(--ease), background var(--dur) var(--ease)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name={t.icon} size={22} color={on ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth={on ? 2.1 : 1.75} />
          </button>
        );
      })}
      <span style={{ flex: 1 }} />
      {bottom}
    </nav>
  );
}
```

- [ ] **Step 4: Add the `compact` prop to RegPill**

In `src/design-system/arena/RegPill.tsx`, replace the component with:

```tsx
export function RegPill({ value = 'Reg H', onClick, compact = false, style = {} }: {
  value?: string; onClick?: () => void; compact?: boolean; style?: React.CSSProperties;
}) {
  const label = compact ? value.replace(/^Reg\s*/i, '') : value;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        height: compact ? 30 : 34,
        padding: compact ? '0 8px' : '0 6px 0 12px',
        borderRadius: 'var(--r-pill)',
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent-soft-line)',
        color: 'var(--accent-hover)',
        fontFamily: 'var(--font-display)',
        fontSize: compact ? 12 : 13.5,
        fontWeight: 'var(--fw-bold)',
        letterSpacing: 'var(--ls-tight)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto' }} />
      {label}
      {!compact && <Icon name="chevron-down" size={16} color="var(--accent-hover)" />}
    </button>
  );
}
```

(Keep the existing imports and docblock; only the function changes.)

- [ ] **Step 5: Add the two icons**

In `src/design-system/arena/Icon.tsx`: extend the `IconName` union with `| 'arrow-left-right' | 'rotate-ccw'` and add to `PATHS` (lucide path data):

```tsx
  'arrow-left-right': (
    <>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </>
  ),
  'rotate-ccw': (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
```

- [ ] **Step 6: Export from the barrel**

In `src/design-system/arena/index.ts`, after the TabBar line add:

```ts
export { NavRail } from './NavRail';
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/design-system/arena/nav-rail.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add src/design-system/arena/NavRail.tsx src/design-system/arena/nav-rail.test.tsx src/design-system/arena/RegPill.tsx src/design-system/arena/Icon.tsx src/design-system/arena/index.ts
git commit -m "feat: NavRail component, RegPill compact mode, swap/rotate icons

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `ArenaShell` landscape variant

**Files:**
- Modify: `src/components/templates/ArenaShell.tsx`
- Test: `src/components/templates/arena-shell-landscape.test.tsx`

**Interfaces:**
- Consumes: `NavRail`, `RegPill` compact (Task 2).
- Produces: `ArenaShell` accepts `landscape?: boolean`. Landscape = row layout, NavRail left (with ThemeToggle + compact RegPill in its bottom slot), no AppBar, no TabBar, RegPill menu anchored `left: 64, bottom: 10`.

- [ ] **Step 1: Write the failing test**

Create `src/components/templates/arena-shell-landscape.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ArenaShell from './ArenaShell';

vi.mock('@/features/formats/FormatContext', () => ({
  useFormat: () => ({ format: 'Reg M-B', setFormat: vi.fn(), availableFormats: ['Reg M-B'] }),
}));

describe('ArenaShell landscape', () => {
  it('portrait (default) renders app bar title and bottom tab labels', () => {
    render(<MemoryRouter initialEntries={['/']}><ArenaShell /></MemoryRouter>);
    expect(screen.getByText('Calculator')).toBeTruthy(); // AppBar title
    expect(screen.getByText('Teams')).toBeTruthy(); // TabBar label
  });

  it('landscape renders the nav rail instead of app bar + tab bar', () => {
    render(<MemoryRouter initialEntries={['/']}><ArenaShell landscape /></MemoryRouter>);
    expect(screen.getByLabelText('Primary')).toBeTruthy(); // NavRail
    expect(screen.getByLabelText('Teams')).toBeTruthy(); // rail icon button
    expect(screen.queryByText('Teams')).toBeNull(); // no TabBar text label
    expect(screen.queryByText('Calculator')).toBeNull(); // no AppBar title
    expect(screen.getByText('M-B')).toBeTruthy(); // compact RegPill in rail
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/templates/arena-shell-landscape.test.tsx`
Expected: portrait test PASSES, landscape test FAILS (no `landscape` prop yet — component renders portrait chrome).

- [ ] **Step 3: Implement the variant**

In `src/components/templates/ArenaShell.tsx`:

1. Extend the import: `import { AppBar, RegPill, TabBar, ARENA_TABS, ThemeToggle, NavRail } from '@/design-system/arena';`
2. Change the signature: `const ArenaShell: React.FC<{ landscape?: boolean }> = ({ landscape = false }) => {`
3. Change the outer div's `flexDirection` to `landscape ? 'row' : 'column'`.
4. Replace the `<AppBar …/>` element with:

```tsx
      {landscape ? (
        <NavRail
          active={active}
          onChange={(id) => navigate(ROUTE_BY_TAB[id] ?? '/')}
          bottom={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ThemeToggle />
              <RegPill compact value={format} onClick={() => setRegOpen(true)} />
            </div>
          }
        />
      ) : (
        <AppBar
          title={TITLE_BY_TAB[active]}
          right={
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ThemeToggle />
              <RegPill value={format} onClick={() => setRegOpen(true)} />
            </div>
          }
        />
      )}
```

5. Add `minWidth: 0` to the `<main>` style (needed for the row layout): `<main style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>`.
6. Wrap the TabBar: `{!landscape && <TabBar active={active} tabs={ARENA_TABS} onChange={(id) => navigate(ROUTE_BY_TAB[id] ?? '/')} />}`.
7. In the reg menu `<div role="menu" …>`, replace the two positioning lines (`top: …`, `right: …`) with a conditional spread. Change the style object to:

```tsx
          <div role="menu" aria-label="Regulation" style={{
            position: 'absolute',
            /* portrait: 2px below the 34px RegPill centered in the app bar;
               landscape: beside the rail's bottom corner where the pill lives */
            ...(landscape
              ? { left: 64, bottom: 10 }
              : { top: 'calc((var(--appbar-h) + 34px) / 2 + 2px)', right: 'var(--gutter)' }),
            zIndex: 40,
            /* …rest unchanged… */
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/templates/arena-shell-landscape.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/templates/ArenaShell.tsx src/components/templates/arena-shell-landscape.test.tsx
git commit -m "feat: ArenaShell landscape variant with left nav rail

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Migrate all `useIsMobile` call sites; `RotateToPortrait`; delete the old hook

**Files:**
- Create: `src/components/RotateToPortrait.tsx`
- Modify: `src/components/templates/Layout.tsx`
- Modify: `src/pages/DamageCalculator/index.tsx` (lines ~39, ~63 — interim gating only)
- Modify: `src/pages/Teams/index.tsx` (lines ~21, ~37)
- Modify: `src/pages/TeamDetail/index.tsx` (lines ~14, ~40)
- Modify: `src/pages/EvSpConverter/index.tsx` (lines ~5, ~9)
- Modify: `src/pages/SpeedTierList/index.tsx` (lines ~9, ~30)
- Delete: `src/hooks/useIsMobile.ts`, `src/hooks/useIsMobile.test.ts`

**Interfaces:**
- Consumes: `useViewportMode` (Task 1), `ArenaShell landscape` prop (Task 3), `Icon` name `'rotate-ccw'` (Task 2).
- Produces: `RotateToPortrait({ label: string })`. After this task the app has NO `useIsMobile` references, and a landscape phone shows the rail shell (calculator still portrait-styled until Task 9 — acceptable interim).

- [ ] **Step 1: Create RotateToPortrait**

Create `src/components/RotateToPortrait.tsx`:

```tsx
import React from 'react';
import { Icon } from '@/design-system/arena';

/** Landscape placeholder for tabs that only have a portrait layout. */
export function RotateToPortrait({ label }: { label: string }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 24,
      textAlign: 'center',
      fontFamily: 'var(--font-ui)',
    }}>
      <Icon name="rotate-ccw" size={26} color="var(--accent)" />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink-1)' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 260, lineHeight: 1.5 }}>
        Rotate to portrait to use this tab.
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Migrate Layout**

In `src/components/templates/Layout.tsx`:

```tsx
- import { useIsMobile } from '@/hooks/useIsMobile';
+ import { useViewportMode } from '@/hooks/useViewportMode';
```
```tsx
- const isMobile = useIsMobile();
+ const mode = useViewportMode();
```
```tsx
- if (isMobile) return <ArenaShell />;
+ if (mode !== 'desktop') return <ArenaShell landscape={mode === 'arena-landscape'} />;
```

- [ ] **Step 3: Migrate the four placeholder pages**

In each of `src/pages/Teams/index.tsx`, `src/pages/TeamDetail/index.tsx`, `src/pages/EvSpConverter/index.tsx`, `src/pages/SpeedTierList/index.tsx`:

1. Replace the import:
```tsx
- import { useIsMobile } from '@/hooks/useIsMobile';
+ import { useViewportMode } from '@/hooks/useViewportMode';
+ import { RotateToPortrait } from '@/components/RotateToPortrait';
```
2. Replace the hook call:
```tsx
- const isMobile = useIsMobile();
+ const mode = useViewportMode();
+ const isMobile = mode === 'arena';
```
3. Immediately BEFORE each page's existing mobile-branch return (the `if (isMobile) …` / `isMobile ? <ArenaX/>` site — after all hooks, so hook order is safe), add:
```tsx
if (mode === 'arena-landscape') return <RotateToPortrait label="Teams" />;
```
with labels: Teams → `"Teams"`, TeamDetail → `"Teams"`, EvSpConverter → `"EV / SP"`, SpeedTierList → `"Speed tiers"`.
(If a page renders `isMobile ? <A/> : <B/>` inline rather than an early return, put the landscape early-return right after the hooks block instead.)

- [ ] **Step 4: Migrate DamageCalculator (interim)**

In `src/pages/DamageCalculator/index.tsx`:

```tsx
- import { useIsMobile } from '@/hooks/useIsMobile';
+ import { useViewportMode } from '@/hooks/useViewportMode';
```
```tsx
- const isMobile = useIsMobile();
+ const mode = useViewportMode();
+ const isMobile = mode !== 'desktop'; // interim: landscape gets the portrait calc until the landscape tree lands
```

- [ ] **Step 5: Delete the superseded hook**

```bash
git rm src/hooks/useIsMobile.ts src/hooks/useIsMobile.test.ts
```

Then verify nothing references it: `grep -rn "useIsMobile" src/` → expected: no matches.

- [ ] **Step 6: Full check**

Run: `npm run type-check`
Expected: no errors.
Run: `npx vitest run`
Expected: all tests pass (the deleted useIsMobile tests are gone; useViewportMode tests cover the behavior).

- [ ] **Step 7: Commit**

```bash
git add src/components/RotateToPortrait.tsx src/components/templates/Layout.tsx src/pages/DamageCalculator/index.tsx src/pages/Teams/index.tsx src/pages/TeamDetail/index.tsx src/pages/EvSpConverter/index.tsx src/pages/SpeedTierList/index.tsx
git commit -m "feat: viewport-mode gating across shell and pages; landscape placeholders

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Speed math — `effectiveSpeed` + `buildSpeedCompare`

**Files:**
- Create: `src/features/damage-calculator/utils/speed.ts`
- Test: `src/features/damage-calculator/utils/speed.test.ts`

**Interfaces:**
- Consumes: `calculateStat`, `getStageMultiplier` from `./damage-calc`; `calculateSpeedStats` from `@/features/pokemon/utils/stats` (existing, currently unused).
- Produces (used verbatim by Task 8):

```ts
export function effectiveSpeed(speed: number, opts?: { scarf?: boolean; tailwind?: boolean }): number;
export interface SpeedTierRow { label: string; value: number; outcome: 'faster' | 'tie' | 'outsped' }
export interface SpeedCompare { yours: { actual: number; scarf: number; tailwind: number }; tiers: SpeedTierRow[] }
export function buildSpeedCompare(
  you: { baseSpe: number; spSpe: number; boostedStat: string | null; hinderedStat: string | null; speStage: number; item: string | null; isTailwind: boolean },
  opp: { baseSpe: number; speStage: number; isTailwind: boolean },
): SpeedCompare;
```

- [ ] **Step 1: Write the failing test**

Create `src/features/damage-calculator/utils/speed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { effectiveSpeed, buildSpeedCompare } from './speed';

describe('effectiveSpeed', () => {
  it('identity with no modifiers', () => expect(effectiveSpeed(205)).toBe(205));
  it('scarf = floor(x1.5)', () => expect(effectiveSpeed(205, { scarf: true })).toBe(307));
  it('tailwind = floor(x2)', () => expect(effectiveSpeed(205, { tailwind: true })).toBe(410));
  it('stacks with floors: scarf then tailwind', () =>
    expect(effectiveSpeed(205, { scarf: true, tailwind: true })).toBe(614));
});

describe('buildSpeedCompare', () => {
  // You: Flutter Mane, base 135 Spe, 32 SP, +Spe nature → floor((135+20+32)*1.1) = 205
  const you = { baseSpe: 135, spSpe: 32, boostedStat: 'spe', hinderedStat: 'atk', speStage: 0, item: null, isTailwind: false };
  // Opp: Dragapult, base 142 → tiers: Max+ 213, Max 194, Uninvested 162
  const opp = { baseSpe: 142, speStage: 0, isTailwind: false };

  it('computes your actual / scarf / tailwind speeds', () => {
    const c = buildSpeedCompare(you, opp);
    expect(c.yours).toEqual({ actual: 205, scarf: 307, tailwind: 410 });
  });

  it('actual honors a held Choice Scarf', () => {
    const c = buildSpeedCompare({ ...you, item: 'Choice Scarf' }, opp);
    expect(c.yours.actual).toBe(307);
  });

  it('builds five opponent tiers with outcomes vs your actual', () => {
    const c = buildSpeedCompare(you, opp);
    expect(c.tiers.map((t) => t.label)).toEqual(['Max+ scarf', 'Max scarf', 'Max+', 'Max', 'Uninvested']);
    expect(c.tiers.map((t) => t.value)).toEqual([319, 291, 213, 194, 162]);
    expect(c.tiers.map((t) => t.outcome)).toEqual(['outsped', 'outsped', 'outsped', 'faster', 'faster']);
  });

  it('ties are reported', () => {
    // Opp base 135 with same max+ math: 205 vs 205
    const c = buildSpeedCompare(you, { baseSpe: 135, speStage: 0, isTailwind: false });
    expect(c.tiers.find((t) => t.label === 'Max+')!.outcome).toBe('tie');
  });

  it('applies opponent rank stages and tailwind to tiers', () => {
    const c = buildSpeedCompare(you, { baseSpe: 142, speStage: 1, isTailwind: true });
    // Max+ 213 → +1 stage floor(213*1.5)=319 → tailwind 638
    expect(c.tiers.find((t) => t.label === 'Max+')!.value).toBe(638);
    expect(c.tiers.find((t) => t.label === 'Max+')!.outcome).toBe('outsped');
  });
});
```

Note: `calculateSpeedStats(142).uninvested` = floor(142+20) = 162.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/utils/speed.test.ts`
Expected: FAIL — `Cannot find module './speed'`

- [ ] **Step 3: Write the implementation**

Create `src/features/damage-calculator/utils/speed.ts`:

```ts
import { calculateStat, getStageMultiplier } from './damage-calc';
import { calculateSpeedStats } from '@/features/pokemon/utils/stats';

/**
 * Speed comparison math for the landscape calculator's Speed mode.
 * Ability speed multipliers (Swift Swim etc.) are out of scope — matches the
 * speed-tiers feature, which also ignores them.
 */

export function effectiveSpeed(speed: number, opts: { scarf?: boolean; tailwind?: boolean } = {}): number {
  let s = speed;
  if (opts.scarf) s = Math.floor(s * 1.5);
  if (opts.tailwind) s = Math.floor(s * 2);
  return s;
}

export interface SpeedTierRow { label: string; value: number; outcome: 'faster' | 'tie' | 'outsped' }
export interface SpeedCompare { yours: { actual: number; scarf: number; tailwind: number }; tiers: SpeedTierRow[] }

const speNatureMult = (boosted: string | null, hindered: string | null): number =>
  boosted === 'spe' ? 1.1 : hindered === 'spe' ? 0.9 : 1.0;

export function buildSpeedCompare(
  you: { baseSpe: number; spSpe: number; boostedStat: string | null; hinderedStat: string | null; speStage: number; item: string | null; isTailwind: boolean },
  opp: { baseSpe: number; speStage: number; isTailwind: boolean },
): SpeedCompare {
  const clean = calculateStat(you.baseSpe, you.spSpe, speNatureMult(you.boostedStat, you.hinderedStat), you.speStage);
  const scarfed = you.item === 'Choice Scarf';
  const actual = effectiveSpeed(clean, { scarf: scarfed, tailwind: you.isTailwind });
  const yours = {
    actual,
    scarf: effectiveSpeed(clean, { scarf: true, tailwind: you.isTailwind }),
    tailwind: effectiveSpeed(clean, { scarf: scarfed, tailwind: true }),
  };

  const t = calculateSpeedStats(opp.baseSpe);
  const withOppMods = (v: number, scarf: boolean) =>
    effectiveSpeed(Math.floor(v * getStageMultiplier(opp.speStage)), { scarf, tailwind: opp.isTailwind });

  const rows: [string, number][] = [
    ['Max+ scarf', withOppMods(t.maxPlus, true)],
    ['Max scarf', withOppMods(t.maxNeutral, true)],
    ['Max+', withOppMods(t.maxPlus, false)],
    ['Max', withOppMods(t.maxNeutral, false)],
    ['Uninvested', withOppMods(t.uninvested, false)],
  ];
  const tiers = rows.map(([label, value]) => ({
    label,
    value,
    outcome: actual > value ? ('faster' as const) : actual === value ? ('tie' as const) : ('outsped' as const),
  }));
  return { yours, tiers };
}
```

Note on modifier order in `withOppMods`: stage → scarf → tailwind, flooring each step (matches `effectiveSpeed`'s documented order). For the '+1 stage & tailwind' test: floor(213×1.5)=319, scarf=false so 319×2=638.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/utils/speed.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/utils/speed.ts src/features/damage-calculator/utils/speed.test.ts
git commit -m "feat: effectiveSpeed and buildSpeedCompare for landscape speed mode

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `useDamageScenarios` hook (+ shared `flattenDamage`)

**Files:**
- Modify: `src/features/damage-calculator/utils/damage-calc.ts` (export `flattenDamage`)
- Modify: `src/features/damage-calculator/hooks/useDamageCalc.ts` (use the shared `flattenDamage`)
- Create: `src/features/damage-calculator/hooks/useDamageScenarios.ts`
- Test: `src/features/damage-calculator/hooks/useDamageScenarios.test.ts`

**Interfaces:**
- Consumes: `mapToSmogonPokemon(stateSide, name, type1, type2?)`, `mapToSmogonMove(name, isCrit?, hits?, customBp?, ability?)`, `mapToSmogonField(...)`, `calculateSmogonDamage(a, d, m, f)`, `getMovePowerModifier(name, {faintedCount})` — all existing exports of `utils/damage-calc.ts`; `AEGISLASH_ID` from `@/features/pokemon/hooks/usePokemonEditor`.
- Produces (used verbatim by Task 8):

```ts
export interface ScenarioRange { minPercent: number; maxPercent: number }
export interface DamageScenarios { crit: ScenarioRange | null; maxBulk: ScenarioRange | null; noSp: ScenarioRange | null }
export function useDamageScenarios(state: CalcState, pokemonList: PokemonBaseStats[], dir: 'p1' | 'p2'): DamageScenarios;
```

Also produces `export const flattenDamage = (arr: any[]): number[]` from `utils/damage-calc.ts`.

- [ ] **Step 1: Extract `flattenDamage` (pure refactor)**

In `src/features/damage-calculator/utils/damage-calc.ts`, add near `calculateSmogonDamage`:

```ts
/** Flatten @smogon/calc damage output (multi-hit = array of arrays summed) to [min..max]. */
export const flattenDamage = (arr: any[]): number[] => {
  if (arr.length === 0) return [0];
  if (Array.isArray(arr[0])) {
    const min = arr.reduce((acc, sub) => acc + (typeof sub[0] === 'number' ? sub[0] : 0), 0);
    const max = arr.reduce((acc, sub) => acc + (typeof sub[sub.length - 1] === 'number' ? sub[sub.length - 1] : 0), 0);
    return [min, max];
  }
  return arr.filter((d) => typeof d === 'number');
};
```

In `src/features/damage-calculator/hooks/useDamageCalc.ts`: add `flattenDamage` to the existing import from `utils/damage-calc`, and delete the local `const flattenDamage = …` closure inside `computeResults` (lines ~58–66), so the shared export is used.

Run: `npx vitest run`
Expected: all existing tests still pass (behavior unchanged).

- [ ] **Step 2: Write the failing test**

Create `src/features/damage-calculator/hooks/useDamageScenarios.test.ts`:

```tsx
// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDamageScenarios } from './useDamageScenarios';
import type { CalcState, SideState } from './useCalculatorState';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

// If SideState has fields beyond these, copy their defaults from
// useCalculatorState.ts's initial side object — the type-checker will flag them.
const side = (over: Partial<SideState>): SideState => ({
  selectedId: null, type1: null, type2: null, isTypeOverridden: false,
  baseHp: 0, baseAtk: 0, baseDef: 0, baseSpa: 0, baseSpd: 0, baseSpe: 0,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  nature: 'Serious', boostedStat: null, hinderedStat: null,
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [null, null, null, null], activeMoveIndex: 0,
  movesForceCrit: [false, false, false, false], movesHits: [1, 1, 1, 1],
  abilities: [], activeAbility: null, item: null, hpPercent: 100,
  isReflect: false, isLightScreen: false, isAuroraVeil: false,
  isHelpingHand: false, isFriendGuard: false, isTailwind: false,
  faintedCount: 0, loadedFromScan: false,
  ...over,
} as SideState);

const moonblast = { nameEn: 'Moonblast', nameZh: null, typeId: 18 } as unknown as MoveData;

const flutterMane = side({
  selectedId: 987, baseHp: 55, baseAtk: 55, baseDef: 55, baseSpa: 135, baseSpd: 135, baseSpe: 135,
  spSpa: 32, boostedStat: 'spa', hinderedStat: 'atk', nature: 'Modest',
  moves: [moonblast, null, null, null], abilities: ['Protosynthesis'], activeAbility: 'Protosynthesis',
});
const dragapult = side({
  selectedId: 887, baseHp: 88, baseAtk: 120, baseDef: 75, baseSpa: 100, baseSpd: 75, baseSpe: 142,
});

const baseState: CalcState = {
  weather: 'None', terrain: 'None', isSpreadTarget: false,
  isFairyAura: false, isDarkAura: false, isAuraBreak: false, isGravity: false,
  p1: flutterMane, p2: dragapult,
} as CalcState;

const pokemonList = [
  { id: 987, nameEn: 'Flutter Mane', nameZh: null, type1: 'ghost', type2: 'fairy' },
  { id: 887, nameEn: 'Dragapult', nameZh: null, type1: 'dragon', type2: 'ghost' },
] as unknown as PokemonBaseStats[];

describe('useDamageScenarios', () => {
  it('returns nulls when no move is selected', () => {
    const s = { ...baseState, p1: side({ ...flutterMane, moves: [null, null, null, null] }) };
    const { result } = renderHook(() => useDamageScenarios(s, pokemonList, 'p1'));
    expect(result.current).toEqual({ crit: null, maxBulk: null, noSp: null });
  });

  it('crit deals more than the uninvested baseline; max bulk deals less', () => {
    const { result } = renderHook(() => useDamageScenarios(baseState, pokemonList, 'p1'));
    const { crit, maxBulk, noSp } = result.current;
    expect(crit && maxBulk && noSp).toBeTruthy();
    // defender has 0 SP, so noSp equals the current spread's damage
    expect(crit!.minPercent).toBeGreaterThan(noSp!.minPercent);
    expect(maxBulk!.maxPercent).toBeLessThan(noSp!.maxPercent);
    expect(noSp!.maxPercent).toBeGreaterThan(0);
  });

  it('noSp exceeds the current spread when the defender is invested', () => {
    const bulky = { ...baseState, p2: side({ ...dragapult, spHp: 32, spSpd: 32 }) };
    const { result: invested } = renderHook(() => useDamageScenarios(bulky, pokemonList, 'p1'));
    const { result: base } = renderHook(() => useDamageScenarios(baseState, pokemonList, 'p1'));
    expect(invested.current.noSp!.maxPercent).toBeGreaterThanOrEqual(base.current.maxBulk!.maxPercent);
    expect(invested.current.noSp!.maxPercent).toBeGreaterThan(invested.current.maxBulk!.maxPercent);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/hooks/useDamageScenarios.test.ts`
Expected: FAIL — `Cannot find module './useDamageScenarios'`

- [ ] **Step 4: Write the implementation**

Create `src/features/damage-calculator/hooks/useDamageScenarios.ts`:

```ts
import { useMemo } from 'react';
import type { CalcState, SideState } from './useCalculatorState';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import {
  calculateSmogonDamage, flattenDamage, getMovePowerModifier,
  mapToSmogonField, mapToSmogonMove, mapToSmogonPokemon,
} from '../utils/damage-calc';
import { AEGISLASH_ID } from '@/features/pokemon/hooks/usePokemonEditor';

export interface ScenarioRange { minPercent: number; maxPercent: number }
export interface DamageScenarios { crit: ScenarioRange | null; maxBulk: ScenarioRange | null; noSp: ScenarioRange | null }

const NULL_SCENARIOS: DamageScenarios = { crit: null, maxBulk: null, noSp: null };
const SP_ZERO = { spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0 };

/**
 * useDamageScenarios — three what-if calcs for the ACTIVE move only:
 * crit, defender at max bulk (32 HP / 32 defending stat, +nature), defender
 * uninvested. ~3 sub-ms @smogon/calc calls, memoized like useDamageCalc.
 * Only mounted by the landscape calculator, so other layouts pay nothing.
 */
export function useDamageScenarios(
  state: CalcState,
  pokemonList: PokemonBaseStats[],
  dir: 'p1' | 'p2',
): DamageScenarios {
  return useMemo(() => {
    const attacker = state[dir];
    const defender = state[dir === 'p1' ? 'p2' : 'p1'];
    const atkBase = pokemonList.find((p) => p.id === attacker.selectedId);
    const defBase = pokemonList.find((p) => p.id === defender.selectedId);
    const moveData = attacker.moves[attacker.activeMoveIndex];
    if (!atkBase || !defBase || !moveData) return NULL_SCENARIOS;

    const formName = (base: PokemonBaseStats, s: SideState) =>
      base.id === AEGISLASH_ID && s.form ? `${base.nameEn} (${s.form})` : base.nameEn;

    try {
      const field = mapToSmogonField(
        state.weather, state.isSpreadTarget, state.isFairyAura, state.isDarkAura,
        state.isAuraBreak, state.terrain, state.isGravity, attacker, defender,
      );
      const atkMon = mapToSmogonPokemon(attacker, formName(atkBase, attacker), atkBase.type1, atkBase.type2);
      const idx = attacker.activeMoveIndex;
      const customBp = getMovePowerModifier(moveData.nameEn, { faintedCount: attacker.faintedCount });
      const baseMove = mapToSmogonMove(moveData.nameEn, attacker.movesForceCrit[idx], attacker.movesHits[idx], customBp, attacker.activeAbility);
      const critMove = mapToSmogonMove(moveData.nameEn, true, attacker.movesHits[idx], customBp, attacker.activeAbility);

      const run = (defSide: SideState, move = baseMove): ScenarioRange | null => {
        const defMon = mapToSmogonPokemon(defSide, formName(defBase, defSide), defBase.type1, defBase.type2);
        const result = calculateSmogonDamage(atkMon, defMon, move, field);
        const damageArr = Array.isArray(result.damage) ? result.damage : [Number(result.damage) || 0];
        const clean = flattenDamage(damageArr as any[]);
        const min = clean.length ? clean[0] : 0;
        const max = clean.length ? clean[clean.length - 1] : 0;
        const maxHP = defMon.maxHP();
        return {
          minPercent: Math.floor((min * 1000) / maxHP) / 10 || 0,
          maxPercent: Math.floor((max * 1000) / maxHP) / 10 || 0,
        };
      };

      const isPhysical = critMove.category === 'Physical';
      const maxBulkSide = {
        ...defender,
        spHp: 32,
        ...(isPhysical ? { spDef: 32 } : { spSpd: 32 }),
        boostedStat: isPhysical ? 'def' : 'spd',
        hinderedStat: 'atk',
      } as SideState;
      const noSpSide = { ...defender, ...SP_ZERO, boostedStat: null, hinderedStat: null } as SideState;

      return {
        crit: run(defender, critMove),
        maxBulk: run(maxBulkSide),
        noSp: run(noSpSide),
      };
    } catch {
      return NULL_SCENARIOS;
    }
  }, [state, pokemonList, dir]);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/hooks/useDamageScenarios.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Run the full suite (flattenDamage refactor regression)**

Run: `npx vitest run && npm run type-check`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/damage-calculator/utils/damage-calc.ts src/features/damage-calculator/hooks/useDamageCalc.ts src/features/damage-calculator/hooks/useDamageScenarios.ts src/features/damage-calculator/hooks/useDamageScenarios.test.ts
git commit -m "feat: useDamageScenarios hook; share flattenDamage helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Extract `ArenaPickerSheet`; `autoFocus` props on search pickers

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaPickerSheet.tsx`
- Modify: `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx` (replace inline Sheet block, lines ~118–147, and remove now-unused imports)
- Modify: `src/features/damage-calculator/components/mobile/ArenaPokemonPicker.tsx` (autoFocus prop)
- Modify: `src/features/damage-calculator/components/mobile/ArenaItemPicker.tsx` (autoFocus prop)

**Interfaces:**
- Consumes: `Sheet`, `ArenaPokemonPicker`, `ArenaItemPicker`, `NATURES`, calculator types.
- Produces (used verbatim by Task 8):

```tsx
export type CorePickerField = 'species' | 'ability' | 'item' | 'nature';
export function ArenaPickerSheet(props: {
  picker: { side: 'p1' | 'p2'; field: CorePickerField } | null;
  onClose: () => void;
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  pokemonList: PokemonBaseStats[];
  actions: ReturnType<typeof useCalculatorActions>;
  autoFocus?: boolean; // default true; landscape passes false
}): JSX.Element;
```

- [ ] **Step 1: Add `autoFocus` to the two search pickers**

In `src/features/damage-calculator/components/mobile/ArenaPokemonPicker.tsx`: extend props to `{ pokemonList, onSelect, autoFocus = true }: { pokemonList: PokemonBaseStats[]; onSelect: (p: PokemonBaseStats) => void; autoFocus?: boolean }` and change the input's `autoFocus` attribute (line ~35) to `autoFocus={autoFocus}`.

In `src/features/damage-calculator/components/mobile/ArenaItemPicker.tsx`: same change — add `autoFocus?: boolean` (default `true`) to props and use `autoFocus={autoFocus}` on the input (line ~44).

- [ ] **Step 2: Create ArenaPickerSheet**

Create `src/features/damage-calculator/components/mobile/ArenaPickerSheet.tsx` — this is the Sheet block currently inlined in `ArenaCalculator.tsx` (lines ~118–147), lifted verbatim plus the `autoFocus` pass-through:

```tsx
import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { NATURES } from '@/features/pokemon/utils/pokemon-natures';
import { Sheet } from '@/design-system/arena';
import { ArenaPokemonPicker } from './ArenaPokemonPicker';
import { ArenaItemPicker } from './ArenaItemPicker';

export type CorePickerField = 'species' | 'ability' | 'item' | 'nature';
type Side = 'p1' | 'p2';

const listRow = (activeSel: boolean): React.CSSProperties => ({
  display: 'block', width: '100%', textAlign: 'left', minHeight: 44, padding: '10px 12px',
  borderRadius: 'var(--r-sm)', border: `1px solid ${activeSel ? 'var(--accent-soft-line)' : 'var(--line-2)'}`,
  background: activeSel ? 'var(--accent-soft)' : 'var(--surface-inset)',
  color: activeSel ? 'var(--accent-hover)' : 'var(--ink-1)', fontFamily: 'var(--font-ui)',
  fontSize: 'var(--fs-body)', fontWeight: 600, cursor: 'pointer', marginBottom: 8,
});

const TITLES: Record<CorePickerField, string> = {
  species: 'Pokémon', ability: 'Ability', item: 'Item', nature: 'Nature',
};

/** The species / ability / item / nature picker sheet shared by the portrait and landscape calculators. */
export function ArenaPickerSheet({ picker, onClose, state, dispatch, pokemonList, actions, autoFocus = true }: {
  picker: { side: Side; field: CorePickerField } | null;
  onClose: () => void;
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  pokemonList: PokemonBaseStats[];
  actions: ReturnType<typeof useCalculatorActions>;
  autoFocus?: boolean;
}) {
  return (
    <Sheet
      open={!!picker}
      onClose={onClose}
      title={picker ? TITLES[picker.field] : ''}
      height={picker?.field === 'species' || picker?.field === 'item' ? '80vh' : undefined}
    >
      {picker && picker.field === 'species' && (
        <ArenaPokemonPicker
          pokemonList={pokemonList}
          autoFocus={autoFocus}
          onSelect={(p) => { void actions.handleSelectPokemon(picker.side, p); onClose(); }}
        />
      )}
      {picker && picker.field === 'item' && (
        <ArenaItemPicker
          selectedItem={state[picker.side].item}
          autoFocus={autoFocus}
          onSelect={(it) => { dispatch({ type: 'SET_ITEM', payload: { side: picker.side, item: it } }); onClose(); }}
        />
      )}
      {picker && picker.field === 'ability' && (
        <div>
          {state[picker.side].abilities.length === 0 && <div style={{ color: 'var(--ink-3)' }}>No abilities available.</div>}
          {state[picker.side].abilities.map((a) => (
            <button key={a} style={listRow(a === state[picker.side].activeAbility)} onClick={() => { dispatch({ type: 'SET_ACTIVE_ABILITY', payload: { side: picker.side, ability: a } }); onClose(); }}>{a}</button>
          ))}
        </div>
      )}
      {picker && picker.field === 'nature' && (
        <div>
          {NATURES.map((n) => (
            <button key={n} style={listRow(n === state[picker.side].nature)} onClick={() => { dispatch({ type: 'SET_NATURE', payload: { side: picker.side, nature: n } }); onClose(); }}>{n}</button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
```

- [ ] **Step 3: Use it in ArenaCalculator**

In `src/features/damage-calculator/components/mobile/ArenaCalculator.tsx`:

1. Add import: `import { ArenaPickerSheet, CorePickerField } from './ArenaPickerSheet';`
2. Narrow the picker state: `const [picker, setPicker] = useState<{ side: Side; field: CorePickerField } | null>(null);` and change `openPicker` to:
```tsx
  const openPicker = (side: Side) => (field: PickerField) => {
    if (field === 'move') setMovePickerSide(side);
    else setPicker({ side, field });
  };
```
3. Replace the whole inline `<Sheet …>…</Sheet>` block (the "Species / item / ability / nature picker" section) with:
```tsx
      <ArenaPickerSheet
        picker={picker}
        onClose={() => setPicker(null)}
        state={state}
        dispatch={dispatch}
        pokemonList={pokemonList}
        actions={actions}
      />
```
4. Remove the now-unused pieces from ArenaCalculator: the `listRow` helper, the `pickerTitle` function, and the imports `ArenaPokemonPicker`, `ArenaItemPicker`, `NATURES`, `Sheet` (keep everything else).

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run type-check`
Expected: all pass (pure refactor; no behavior change).

- [ ] **Step 5: Commit**

```bash
git add src/features/damage-calculator/components/mobile/ArenaPickerSheet.tsx src/features/damage-calculator/components/mobile/ArenaCalculator.tsx src/features/damage-calculator/components/mobile/ArenaPokemonPicker.tsx src/features/damage-calculator/components/mobile/ArenaItemPicker.tsx
git commit -m "refactor: extract shared ArenaPickerSheet; autoFocus prop on search pickers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: `ArenaCalculatorLandscape`

**Files:**
- Create: `src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`
- Test: `src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`

**Interfaces:**
- Consumes: identical prop list to `ArenaCalculator` (see code); `useDamageScenarios` (Task 6); `buildSpeedCompare` (Task 5); `ArenaPickerSheet` + `CorePickerField` (Task 7); `ArenaFieldConditions`, `ArenaMovePickerSheet`, `ArenaAdvancedSheet`, `ShowdownImportModal` (existing); DS: `Sprite`, `TypeBadge`, `SelectRow`, `ItemIcon`, `KOVerdict`, `koVerdictFromText`, `Icon`, `Badge`, `StatChip`; `TYPE_IDS` from `@/features/pokemon/utils/pokemon-types`; reducer actions `SET_ACTIVE_MOVE_SLOT` and `SET_STAT_STAGE`.
- Produces: `export function ArenaCalculatorLandscape(props): JSX.Element` — Task 9 renders it from the page with the exact same props as `ArenaCalculator`.

- [ ] **Step 1: Write the failing test**

Create `src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArenaCalculatorLandscape } from './ArenaCalculatorLandscape';
import type { CalcState, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';

vi.mock('@/components/organisms/ShowdownImportModal', () => ({ default: () => null }));

// Same fixture pattern as useDamageScenarios.test.ts — if SideState has extra
// fields, copy defaults from useCalculatorState.ts's initial side object.
const side = (over: Partial<SideState>): SideState => ({
  selectedId: null, type1: null, type2: null, isTypeOverridden: false,
  baseHp: 0, baseAtk: 0, baseDef: 0, baseSpa: 0, baseSpd: 0, baseSpe: 0,
  spHp: 0, spAtk: 0, spDef: 0, spSpa: 0, spSpd: 0, spSpe: 0,
  nature: 'Serious', boostedStat: null, hinderedStat: null,
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [null, null, null, null], activeMoveIndex: 0,
  movesForceCrit: [false, false, false, false], movesHits: [1, 1, 1, 1],
  abilities: [], activeAbility: null, item: null, hpPercent: 100,
  isReflect: false, isLightScreen: false, isAuroraVeil: false,
  isHelpingHand: false, isFriendGuard: false, isTailwind: false,
  faintedCount: 0, loadedFromScan: false,
  ...over,
} as SideState);

const mv = (nameEn: string, typeId = 18) => ({ nameEn, nameZh: null, typeId } as unknown as MoveData);

const state: CalcState = {
  weather: 'None', terrain: 'None', isSpreadTarget: false,
  isFairyAura: false, isDarkAura: false, isAuraBreak: false, isGravity: false,
  p1: side({
    selectedId: 987, type1: 'ghost', type2: 'fairy',
    baseHp: 55, baseAtk: 55, baseDef: 55, baseSpa: 135, baseSpd: 135, baseSpe: 135,
    spSpa: 32, spSpe: 32, boostedStat: 'spe', hinderedStat: 'atk', nature: 'Timid',
    moves: [mv('Moonblast'), mv('Shadow Ball', 8), null, null],
    abilities: ['Protosynthesis'], activeAbility: 'Protosynthesis',
  }),
  p2: side({
    selectedId: 887, type1: 'dragon', type2: 'ghost',
    baseHp: 88, baseAtk: 120, baseDef: 75, baseSpa: 100, baseSpd: 75, baseSpe: 142,
    abilities: ['Infiltrator'], activeAbility: 'Infiltrator',
  }),
} as CalcState;

const pokemonList = [
  { id: 987, nameEn: 'Flutter Mane', nameZh: null, type1: 'ghost', type2: 'fairy' },
  { id: 887, nameEn: 'Dragapult', nameZh: null, type1: 'dragon', type2: 'ghost' },
] as unknown as PokemonBaseStats[];

const res = (moveName: string, minPercent: number, maxPercent: number): DamageResult => ({
  minDamage: 100, maxDamage: 120, minPercent, maxPercent, moveName, moveNameZh: null,
  moveType: 18, originalType: 18, isStab: false, effectiveness: 2, koChanceText: 'guaranteed 2HKO',
} as DamageResult);

const p1Results = [res('Moonblast', 78, 92.1), res('Shadow Ball', 64.2, 75.6), null, null];

function setup() {
  const dispatch = vi.fn();
  render(
    <ArenaCalculatorLandscape
      state={state}
      dispatch={dispatch}
      pokemonList={pokemonList}
      moveList={[]}
      p1Results={p1Results}
      p2Results={[null, null, null, null]}
      p1MaxHp={162}
      p2MaxHp={195}
      actions={{ handleSelectPokemon: vi.fn(), handleSelectPreset: vi.fn(), handleImportShowdown: vi.fn(), handleLoadConfig: vi.fn() } as any}
      onApplySpread={vi.fn()}
      onResetBuild={vi.fn()}
      onOpenScan={vi.fn()}
    />,
  );
  return dispatch;
}

describe('ArenaCalculatorLandscape', () => {
  it('renders both side panels and per-move damage ranges', () => {
    setup();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Opponent')).toBeTruthy();
    expect(screen.getByText('Flutter Mane')).toBeTruthy();
    expect(screen.getByText('Dragapult')).toBeTruthy();
    // move rows carry their own % ranges; the active move's range also shows in the readout
    expect(screen.getAllByText('78–92.1%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('64.2–75.6%')).toBeTruthy();
  });

  it('tapping a move row activates that slot', () => {
    const dispatch = setup();
    fireEvent.click(screen.getByText('Shadow Ball'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index: 1 } });
  });

  it('renders scenario rows in damage mode', () => {
    setup();
    expect(screen.getByText('Crit')).toBeTruthy();
    expect(screen.getByText('Opp. max bulk')).toBeTruthy();
    expect(screen.getByText('Opp. no SP')).toBeTruthy();
  });

  it('speed mode shows the comparison with outcomes', () => {
    setup();
    fireEvent.click(screen.getByText('Speed'));
    // Flutter Mane 205 vs Dragapult tiers: Max+ 213 outsped, Max 194 faster
    expect(screen.getByText('205')).toBeTruthy();
    expect(screen.getAllByText('Outsped').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Faster').length).toBeGreaterThanOrEqual(1);
  });

  it('speed rank stepper dispatches SET_STAT_STAGE', () => {
    const dispatch = setup();
    fireEvent.click(screen.getByText('Speed'));
    fireEvent.click(screen.getAllByLabelText('Raise speed rank')[0]);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_STAT_STAGE', payload: { side: 'p1', stat: 'spe', val: 1 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: FAIL — `Cannot find module './ArenaCalculatorLandscape'`

- [ ] **Step 3: Write the component**

Create `src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx`:

```tsx
import React, { useState } from 'react';
import type { CalcState, CalcAction, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { useDamageScenarios, ScenarioRange } from '@/features/damage-calculator/hooks/useDamageScenarios';
import { buildSpeedCompare } from '@/features/damage-calculator/utils/speed';
import { TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { Sprite, TypeBadge, SelectRow, ItemIcon, KOVerdict, koVerdictFromText, Icon, Badge, StatChip } from '@/design-system/arena';
import { ArenaPickerSheet, CorePickerField } from './ArenaPickerSheet';
import { ArenaFieldConditions } from './ArenaFieldConditions';
import { ArenaMovePickerSheet } from './ArenaMovePickerSheet';
import { ArenaAdvancedSheet } from './ArenaAdvancedSheet';
import ShowdownImportModal from '@/components/organisms/ShowdownImportModal';

type Side = 'p1' | 'p2';
type Actions = ReturnType<typeof useCalculatorActions>;

const PANEL_W = 240;
const TYPE_BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(TYPE_IDS).map(([name, id]) => [id as number, name]),
);

/* ---------- small presentational helpers ---------- */

function Micro({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)', ...style }}>
      {children}
    </div>
  );
}

function TuneBox({ label, value, active, onClick }: { label: string; value: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 'var(--r-sm)', textAlign: 'left', cursor: 'pointer',
        background: active ? 'var(--accent-soft)' : 'var(--surface-inset)',
        border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
      }}
    >
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--ink-1)', marginTop: 1 }}>{value}</div>
    </button>
  );
}

function Panel({ side, badge, children }: { side: 'left' | 'right'; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      width: PANEL_W, flex: '0 0 auto', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
      background: 'var(--surface-sticky)',
      borderRight: side === 'left' ? '1px solid var(--line-1)' : 'none',
      borderLeft: side === 'right' ? '1px solid var(--line-1)' : 'none',
      padding: '10px 12px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <Micro style={{ letterSpacing: '0.07em' }}>{side === 'left' ? 'Attacker' : 'Defender'}</Micro>
        <span style={{ flex: 1 }} />
        {badge}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Identity({ s, name, tone, onClick }: { s: SideState; name: string; tone: 'accent' | 'danger'; onClick: () => void }) {
  const types = [s.type1, s.type2].filter(Boolean) as string[];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Sprite dex={s.selectedId} name={name} size={44} ring tone={tone} />
      <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name || 'Select Pokémon'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>{types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
      </button>
    </div>
  );
}

function MoveList({ s, results, onSelect, onEdit }: {
  s: SideState; results: (DamageResult | null)[]; onSelect: (index: number) => void; onEdit: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <Micro>Moves</Micro>
        <span style={{ flex: 1 }} />
        <button onClick={onEdit} aria-label="Edit moves" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'var(--ink-3)' }}>
          <Icon name="pencil" size={14} color="var(--ink-3)" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {s.moves.map((m, i) => {
          if (!m) {
            return (
              <button key={i} onClick={onEdit} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '7px 8px',
                borderRadius: 'var(--r-sm)', cursor: 'pointer', background: 'transparent',
                border: '1px dashed var(--line-2)', color: 'var(--ink-4)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 600,
              }}>
                Add move
              </button>
            );
          }
          const on = i === s.activeMoveIndex;
          const r = results[i];
          const typeName = TYPE_BY_ID[r?.moveType ?? (m as MoveData).typeId];
          return (
            <button key={i} onClick={() => onSelect(i)} style={{
              display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '7px 8px',
              borderRadius: 'var(--r-sm)', cursor: 'pointer',
              background: on ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
            }}>
              {typeName && <TypeBadge type={typeName} size="sm" />}
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: on ? 'var(--ink-1)' : 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(m as MoveData).nameEn}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)' }}>
                {r ? `${r.minPercent}–${r.maxPercent}%` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioRow({ label, range }: { label: string; range: ScenarioRange | null }) {
  if (!range) return null;
  const danger = range.maxPercent >= 100;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>
          {range.minPercent}–{range.maxPercent}%
        </span>
      </div>
      <div style={{ marginTop: 4, height: 5, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, range.maxPercent)}%`, height: '100%', background: danger ? 'var(--danger)' : 'var(--safe)', opacity: 0.85 }} />
      </div>
    </div>
  );
}

function RankStepper({ label, value, onChange, ariaPrefix }: { label: string; value: number; onChange: (val: number) => void; ariaPrefix: string }) {
  const btn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)',
    border: '1px solid var(--line-2)', color: 'var(--ink-2)',
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <Micro>{label}</Micro>
      <span style={{ flex: 1 }} />
      <button aria-label={`Lower ${ariaPrefix} rank`} style={btn} onClick={() => onChange(Math.max(-6, value - 1))}>−</button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', width: 22, textAlign: 'center' }}>
        {value > 0 ? `+${value}` : value}
      </span>
      <button aria-label={`Raise ${ariaPrefix} rank`} style={btn} onClick={() => onChange(Math.min(6, value + 1))}>+</button>
    </div>
  );
}

/* ---------- the screen ---------- */

export function ArenaCalculatorLandscape({
  state, dispatch, pokemonList, moveList, p1Results, p2Results, actions, onApplySpread, onResetBuild, onOpenScan, defenderExtra, attackerExtra,
}: {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  p1Results: (DamageResult | null)[];
  p2Results: (DamageResult | null)[];
  p1MaxHp: number;
  p2MaxHp: number;
  actions: Actions;
  onApplySpread: (side: Side, spread: Spread) => void;
  onResetBuild: (side: Side) => void;
  onOpenScan: () => void;
  defenderExtra?: React.ReactNode;
  attackerExtra?: React.ReactNode;
}) {
  const [dir, setDir] = useState<Side>('p1');
  const [view, setView] = useState<'damage' | 'speed'>('damage');
  const [picker, setPicker] = useState<{ side: Side; field: CorePickerField } | null>(null);
  const [movePickerSide, setMovePickerSide] = useState<Side | null>(null);
  const [advancedSide, setAdvancedSide] = useState<Side | null>(null);
  const [showdownSide, setShowdownSide] = useState<Side | null>(null);

  const defDir: Side = dir === 'p1' ? 'p2' : 'p1';
  const nameOf = (id: number | null) => pokemonList.find((p) => p.id === id)?.nameEn ?? '—';
  const scenarios = useDamageScenarios(state, pokemonList, dir);
  const results = dir === 'p1' ? p1Results : p2Results;
  const atk = state[dir];
  const r = results[atk.activeMoveIndex] ?? null;
  const ko = koVerdictFromText(r?.koChanceText);
  const pct = r ? `${isNaN(r.minPercent) ? '0.0' : r.minPercent}–${isNaN(r.maxPercent) ? '0.0' : r.maxPercent}%` : '—';
  const dmg = r ? `${r.minDamage}–${r.maxDamage} dmg` : 'Pick a move';

  const speed = buildSpeedCompare(
    {
      baseSpe: state[dir].baseSpe, spSpe: state[dir].spSpe,
      boostedStat: state[dir].boostedStat, hinderedStat: state[dir].hinderedStat,
      speStage: state[dir].stages.spe || 0, item: state[dir].item, isTailwind: state[dir].isTailwind,
    },
    { baseSpe: state[defDir].baseSpe, speStage: state[defDir].stages.spe || 0, isTailwind: state[defDir].isTailwind },
  );

  const natureShort = (s: SideState) =>
    s.boostedStat ? `+${s.boostedStat.charAt(0).toUpperCase()}${s.boostedStat.slice(1)}` : '—';

  return (
    <div style={{ display: 'flex', height: '100%', minWidth: 0, fontFamily: 'var(--font-ui)', color: 'var(--text-body)' }}>
      {/* -------- attacker (p1) -------- */}
      <Panel side="left" badge={<Badge tone="accent">You</Badge>}>
        {attackerExtra}
        <Identity s={state.p1} name={nameOf(state.p1.selectedId)} tone="accent" onClick={() => setPicker({ side: 'p1', field: 'species' })} />
        <MoveList
          s={state.p1}
          results={p1Results}
          onSelect={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index } })}
          onEdit={() => setMovePickerSide('p1')}
        />
        <SelectRow label="Ability" value={state.p1.activeAbility ?? 'None'} onClick={() => setPicker({ side: 'p1', field: 'ability' })} />
        <SelectRow label="Item" value={state.p1.item ?? 'None'} leading={<ItemIcon item={state.p1.item} size={18} />} onClick={() => setPicker({ side: 'p1', field: 'item' })} />
        <div style={{ display: 'flex', gap: 6 }}>
          <TuneBox label="Nature" value={natureShort(state.p1)} onClick={() => setPicker({ side: 'p1', field: 'nature' })} />
          <TuneBox label="Atk SP" value={state.p1.spAtk} active={state.p1.spAtk > 0} onClick={() => setAdvancedSide('p1')} />
          <TuneBox label="SpA SP" value={state.p1.spSpa} active={state.p1.spSpa > 0} onClick={() => setAdvancedSide('p1')} />
        </div>
      </Panel>

      {/* -------- center: result column -------- */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', gap: 3, padding: 3, background: 'var(--surface-inset)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line-1)' }}>
            {(['damage', 'speed'] as const).map((v) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 'var(--r-pill)', cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${on ? 'var(--accent-soft-line)' : 'transparent'}`,
                  fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700,
                  color: on ? 'var(--accent)' : 'var(--ink-3)',
                  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}>
                  {v === 'damage' ? 'Damage' : 'Speed'}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setDir((d) => (d === 'p1' ? 'p2' : 'p1'))}
            aria-label="Swap direction"
            style={{ width: 32, height: 32, flex: '0 0 auto', borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', cursor: 'pointer' }}
          >
            <Icon name="arrow-left-right" size={15} color="var(--ink-2)" />
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>
          {r?.moveName ?? 'No move'} · <span style={{ color: 'var(--ink-1)' }}>{nameOf(state[dir].selectedId)}</span> vs{' '}
          <span style={{ color: 'var(--ink-1)' }}>{nameOf(state[defDir].selectedId)}</span>
        </div>

        {view === 'damage' ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-readout)', lineHeight: 1 }}>{pct}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>{dmg}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <KOVerdict verdict={ko.verdict} confidence={ko.confidence} tone={ko.tone} />
            </div>
            {r && (
              <div style={{ height: 7, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${Math.min(100, r.minPercent)}%`, background: 'var(--danger)' }} />
                <div style={{ width: `${Math.min(100, r.maxPercent) - Math.min(100, r.minPercent)}%`, background: 'var(--danger-soft)', borderLeft: '1px solid var(--danger-line)' }} />
              </div>
            )}
            {(scenarios.crit || scenarios.maxBulk || scenarios.noSp) && (
              <div>
                <Micro style={{ marginBottom: 8 }}>Scenarios</Micro>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <ScenarioRow label="Crit" range={scenarios.crit} />
                  <ScenarioRow label="Opp. max bulk" range={scenarios.maxBulk} />
                  <ScenarioRow label="Opp. no SP" range={scenarios.noSp} />
                </div>
              </div>
            )}
            <ArenaFieldConditions state={state} dispatch={dispatch} />
            <button
              onClick={() => setAdvancedSide(dir)}
              style={{ minHeight: 40, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', color: 'var(--text-body)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer' }}
            >
              Advanced
            </button>
          </>
        ) : (
          <>
            <div>
              <Micro style={{ marginBottom: 6 }}>{`You — ${nameOf(state[dir].selectedId)}`}</Micro>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1 }}>{speed.yours.actual}</div>
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  <StatChip label="Scarf" value={speed.yours.scarf} tone="accent" />
                  <StatChip label="Tailwind" value={speed.yours.tailwind} />
                </div>
              </div>
              <RankStepper
                label="Spe rank"
                ariaPrefix="speed"
                value={state[dir].stages.spe || 0}
                onChange={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: dir, stat: 'spe', val } })}
              />
            </div>
            <div>
              <Micro style={{ marginBottom: 4 }}>{`Opponent — ${nameOf(state[defDir].selectedId)}`}</Micro>
              {speed.tiers.map((t) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line-1)' }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{t.label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{t.value}</span>
                  <Badge tone={t.outcome === 'faster' ? 'safe' : t.outcome === 'tie' ? 'field' : 'danger'}>
                    {t.outcome === 'faster' ? 'Faster' : t.outcome === 'tie' ? 'Tie' : 'Outsped'}
                  </Badge>
                </div>
              ))}
              <RankStepper
                label="Opp. spe rank"
                ariaPrefix="opponent speed"
                value={state[defDir].stages.spe || 0}
                onChange={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: defDir, stat: 'spe', val } })}
              />
            </div>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
              Stat = floor((base + 20 + SP) × nature)
            </code>
          </>
        )}
      </div>

      {/* -------- defender (p2) -------- */}
      <Panel side="right" badge={<Badge tone="danger">Opponent</Badge>}>
        {defenderExtra}
        <Identity s={state.p2} name={nameOf(state.p2.selectedId)} tone="danger" onClick={() => setPicker({ side: 'p2', field: 'species' })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Micro>HP</Micro>
          <div style={{ flex: 1, height: 7, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${state.p2.hpPercent}%`, height: '100%', background: 'var(--safe)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>{state.p2.hpPercent}%</span>
        </div>
        <SelectRow label="Move" value={state.p2.moves[state.p2.activeMoveIndex]?.nameEn ?? 'None'} onClick={() => setMovePickerSide('p2')} />
        <SelectRow label="Ability" value={state.p2.activeAbility ?? 'None'} onClick={() => setPicker({ side: 'p2', field: 'ability' })} />
        <SelectRow label="Item" value={state.p2.item ?? 'None'} leading={<ItemIcon item={state.p2.item} size={18} />} onClick={() => setPicker({ side: 'p2', field: 'item' })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <TuneBox label="Nature" value={natureShort(state.p2)} onClick={() => setPicker({ side: 'p2', field: 'nature' })} />
          <TuneBox label="HP SP" value={state.p2.spHp} active={state.p2.spHp > 0} onClick={() => setAdvancedSide('p2')} />
          <TuneBox label="Def SP" value={state.p2.spDef} active={state.p2.spDef > 0} onClick={() => setAdvancedSide('p2')} />
          <TuneBox label="SpD SP" value={state.p2.spSpd} active={state.p2.spSpd > 0} onClick={() => setAdvancedSide('p2')} />
        </div>
        <button
          onClick={onOpenScan}
          style={{ minHeight: 40, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', color: 'var(--accent-hover)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer' }}
        >
          Scan opponent
        </button>
      </Panel>

      {/* -------- sheets (same wiring as portrait) -------- */}
      <ArenaAdvancedSheet
        open={!!advancedSide}
        side={advancedSide ?? 'p1'}
        onClose={() => setAdvancedSide(null)}
        state={state}
        dispatch={dispatch}
        onApplySpread={onApplySpread}
        onResetBuild={onResetBuild}
        onImportShowdown={() => { const s = advancedSide; setAdvancedSide(null); setShowdownSide(s); }}
      />
      <ArenaMovePickerSheet
        open={!!movePickerSide}
        side={movePickerSide ?? 'p1'}
        onClose={() => setMovePickerSide(null)}
        state={state}
        dispatch={dispatch}
        moveList={moveList}
        results={movePickerSide === 'p2' ? p2Results : p1Results}
      />
      <ArenaPickerSheet
        picker={picker}
        onClose={() => setPicker(null)}
        state={state}
        dispatch={dispatch}
        pokemonList={pokemonList}
        actions={actions}
        autoFocus={false}
      />
      <ShowdownImportModal
        isOpen={!!showdownSide}
        onClose={() => setShowdownSide(null)}
        onImport={(set) => { if (showdownSide) actions.handleImportShowdown(showdownSide, set); setShowdownSide(null); }}
      />
    </div>
  );
}
```

Implementation notes:
- `ItemIcon` takes `item={...}` (name string), matching `ArenaMonCard.tsx:63` — not a slug.
- If `MoveData`'s move-type field is named differently than `typeId`, follow whatever `useDamageCalc.ts:78` reads (`moveData.typeId`).
- If `SelectRow`'s props differ from `{ label, value, leading?, onClick }`, mirror `ArenaMonCard.tsx:61-64` exactly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Full check and commit**

Run: `npx vitest run && npm run type-check`
Expected: all pass.

```bash
git add src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx src/features/damage-calculator/components/mobile/arena-calculator-landscape.test.tsx
git commit -m "feat: ArenaCalculatorLandscape three-panel battle HUD

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Page wiring + full verification

**Files:**
- Modify: `src/pages/DamageCalculator/index.tsx` (the mobile branch, lines ~298–332)

**Interfaces:**
- Consumes: `ArenaCalculatorLandscape` (Task 8), `useViewportMode` (already wired in Task 4).
- Produces: the finished feature.

- [ ] **Step 1: Wire the landscape branch**

In `src/pages/DamageCalculator/index.tsx`:

1. Add import next to the ArenaCalculator import:
```tsx
import { ArenaCalculatorLandscape } from '@/features/damage-calculator/components/mobile/ArenaCalculatorLandscape';
```
2. Replace the interim gating from Task 4:
```tsx
- const mode = useViewportMode();
- const isMobile = mode !== 'desktop'; // interim: landscape gets the portrait calc until the landscape tree lands
+ const mode = useViewportMode();
+ const isMobile = mode !== 'desktop';
```
3. In the `if (isMobile)` return block, select the tree by mode — replace `<ArenaCalculator` with:
```tsx
        <MobileCalc
```
after adding, directly above the `if (isMobile)` line:
```tsx
  const MobileCalc = mode === 'arena-landscape' ? ArenaCalculatorLandscape : ArenaCalculator;
```
(All props, and the `ScanTeamModal` / `ToastNotification` siblings, stay exactly as they are — the two components take identical props.)

- [ ] **Step 2: Full automated verification**

Run: `npm run type-check`
Expected: no errors.
Run: `npx vitest run`
Expected: entire suite passes.

- [ ] **Step 3: Manual preview verification**

Start the dev server (preview tooling if available, else `npm run dev`) and check:

1. Viewport 800×360: calculator shows the three-panel HUD with the left nav rail; no app bar; three panels scroll independently.
2. Tap move rows → active move & center readout change; per-move % visible on each filled row.
3. Toggle Speed → your speed + scarf/tailwind chips, five opponent tiers with Faster/Tie/Outsped badges; rank steppers update values live.
4. Swap button flips direction (center matchup line swaps names).
5. Rail tabs: Teams / EV-SP / Speed tiers show "Rotate to portrait to use this tab."; theme toggle and compact reg pill work (reg menu opens anchored by the rail).
6. Viewport 1133×744 (iPad mini landscape): same HUD, comfortable spacing.
7. Regression — 375×812: portrait Arena calculator unchanged (app bar + bottom tab bar). 1280×800: desktop layout unchanged.
8. Light theme via the rail's theme toggle: landscape HUD renders correctly.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DamageCalculator/index.tsx
git commit -m "feat: render landscape battle HUD from the calculator page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review notes (already applied)

- Spec coverage: gating §1 → Tasks 1+4; shell §2 → Tasks 2+3; tree §3 → Task 8; capabilities §4 → Tasks 5+6+8; interactions §5 → Tasks 7+8; edges §6 → nullable handling in Task 8 code + scenarios try/catch; testing §7 → each task's tests + Task 9 manual checklist.
- The spec's "Record result" stays out (out-of-scope list); the center column's bottom action is Advanced, per spec §3.
- Type consistency: `SET_ACTIVE_MOVE_SLOT` / `SET_STAT_STAGE` payload shapes match `useCalculatorState.ts:67,73`; `ArenaCalculatorLandscape` props mirror `ArenaCalculator.tsx:31-50` verbatim; `ItemIcon item=` matches `ArenaMonCard.tsx:63`.
