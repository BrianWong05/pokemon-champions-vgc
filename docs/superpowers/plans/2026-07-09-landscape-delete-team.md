# Landscape Delete Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore team deletion in the landscape Teams view.

**Architecture:** Add one callback prop to `ArenaTeamsLandscape` and render one accessible trash action for the selected team. Reuse `TeamsPage.handleDeleteTeam` so confirmation and persistence remain shared with the existing portrait and desktop views.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Reuse the existing confirmation and deletion flow.
- Add no dependency, dialog, state, or abstraction.

---

### Task 1: Wire the landscape delete action

**Files:**
- Rename: `src/features/teams/components/mobile/arena-teams-landscape.test.ts` to `src/features/teams/components/mobile/arena-teams-landscape.test.tsx`
- Modify: `src/features/teams/components/mobile/ArenaTeamsLandscape.tsx`
- Modify: `src/pages/Teams/index.tsx`

**Interfaces:**
- Consumes: `handleDeleteTeam(id: string, name: string): Promise<void>`
- Produces: `ArenaTeamsLandscapeProps.onDelete(id: string, name: string): void`

- [x] **Step 1: Write the failing test**

Rename the test file to `.tsx`, add a jsdom environment and Testing Library imports, then append this focused test:

```tsx
it('deletes the selected team through an accessible action', () => {
  const onDelete = vi.fn();
  render(
    <ArenaTeamsLandscape
      teams={[{ id: 'team-1', name: 'Rain', createdAt: new Date(), members: [] }]}
      pokemonList={[]}
      loading={false}
      error={null}
      onNew={() => {}}
      onScanPlayer={() => {}}
      onEdit={() => {}}
      onReviewMon={() => {}}
      onDelete={onDelete}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Delete team' }));
  expect(onDelete).toHaveBeenCalledWith('team-1', 'Rain');
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/teams/components/mobile/arena-teams-landscape.test.tsx`

Expected: FAIL because `onDelete` is not a recognized prop and no “Delete team” button exists.

- [x] **Step 3: Implement the minimal component and page wiring**

Add the prop:

```tsx
onDelete: (id: string, name: string) => void;
```

Destructure it in `ArenaTeamsLandscape`, then place this beside the existing Edit action:

```tsx
<button
  onClick={() => onDelete(selected.id, selected.name)}
  aria-label="Delete team"
  style={{ width: 34, height: 34, flex: 'none', borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', background: 'var(--danger-soft)', border: '1px solid var(--danger-line)', color: 'var(--danger)', cursor: 'pointer' }}
>
  <Icon name="trash-2" size={15} color="var(--danger)" />
</button>
```

Pass the existing handler from `TeamsPage`:

```tsx
onDelete={handleDeleteTeam}
```

- [x] **Step 4: Run focused and project checks**

Run:

```bash
npm test -- src/features/teams/components/mobile/arena-teams-landscape.test.tsx
npm run type-check
```

Expected: both commands exit 0.

- [x] **Step 5: Commit**

```bash
git add src/features/teams/components/mobile/arena-teams-landscape.test.tsx src/features/teams/components/mobile/ArenaTeamsLandscape.tsx src/pages/Teams/index.tsx docs/superpowers/plans/2026-07-09-landscape-delete-team.md
git commit -m "fix(teams): restore landscape delete action"
```
