# Landscape Nav Rail Safe-Area Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the landscape navigation rail's interactive controls clear of an iPhone notch while preserving its full-bleed background and 56px usable control column.

**Architecture:** Opt the document into iOS edge-to-edge safe-area reporting, then make the rail's total width additive: the left safe-area inset plus its existing 56px control column. The existing left padding positions controls after the unsafe area; no page, calculator, portrait, or desktop layout code changes.

**Tech Stack:** React 19, TypeScript, inline React styles, HTML viewport metadata, Vitest 4, Testing Library, jsdom.

## Global Constraints

- The rail background extends behind the landscape notch.
- Every rail control begins after `env(safe-area-inset-left, 0px)`.
- The usable control column remains 56px wide; when the inset is zero, the rail remains exactly 56px wide.
- Portrait and desktop layout behavior remain unchanged.
- Add no dependency and introduce no new component or layout abstraction.

---

## File Structure

- Modify `index.html`: opt the viewport into edge-to-edge safe-area reporting.
- Modify `src/design-system/arena/NavRail.tsx`: add the safe-area inset to the rail's total width.
- Modify `src/design-system/arena/nav-rail.test.tsx`: guard the rail's additive width and left padding.
- Create `src/app-shell-safe-area.test.ts`: guard the viewport metadata required for non-zero iOS inset values.

### Task 1: Protect the Landscape Rail from the iPhone Notch

**Files:**
- Create: `src/app-shell-safe-area.test.ts`
- Modify: `src/design-system/arena/nav-rail.test.tsx`
- Modify: `src/design-system/arena/NavRail.tsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: CSS environment variable `env(safe-area-inset-left, 0px)` and the existing `NavRail` component.
- Produces: a rail with `width: calc(56px + env(safe-area-inset-left, 0px))`, `padding-left: env(safe-area-inset-left, 0px)`, and a viewport meta tag containing `viewport-fit=cover`.

- [ ] **Step 1: Add the failing rail regression test**

Append this test inside the existing `describe('NavRail', ...)` block in `src/design-system/arena/nav-rail.test.tsx`:

```tsx
  it('adds the landscape safe-area inset outside the 56px control column', () => {
    render(<NavRail active="calc" />);
    const rail = screen.getByRole('navigation', { name: 'Primary' });

    expect(rail.style.width).toBe('calc(56px + env(safe-area-inset-left, 0px))');
    expect(rail.style.paddingLeft).toBe('env(safe-area-inset-left, 0px)');
  });
```

- [ ] **Step 2: Add the failing viewport regression test**

Create `src/app-shell-safe-area.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('app shell safe areas', () => {
  it('opts the viewport into iOS edge-to-edge safe-area insets', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    );
  });
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npx vitest run src/design-system/arena/nav-rail.test.tsx src/app-shell-safe-area.test.ts
```

Expected: two assertion failures. The rail reports `56px` instead of the additive `calc(...)` width, and `index.html` lacks `viewport-fit=cover`. Existing NavRail tests remain passing.

- [ ] **Step 4: Implement the additive rail width**

In `src/design-system/arena/NavRail.tsx`, replace the numeric width and retain the existing left padding:

```tsx
      style={{
        width: 'calc(56px + env(safe-area-inset-left, 0px))',
        flex: '0 0 auto',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 0',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
```

- [ ] **Step 5: Enable iOS safe-area reporting**

In `index.html`, replace the viewport meta tag with:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run:

```bash
npx vitest run src/design-system/arena/nav-rail.test.tsx src/app-shell-safe-area.test.ts
```

Expected: both test files pass with seven tests total.

- [ ] **Step 7: Run full verification**

Run:

```bash
npm test
npm run type-check
npm run build
git diff --check
```

Expected: all tests pass, TypeScript reports no errors, the Vite production build succeeds, and `git diff --check` prints no output.

- [ ] **Step 8: Review the final diff**

Run:

```bash
git diff -- index.html src/app-shell-safe-area.test.ts src/design-system/arena/NavRail.tsx src/design-system/arena/nav-rail.test.tsx
```

Expected: only the two regression tests and two safe-area declarations are present; no portrait, desktop, or calculator code changed.

- [ ] **Step 9: Commit the fix**

```bash
git add index.html src/app-shell-safe-area.test.ts src/design-system/arena/NavRail.tsx src/design-system/arena/nav-rail.test.tsx
git commit -m "fix: keep landscape rail clear of iPhone notch"
```
