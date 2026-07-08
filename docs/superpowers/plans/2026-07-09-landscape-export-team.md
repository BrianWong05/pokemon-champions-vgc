# Landscape Export Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose team export from the landscape Teams view.

**Architecture:** Add one callback prop to `ArenaTeamsLandscape` and render one labeled secondary action for the selected team. Reuse `TeamsPage`'s existing `exportTeam` state and `TeamExportModal`.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Place **Export team** immediately before **Scan Pokémon**.
- Reuse the existing `TeamExportModal` and export state.
- Add no dependency, modal, formatter, state, or abstraction.

---

### Task 1: Wire the landscape export action

**Files:**
- Modify: `src/features/teams/components/mobile/arena-teams-landscape.test.tsx`
- Modify: `src/features/teams/components/mobile/ArenaTeamsLandscape.tsx`
- Modify: `src/pages/Teams/index.tsx`

**Interfaces:**
- Consumes: `setExportTeam(team: TeamWithMembers): void`
- Produces: `ArenaTeamsLandscapeProps.onExport(team: TeamWithMembers): void`

- [x] **Step 1: Write the failing test**

Append this focused test to `arena-teams-landscape.test.tsx`, supplying `onExport={() => {}}` to the existing delete test:

```tsx
it('exports the selected team through a labeled action', () => {
  const team = { id: 'team-1', name: 'Rain', createdAt: new Date(), members: [] };
  const onExport = vi.fn();
  render(
    <ArenaTeamsLandscape
      teams={[team]}
      pokemonList={[]}
      loading={false}
      error={null}
      onNew={() => {}}
      onScanPlayer={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      onReviewMon={() => {}}
      onExport={onExport}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Export team' }));
  expect(onExport).toHaveBeenCalledWith(team);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/teams/components/mobile/arena-teams-landscape.test.tsx`

Expected: FAIL because no “Export team” button exists.

- [x] **Step 3: Implement the minimal component and page wiring**

Add the prop:

```tsx
onExport: (team: TeamWithMembers) => void;
```

Destructure it in `ArenaTeamsLandscape`, then place this immediately before **Scan Pokémon**:

```tsx
<button onClick={() => onExport(selected)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', color: 'var(--ink-2)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
  <Icon name="share" size={15} color="var(--ink-2)" />Export team
</button>
```

Pass the existing state setter from `TeamsPage`:

```tsx
onExport={setExportTeam}
```

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
git add src/features/teams/components/mobile/arena-teams-landscape.test.tsx src/features/teams/components/mobile/ArenaTeamsLandscape.tsx src/pages/Teams/index.tsx docs/superpowers/plans/2026-07-09-landscape-export-team.md
git commit -m "feat(teams): add landscape export action"
```
