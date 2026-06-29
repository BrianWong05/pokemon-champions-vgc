# Champions dataset (Reg M-B legality) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the **Regulation M-B** format and its full legality to `vgc_pokemon.db`, verified, so the calculator covers both Reg M-A and Reg M-B.

> ## Revision note (during execution, 2026-06-29)
> The original plan assumed ~25 new Champions Megas had to be discovered, fetched, and
> loaded (Tasks 1–3). **Execution proved that premise false:** `scripts/discover_new_megas.py`
> found 0 new Megas — all Champions-original Megas (e.g. `Mega Greninja`, `Mega Raichu X/Y`,
> `baxcalibur-mega`, `zeraora-mega`, `lucario-mega-z`) **already exist as `pokemon` rows with
> full stats**. The *real* remaining gap is that **Reg M-B does not exist as a format**, and
> the Serebii M-B page is a **delta** (38 entries = ~22 new species + 16 new Megas), not a full
> roster. Per the approved decision, **M-B legality = M-A's legal set ∪ the 38 M-B additions**
> (M-B is additive over M-A; no removals assumed; the resulting count is sanity-checked).
> Tasks 1–3 of the original plan are dropped. New scope below.

**Architecture:** One scraper (`scrape_regulation_m_b.py`) that mirrors `scrape_regulation_m_a.py`'s Serebii-table parsing + `find_pokemon_ids` matching to resolve the 38 M-B additions to `pokemon_id`s, then writes `format_pokemon` for a new "Regulation M-B" format seeded from M-A's existing legality. Verify with DB sanity checks, an ability check, and a golden damage test on an already-present Champions Mega.

**Tech Stack:** Python 3 (`requests`, `bs4`, `sqlite3` — confirmed present), SQLite, Vitest + `@smogon/calc` + `better-sqlite3` (already a dep) for verification.

**Spec:** [docs/superpowers/specs/2026-06-29-champions-dataset-design.md](../specs/2026-06-29-champions-dataset-design.md)
**Branch:** `champions-dataset` (not `main`).

**Confirmed facts:** Serebii M-B page = 200, 38 type-bearing rows, same `dextab`/`tab` table structure as M-A. `formats` currently has only "Regulation M-A" (id 1, 270 legal mons). The Champions Megas are already in `pokemon` with stats; some new M-B Megas (`raichu-mega-x/y`, `zeraora-mega`, `baxcalibur-mega`) are currently legal in **no** format.

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `scripts/discover_new_megas.py` | Diagnostic that proved the Megas already exist (keep as a check) | Already created |
| `scripts/scrape_regulation_m_b.py` | Build "Regulation M-B" format + `format_pokemon` = M-A set ∪ 38 additions | Create |
| `vgc_pokemon.db` | The committed dataset artifact | Modify (data) |
| `src/features/pokemon/utils/champions-dataset.test.ts` | DB sanity + new-Mega golden damage test | Create |
| `docs/champions-new-abilities.md` | Any new-Mega ability `@smogon/calc` doesn't model | Create |

---

## Task 1: Build Reg M-B legality (M-A set ∪ 38 additions)

**Files:** Create `scripts/scrape_regulation_m_b.py`; Modify `vgc_pokemon.db`

- [ ] **Step 1: Create the M-B scraper from the M-A scraper**

```bash
cp scripts/scrape_regulation_m_a.py scripts/scrape_regulation_m_b.py
```

- [ ] **Step 2: Point it at the M-B page and name the format**

In `scripts/scrape_regulation_m_b.py`:
- change the `url` to `https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml`
- change `format_name = 'Regulation M-A'` to `format_name = 'Regulation M-B'`

- [ ] **Step 3: Seed M-B from M-A before inserting the scraped additions**

In `scripts/scrape_regulation_m_b.py`, immediately AFTER the line that clears M-B's rows
(`cursor.execute("DELETE FROM format_pokemon WHERE format_id = ?", (format_id,))`), insert a
union-seed from M-A so M-B inherits everything legal in M-A:
```python
    # M-B is additive over M-A: seed M-B with all of M-A's legal Pokémon, then add the
    # M-B-page deltas (new species + new Megas) below.
    cursor.execute("SELECT id FROM formats WHERE name = 'Regulation M-A'")
    ma_row = cursor.fetchone()
    if ma_row:
        cursor.execute(
            "INSERT OR IGNORE INTO format_pokemon (format_id, pokemon_id) "
            "SELECT ?, pokemon_id FROM format_pokemon WHERE format_id = ?",
            (format_id, ma_row[0]),
        )
        print(f"Seeded M-B with {cursor.rowcount} Pokémon from M-A.")
```
(The existing loop that resolves scraped names via `find_pokemon_ids` and does
`INSERT OR IGNORE INTO format_pokemon` then adds the 38 deltas on top — duplicates are
ignored by `OR IGNORE`.)

- [ ] **Step 4: Run it**

Run: `python3 scripts/scrape_regulation_m_b.py`
Expected: prints "Seeded M-B with ~270 Pokémon from M-A." and a final summary; the M-B legal
count should be **M-A's count plus roughly the new species/Megas** (≈ 290–310). If M-B's count
comes out ≤ 40 (i.e. the seed didn't run) or unchanged from M-A (deltas didn't resolve), STOP
and inspect.

- [ ] **Step 5: Verify both formats + that new M-B Megas are now legal in M-B**

Run:
```bash
python3 -c "import sqlite3; c=sqlite3.connect('vgc_pokemon.db').cursor(); \
print('formats:', c.execute(\"SELECT name,(SELECT COUNT(*) FROM format_pokemon fp WHERE fp.format_id=f.id) FROM formats f\").fetchall()); \
print('orphans:', c.execute('SELECT COUNT(*) FROM format_pokemon fp LEFT JOIN pokemon p ON p.id=fp.pokemon_id WHERE p.id IS NULL').fetchone()[0]); \
mb=c.execute(\"SELECT id FROM formats WHERE name='Regulation M-B'\").fetchone()[0]; \
print('raichu-mega-x legal in M-B:', bool(c.execute('SELECT 1 FROM format_pokemon fp JOIN pokemon p ON p.id=fp.pokemon_id WHERE fp.format_id=? AND p.identifier=?',(mb,'raichu-mega-x')).fetchone())); \
print('venusaur-mega legal in M-B (inherited):', bool(c.execute('SELECT 1 FROM format_pokemon fp JOIN pokemon p ON p.id=fp.pokemon_id WHERE fp.format_id=? AND p.identifier=?',(mb,'venusaur-mega')).fetchone()))"
```
Expected: both formats present; M-B count > M-A count; **orphans = 0**; `raichu-mega-x` legal in M-B = True; `venusaur-mega` (inherited from M-A) legal in M-B = True.

- [ ] **Step 6: Commit**

```bash
git add scripts/discover_new_megas.py scripts/data/new_megas_todo.json scripts/scrape_regulation_m_b.py vgc_pokemon.db
git commit -m "feat(data): add Regulation M-B legality (M-A set + M-B additions)"
```

---

## Task 2: Verify (ability check + golden test + DB sanity) and sign off

**Files:** Create `docs/champions-new-abilities.md`, `src/features/pokemon/utils/champions-dataset.test.ts`; Modify the spec status line.

- [ ] **Step 1: Check Champions-Mega abilities against `@smogon/calc`**

Run (lists abilities of every Mega legal in M-A or M-B, flags any `@smogon/calc` doesn't know):
```bash
node --input-type=module -e "
import pkg from '@smogon/calc';
import Database from 'better-sqlite3';
const { Generations } = pkg; const gen = Generations.get(9);
const db = new Database('vgc_pokemon.db', { readonly: true });
const rows = db.prepare(\`SELECT DISTINCT a.name_en FROM pokemon_forms f
  JOIN pokemon_abilities pa ON pa.pokemon_id=f.pokemon_id
  JOIN abilities a ON a.id=pa.ability_id WHERE f.is_mega=1\`).raw().all();
const unknown = rows.map(r=>r[0]).filter(n => n && !gen.abilities.get(n.replace(/ /g,'').toLowerCase()));
console.log('UNKNOWN_ABILITIES', JSON.stringify(unknown));
"
```
Expected: prints `UNKNOWN_ABILITIES [...]`. Record the list.

- [ ] **Step 2: Document the result**

Create `docs/champions-new-abilities.md`:
```markdown
# Champions Mega abilities vs @smogon/calc

Checked every Mega's ability against @smogon/calc gen-9 data (Task 2, Step 1).

- Unknown abilities: <paste the list, or "none — all are modelled by @smogon/calc">
- Damage-affecting unknowns needing handling in damage-calc.ts: <list, or "none">
```
For any unknown *damage-affecting* ability, note that it must be modelled via
`getStatModifier` / `getModifiedMoveType` in `damage-calc.ts` (follow-up if non-trivial).

- [ ] **Step 3: Write DB sanity + golden damage tests**

Create `src/features/pokemon/utils/champions-dataset.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'

const db = new Database('vgc_pokemon.db', { readonly: true })
const q = (sql: string): any[][] => db.prepare(sql).raw().all() as any[][]

describe('Champions dataset sanity', () => {
  it('has both regulations, each non-empty, M-B ⊇ M-A in size', () => {
    const rows = q("SELECT name,(SELECT COUNT(*) FROM format_pokemon fp WHERE fp.format_id=f.id) FROM formats f")
    const m = Object.fromEntries(rows.map(([n, c]) => [n, c]))
    expect(m['Regulation M-A']).toBeGreaterThan(0)
    expect(m['Regulation M-B']).toBeGreaterThan(0)
    expect(m['Regulation M-B']).toBeGreaterThanOrEqual(m['Regulation M-A'])
  })
  it('every mega form has 6 base stats and >=1 ability', () => {
    const bad = q(`SELECT p.identifier FROM pokemon_forms f JOIN pokemon p ON p.id=f.pokemon_id
      WHERE f.is_mega=1 AND (p.base_hp IS NULL OR p.base_speed IS NULL
        OR (SELECT COUNT(*) FROM pokemon_abilities pa WHERE pa.pokemon_id=p.id)=0)`)
    expect(bad).toEqual([])
  })
  it('no format_pokemon row points at a missing pokemon', () => {
    expect(q("SELECT COUNT(*) FROM format_pokemon fp LEFT JOIN pokemon p ON p.id=fp.pokemon_id WHERE p.id IS NULL")[0][0]).toBe(0)
  })
})
```

- [ ] **Step 4: Add a golden damage test for an already-present Champions Mega**

Append a golden test using the Spec-1 pattern (see `champions-stats-override.test.ts`). Pick a
Champions Mega (e.g. `Mega Raichu Y`), read its base stats from the DB, build attacker/defender
via `mapToSmogonPokemon`, and assert the damage % against a value captured from ChampDex/NCP
(identical inputs — 0 SP, neutral nature, no item, a fixed move, singles). Capture the
reference % during this step (it cannot be invented). Assert min/max % within ±1%.

- [ ] **Step 5: Full verification gate**

Run:
```bash
npm test
npm run type-check
npm run build
```
Expected: all green (new sanity + golden tests pass; no regressions).

- [ ] **Step 6: Mark the spec done and commit**

In `docs/superpowers/specs/2026-06-29-champions-dataset-design.md`, change `Status: draft for
review` to `Status: implemented — Reg M-B legality added; Champions Megas were already present (2026-06-29)`.
```bash
git add docs/champions-new-abilities.md src/features/pokemon/utils/champions-dataset.test.ts docs/superpowers/specs/2026-06-29-champions-dataset-design.md
git commit -m "test(data): Champions dataset sanity + Mega golden test; mark spec done"
```

---

## Completion

After both tasks pass, use **superpowers:finishing-a-development-branch** to integrate `champions-dataset` (PR to `main`). The format-selector UI that makes Reg M-B user-selectable is the next slice.
