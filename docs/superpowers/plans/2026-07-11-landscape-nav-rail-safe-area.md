# Mobile Chrome Safe-Area Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep portrait app-bar/tab-bar controls and landscape rail controls clear of iPhone cutouts while preserving full-bleed chrome backgrounds and the existing usable control dimensions.

**Architecture:** Opt the document into iOS edge-to-edge safe-area reporting, then make each affected chrome dimension additive: base control size plus its adjacent safe-area inset. Verify the exact inline declarations through React server rendering because jsdom 29.1.1 corrupts valid `env(..., fallback)` values in CSSOM; keep document metadata and the regulation-menu anchor under source-level regression tests.

**Tech Stack:** React 19, TypeScript, inline React styles, React DOM server rendering, HTML viewport metadata, Vitest 4.

## Global Constraints

- Mobile chrome backgrounds extend behind the adjacent iPhone unsafe regions.
- Landscape rail controls begin after `env(safe-area-inset-left, 0px)` and retain a 56px usable column.
- Portrait app-bar controls begin after `env(safe-area-inset-top, 0px)` and retain a 56px usable row.
- Portrait tab-bar controls sit above `env(safe-area-inset-bottom, 0px)` and retain a 64px usable row.
- The portrait regulation menu remains anchored directly below the regulation pill after the top inset is added.
- Zero insets preserve the existing chrome dimensions; desktop and calculator content remain unchanged.
- Add no dependency and introduce no new production abstraction.

---

## File Structure

- Modify `index.html`: opt the viewport into edge-to-edge safe-area reporting.
- Modify `src/design-system/arena/NavRail.tsx`: add the left inset outside the 56px rail control column.
- Modify `src/design-system/arena/AppBar.tsx`: add the top inset outside the 56px app-bar control row.
- Modify `src/design-system/arena/TabBar.tsx`: add the bottom inset outside the 64px tab-bar control row.
- Modify `src/components/templates/ArenaShell.tsx`: add the top inset to the regulation-menu anchor.
- Create `src/app-shell-safe-area.test.tsx`: guard viewport metadata, exact server-rendered chrome declarations, and the menu-anchor source declaration.
- Restore `src/design-system/arena/nav-rail.test.tsx` to its pre-task tests by removing the abandoned jsdom safe-area assertion; the replacement SSR test owns this regression.

### Task 1: Protect Mobile Chrome from iPhone Cutouts

**Files:**
- Create: `src/app-shell-safe-area.test.tsx`
- Modify: `src/design-system/arena/NavRail.tsx`
- Modify: `src/design-system/arena/AppBar.tsx`
- Modify: `src/design-system/arena/TabBar.tsx`
- Modify: `src/components/templates/ArenaShell.tsx`
- Modify: `index.html`
- Restore: `src/design-system/arena/nav-rail.test.tsx`
- Remove abandoned test file: `src/app-shell-safe-area.test.ts`

**Interfaces:**
- Consumes: CSS environment variables `safe-area-inset-left`, `safe-area-inset-top`, and `safe-area-inset-bottom`.
- Produces: additive rail/app-bar/tab-bar dimensions, safe-area padding, a safe-area-aware regulation-menu anchor, and `viewport-fit=cover` metadata.

- [ ] **Step 1: Replace the abandoned jsdom regression with an SSR/source regression test**

Remove the in-progress safe-area test from `src/design-system/arena/nav-rail.test.tsx` and remove `src/app-shell-safe-area.test.ts`. Create `src/app-shell-safe-area.test.tsx`:

```tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppBar } from './design-system/arena/AppBar';
import { NavRail } from './design-system/arena/NavRail';
import { TabBar } from './design-system/arena/TabBar';

describe('app shell safe areas', () => {
  it('opts the viewport into iOS edge-to-edge safe-area insets', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    );
  });

  it('keeps the landscape rail control column after the left inset', () => {
    const markup = renderToStaticMarkup(<NavRail active="calc" />);
    expect(markup).toContain('width:calc(56px + env(safe-area-inset-left, 0px))');
    expect(markup).toContain('padding-left:env(safe-area-inset-left, 0px)');
  });

  it('keeps the portrait app-bar control row below the top inset', () => {
    const markup = renderToStaticMarkup(<AppBar title="Calculator" />);
    expect(markup).toContain(
      'height:calc(var(--appbar-h) + env(safe-area-inset-top, 0px))',
    );
    expect(markup).toContain('padding-top:env(safe-area-inset-top, 0px)');
  });

  it('keeps the portrait tab-bar control row above the bottom inset', () => {
    const markup = renderToStaticMarkup(<TabBar active="calc" />);
    expect(markup).toContain(
      'height:calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))',
    );
    expect(markup).toContain('padding-bottom:env(safe-area-inset-bottom, 0px)');
  });

  it('adds the top inset to the portrait regulation-menu anchor', () => {
    const shell = readFileSync(
      resolve(process.cwd(), 'src/components/templates/ArenaShell.tsx'),
      'utf8',
    );
    expect(shell).toContain(
      "top: 'calc(env(safe-area-inset-top, 0px) + (var(--appbar-h) + 34px) / 2 + 2px)'",
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/app-shell-safe-area.test.tsx
```

Expected: the existing viewport and landscape-rail checks pass because their production declarations are already present in the interrupted worktree; the app-bar, tab-bar, and regulation-menu checks fail because portrait safe areas are not implemented.

- [ ] **Step 3: Add the portrait top inset to the app bar**

In `src/design-system/arena/AppBar.tsx`, make the height additive and retain the existing horizontal padding while adding top padding:

```tsx
        height: 'calc(var(--appbar-h) + env(safe-area-inset-top, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sp-3)',
        padding: '0 var(--gutter)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
```

- [ ] **Step 4: Add the portrait bottom inset outside the tab-bar control row**

In `src/design-system/arena/TabBar.tsx`, replace the fixed height and retain the existing bottom padding:

```tsx
        height: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))',
```

- [ ] **Step 5: Keep the regulation menu below the inset app bar**

In the portrait branch of the regulation-menu position in `src/components/templates/ArenaShell.tsx`, use:

```tsx
              : {
                  top: 'calc(env(safe-area-inset-top, 0px) + (var(--appbar-h) + 34px) / 2 + 2px)',
                  right: 'var(--gutter)',
                }),
```

- [ ] **Step 6: Confirm the landscape and viewport production declarations**

Keep these interrupted-worktree changes exactly:

```tsx
// src/design-system/arena/NavRail.tsx
width: 'calc(56px + env(safe-area-inset-left, 0px))',
paddingLeft: 'env(safe-area-inset-left, 0px)',
```

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 7: Run the focused test and verify GREEN**

Run:

```bash
npx vitest run src/app-shell-safe-area.test.tsx src/design-system/arena/nav-rail.test.tsx src/components/templates/arena-shell-landscape.test.tsx
```

Expected: all three files pass with 12 tests total and pristine output.

- [ ] **Step 8: Run full verification**

Run:

```bash
npm test
npm run type-check
npm run build
git diff --check
```

Expected: all tests pass, TypeScript reports no errors, the Vite production build succeeds, and `git diff --check` prints no output. If the existing HEIC fixture hits a sandbox-only macOS `sips` denial, report it so the controller can rerun `npm test` with the already-approved elevated test permission; do not change production code.

- [ ] **Step 9: Review the final scoped diff**

Run:

```bash
git diff -- index.html src/app-shell-safe-area.test.tsx src/design-system/arena/NavRail.tsx src/design-system/arena/AppBar.tsx src/design-system/arena/TabBar.tsx src/components/templates/ArenaShell.tsx src/design-system/arena/nav-rail.test.tsx
```

Expected: only the regression test and safe-area declarations are present; no desktop or calculator content code changed.

- [ ] **Step 10: Commit the fix**

```bash
git add index.html src/app-shell-safe-area.test.tsx src/design-system/arena/NavRail.tsx src/design-system/arena/AppBar.tsx src/design-system/arena/TabBar.tsx src/components/templates/ArenaShell.tsx src/design-system/arena/nav-rail.test.tsx
git commit -m "fix: keep mobile chrome clear of iPhone cutouts"
```
