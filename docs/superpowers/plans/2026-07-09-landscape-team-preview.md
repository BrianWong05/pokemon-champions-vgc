# Landscape Team Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landscape team detail pane preview-only by removing every Pokémon scan action.

**Architecture:** Remove the scan callback from `ArenaTeamsLandscape` and its `TeamsPage` call site. Replace interactive missing-member controls with passive empty-slot labels.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Remove the header **Scan Pokémon** action.
- Render missing members as passive **Empty slot** placeholders.
- Leave scanning and creation flows outside this preview unchanged.

---

### Task 1: Remove preview scan actions

**Files:**
- Modify: `src/features/teams/components/mobile/arena-teams-landscape.test.tsx`
- Modify: `src/features/teams/components/mobile/ArenaTeamsLandscape.tsx`
- Modify: `src/pages/Teams/index.tsx`

**Interfaces:**
- Removes: `ArenaTeamsLandscapeProps.onScanPlayer(): void`
- Preserves: Edit, Delete, Export, and member review callbacks

- [x] **Step 1: Write the failing test**

Append this test using the current component interface:

```tsx
it('renders no scan actions in the team preview', () => {
  render(
    <ArenaTeamsLandscape
      teams={[{ id: 'team-1', name: 'Rain', createdAt: new Date(), members: [] }]}
      pokemonList={[]}
      loading={false}
      error={null}
      onNew={() => {}}
      onScanPlayer={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      onExport={() => {}}
      onReviewMon={() => {}}
    />,
  );

  expect(screen.queryByRole('button', { name: 'Scan Pokémon' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Scan' })).toBeNull();
  expect(screen.getAllByText('Empty slot')).toHaveLength(6);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/teams/components/mobile/arena-teams-landscape.test.tsx`

Expected: FAIL because **Scan Pokémon** and six **Scan** buttons are present.

- [x] **Step 3: Implement the minimal removal**

Remove `onScanPlayer` from `ArenaTeamsLandscapeProps`, the component destructuring, and the `TeamsPage` call site. Delete the header scan button.

Replace each missing-member button with:

```tsx
<div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 84, borderRadius: 'var(--r-md)', background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--ink-4)', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700 }}>
  Empty slot
</div>
```

Remove `onScanPlayer` from existing component test render calls.

- [x] **Step 4: Run focused and project checks**

Run:

```bash
npm test -- src/features/teams/components/mobile/arena-teams-landscape.test.tsx
npm run type-check
npm run build
```

Expected: all commands exit 0.

- [x] **Step 5: Commit**

```bash
git add src/features/teams/components/mobile/arena-teams-landscape.test.tsx src/features/teams/components/mobile/ArenaTeamsLandscape.tsx src/pages/Teams/index.tsx docs/superpowers/plans/2026-07-09-landscape-team-preview.md
git commit -m "refactor(teams): make landscape detail preview-only"
```
