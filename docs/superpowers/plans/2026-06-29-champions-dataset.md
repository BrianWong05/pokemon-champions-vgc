# Champions dataset (Mega + Reg M-B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ~25 Champions-original Megas and the Reg M-B format/legality to `vgc_pokemon.db`, verified, so the calculator can compute correct damage for every legal Pokémon and Mega in Reg M-A and Reg M-B.

**Architecture:** Mirror the existing Python-scrape-into-`vgc_pokemon.db` pipeline. Discover the new Megas by diffing the Serebii regulation lists against existing DB Megas; fetch their stats from Serebii dex pages into a hand-verified `champions_new_megas.json`; load that into `pokemon`/`pokemon_forms`/`pokemon_abilities`; then build M-B legality with a scraper that mirrors `scrape_regulation_m_a.py` and re-run the M-A scraper. Verify with golden damage tests + DB sanity checks. No schema change (the existing tables model all of this); data values are discovered at runtime, golden reference values captured during execution.

**Tech Stack:** Python 3 (`requests` 2.32, `bs4`, `sqlite3` — all confirmed present), SQLite (`vgc_pokemon.db`), Vitest + `@smogon/calc` for verification.

**Spec:** [docs/superpowers/specs/2026-06-29-champions-dataset-design.md](../specs/2026-06-29-champions-dataset-design.md)

**Branch:** `champions-dataset` (already checked out; not `main`).

**Confirmed facts (de-risking done):**
- Serebii Reg M-A and **Reg M-B** pages both return 200; M-B exists at `serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml` (same `dextab`/`tab` table structure as M-A).
- Serebii dex pages expose base stats as `Base Stats - Total: <total> <hp> <atk> <def> <spa> <spd> <spe>` (e.g. `/pokedex-sv/venusaur/`). Champions dex root is `/pokedex-champions`.
- DB already has 1204 `pokemon` rows incl. 96 mainline Mega forms with stats; only "Regulation M-A" exists (270 legal mons).

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `scripts/discover_new_megas.py` | Scrape M-A+M-B lists, diff Megas vs DB → list of new Megas to gather | Create |
| `scripts/data/new_megas_todo.json` | Generated: Mega names in regulations but missing from DB (+ which regulation) | Create (generated) |
| `scripts/fetch_mega_stats.py` | Fetch each new Mega's Serebii dex page → stats/types/ability | Create |
| `scripts/data/champions_new_megas.json` | Hand-verified source of truth for the new Megas | Create |
| `scripts/load_new_megas.py` | Insert new Megas into `pokemon`/`pokemon_forms`/`pokemon_abilities` (idempotent) | Create |
| `scripts/scrape_regulation_m_b.py` | Build "Regulation M-B" format + `format_pokemon` (mirrors M-A scraper) | Create |
| `vgc_pokemon.db` | The committed dataset artifact | Modify (data) |
| `src/features/pokemon/utils/champions-dataset.test.ts` | DB sanity + new-Mega golden damage tests | Create |
| `docs/champions-new-abilities.md` | Notes any new-Mega ability `@smogon/calc` doesn't know | Create |

**Note on runtime data:** Tasks 1–2 *discover* the exact new-Mega list and stat values by fetching Serebii — they are not known in advance and must not be invented. Each such step ends with an inspection/verification gate. Golden-test reference % (Task 5) are captured from ChampDex/NCP during execution, exactly as in Spec 1.

---

## Task 1: Discover the new Champions Megas

Find which Megas are legal in Reg M-A / M-B but absent from the DB (the Champions-original ones).

**Files:** Create `scripts/discover_new_megas.py`, generates `scripts/data/new_megas_todo.json`

- [ ] **Step 1: Write the discovery script**

Create `scripts/discover_new_megas.py`:
```python
import requests, re, sqlite3, json, os
from bs4 import BeautifulSoup

H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
PAGES = {
    "M-A": "https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml",
    "M-B": "https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml",
}

def scrape_names(url):
    """Return list of (name, [types]) using the same logic as scrape_regulation_m_a.py."""
    soup = BeautifulSoup(requests.get(url, headers=H, timeout=20).text, "html.parser")
    out = []
    for table in soup.find_all("table", class_=["dextab", "tab"]):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 5:
                continue
            for idx in (2, 3):
                text = cells[idx].get_text().strip()
                m = re.match(r"^([A-Za-z0-9\.\-\:\' ]+)", text)
                if not m:
                    continue
                name = m.group(1).strip()
                if name in ("Name", "Type", "No") or name.isdigit() or len(name) <= 2:
                    continue
                types = []
                for img in cells[idx + 1].find_all("img"):
                    tm = re.search(r"/([^/]+)\.(gif|png)$", img.get("src", ""))
                    if tm:
                        types.append(tm.group(1).lower())
                if types:
                    out.append((name, types))
                    break
    return out

def mega_identifier(name):
    base = name.lower().strip()[5:]  # strip "mega "
    base = base.replace(" x", "").replace(" y", "").strip()
    suffix = "-mega-x" if name.lower().endswith(" x") else "-mega-y" if name.lower().endswith(" y") else "-mega"
    return base.replace(" ", "-").replace(".", "").replace("'", "") + suffix

def main():
    conn = sqlite3.connect("vgc_pokemon.db")
    cur = conn.cursor()
    todo = {}  # identifier -> {name, regulations:[...], types}
    for reg, url in PAGES.items():
        for name, types in scrape_names(url):
            if not name.lower().startswith("mega "):
                continue
            ident = mega_identifier(name)
            cur.execute("SELECT 1 FROM pokemon WHERE identifier = ?", (ident,))
            exists = cur.fetchone() is not None
            entry = todo.setdefault(ident, {"name": name, "identifier": ident, "types": types, "regulations": [], "in_db": exists})
            if reg not in entry["regulations"]:
                entry["regulations"].append(reg)
    missing = {k: v for k, v in todo.items() if not v["in_db"]}
    os.makedirs("scripts/data", exist_ok=True)
    with open("scripts/data/new_megas_todo.json", "w") as f:
        json.dump(sorted(missing.values(), key=lambda x: x["identifier"]), f, indent=2)
    print(f"Total Megas across regulations: {len(todo)} | already in DB: {sum(v['in_db'] for v in todo.values())} | NEW (missing): {len(missing)}")
    for v in sorted(missing.values(), key=lambda x: x["identifier"]):
        print(" NEW:", v["name"], v["types"], v["regulations"])
    conn.close()

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it and inspect**

Run: `python3 scripts/discover_new_megas.py`
Expected: prints a total Mega count, how many already exist in the DB, and a NEW list. Sanity check: the NEW count should be roughly in the **20–30** range (~9 from M-A + ~16 from M-B). If it prints 0 NEW or an implausible number, the Serebii table parsing or the `mega_identifier` mapping needs adjustment — STOP and inspect the page markup before continuing.

- [ ] **Step 3: Eyeball `scripts/data/new_megas_todo.json`**

Open the file. Each entry should be a Mega with a plausible `identifier`, `types`, and `regulations`. Spot-check 3 names against the live Serebii pages. Fix the parser if any entry is malformed (e.g. a header leaked in).

- [ ] **Step 4: Commit the discovery tooling**

```bash
git add scripts/discover_new_megas.py scripts/data/new_megas_todo.json
git commit -m "feat(data): discover new Champions Megas missing from the DB"
```

---

## Task 2: Gather verified stats for the new Megas

Fetch each new Mega's base stats / types / ability from Serebii into the curated `champions_new_megas.json`.

**Files:** Create `scripts/fetch_mega_stats.py`, generates/validates `scripts/data/champions_new_megas.json`

- [ ] **Step 1: Write the stats fetcher**

Create `scripts/fetch_mega_stats.py`:
```python
import requests, re, json
from bs4 import BeautifulSoup

H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
STAT_RE = re.compile(r"Base Stats\s*-\s*Total:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)")

def dex_slug(identifier):
    # "venusaur-mega" -> base species slug for the dex page
    return identifier.split("-mega")[0]

def fetch(identifier):
    slug = dex_slug(identifier)
    for url in (f"https://www.serebii.net/pokedex-champions/{slug}/",
                f"https://www.serebii.net/pokedex-sv/{slug}/"):
        try:
            r = requests.get(url, headers=H, timeout=20)
            if r.status_code != 200:
                continue
            txt = BeautifulSoup(r.text, "html.parser").get_text(" ", strip=True)
            # A Mega page typically lists multiple Base Stats blocks (base form + mega);
            # the LAST match is usually the Mega's. Inspect during execution to confirm.
            matches = STAT_RE.findall(txt)
            if matches:
                t, hp, atk, df, spa, spd, spe = map(int, matches[-1])
                return {"hp": hp, "atk": atk, "def": df, "spa": spa, "spd": spd, "spe": spe}, url
        except Exception:
            pass
    return None, None

def main():
    todo = json.load(open("scripts/data/new_megas_todo.json"))
    out = []
    for m in todo:
        stats, src = fetch(m["identifier"])
        out.append({
            "baseSpecies": dex_slug(m["identifier"]),
            "name": m["name"],
            "identifier": m["identifier"],
            "type1": (m["types"] + [None])[0],
            "type2": (m["types"] + [None, None])[1],
            "baseStats": stats,            # None if not found -> must be filled by hand
            "ability": None,               # fill by hand from the dex page (see Step 3)
            "regulation": m["regulations"][0],
            "_source": src,
        })
        print(m["identifier"], "->", "OK" if stats else "STATS NOT FOUND", src or "")
    json.dump(out, open("scripts/data/champions_new_megas.json", "w"), indent=2)
    print(f"Wrote {len(out)} entries; {sum(1 for e in out if e['baseStats'] is None)} need manual stats.")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `python3 scripts/fetch_mega_stats.py`
Expected: writes `scripts/data/champions_new_megas.json`. Note which entries report `STATS NOT FOUND`. Because a Mega page often shows both the base and Mega stat blocks, **verify the script picked the Mega block** (Step 3), not the base form's.

- [ ] **Step 3: Verify + complete the JSON by hand (the "verify" half of hybrid sourcing)**

For EVERY entry: open `_source` in a browser, confirm `baseStats` matches the **Mega** form (not the base form), fill `ability` from the dex page, and fix `type1`/`type2` if the scraped types were the base form's. For any `STATS NOT FOUND`, enter the stats manually from Serebii/Bulbapedia. Remove the `_source` helper field when done. Every entry must end with: non-null `baseStats` (6 ints), `type1`, `ability`, and a correct `regulation`.

- [ ] **Step 4: Validate the JSON shape**

Run:
```bash
python3 -c "import json; d=json.load(open('scripts/data/champions_new_megas.json')); assert all(e['baseStats'] and len(e['baseStats'])==6 and e['type1'] and e['ability'] and e['regulation'] in ('M-A','M-B') for e in d), 'incomplete entries'; print(len(d),'megas validated')"
```
Expected: `<N> megas validated` with no assertion error.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch_mega_stats.py scripts/data/champions_new_megas.json
git commit -m "feat(data): curate verified stats for new Champions Megas"
```

---

## Task 3: Load the new Megas into the DB

**Files:** Create `scripts/load_new_megas.py`; Modify `vgc_pokemon.db`

- [ ] **Step 1: Write the loader (idempotent)**

Create `scripts/load_new_megas.py`:
```python
import json, sqlite3

def get_or_create_ability(cur, name):
    ident = name.lower().replace(" ", "-")
    cur.execute("SELECT id FROM abilities WHERE identifier = ? OR LOWER(name_en) = ?", (ident, name.lower()))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("SELECT COALESCE(MAX(id),0)+1 FROM abilities")
    new_id = cur.fetchone()[0]
    cur.execute("INSERT INTO abilities (id, identifier, name_en) VALUES (?,?,?)", (new_id, ident, name))
    return new_id

def main():
    megas = json.load(open("scripts/data/champions_new_megas.json"))
    conn = sqlite3.connect("vgc_pokemon.db")
    cur = conn.cursor()
    cur.execute("SELECT COALESCE(MAX(id),0) FROM pokemon")
    next_id = max(cur.fetchone()[0] + 1, 11000)  # keep new ids clear of existing ranges
    for m in megas:
        cur.execute("SELECT id FROM pokemon WHERE identifier = ?", (m["identifier"],))
        existing = cur.fetchone()
        pid = existing[0] if existing else next_id
        bs = m["baseStats"]
        if existing:
            cur.execute("""UPDATE pokemon SET name_en=?, type1=?, type2=?, base_hp=?, base_attack=?,
                           base_defense=?, base_sp_atk=?, base_sp_def=?, base_speed=?, is_default=0 WHERE id=?""",
                        (m["name"], m["type1"], m["type2"], bs["hp"], bs["atk"], bs["def"], bs["spa"], bs["spd"], bs["spe"], pid))
        else:
            cur.execute("""INSERT INTO pokemon (id, identifier, name_en, type1, type2, base_hp, base_attack,
                           base_defense, base_sp_atk, base_sp_def, base_speed, is_default)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,0)""",
                        (pid, m["identifier"], m["name"], m["type1"], m["type2"],
                         bs["hp"], bs["atk"], bs["def"], bs["spa"], bs["spd"], bs["spe"]))
            next_id += 1
        cur.execute("INSERT OR IGNORE INTO pokemon_forms (id, identifier, pokemon_id, is_mega, form_identifier, is_default, is_battle_only) VALUES (?,?,?,1,'mega',0,1)",
                    (pid, m["identifier"], pid))
        ab_id = get_or_create_ability(cur, m["ability"])
        cur.execute("INSERT OR IGNORE INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot) VALUES (?,?,0,1)", (pid, ab_id))
    conn.commit()
    conn.close()
    print(f"Loaded {len(megas)} Megas.")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the loader**

Run: `python3 scripts/load_new_megas.py`
Expected: `Loaded <N> Megas.` (no exceptions). Run it twice to confirm idempotency (second run must not error or duplicate).

- [ ] **Step 3: Verify in SQL**

Run:
```bash
python3 -c "import sqlite3,json; c=sqlite3.connect('vgc_pokemon.db').cursor(); megas=json.load(open('scripts/data/champions_new_megas.json')); rows=[c.execute('SELECT base_attack,(SELECT COUNT(*) FROM pokemon_abilities pa WHERE pa.pokemon_id=p.id) FROM pokemon p WHERE identifier=?',(m['identifier'],)).fetchone() for m in megas]; assert all(r and r[0]==m['baseStats']['atk'] and r[1]>=1 for r,m in zip(rows,megas)), 'mismatch'; print(len(megas),'megas present with correct atk + ability')"
```
Expected: `<N> megas present with correct atk + ability`.

- [ ] **Step 4: Commit (script + updated DB)**

```bash
git add scripts/load_new_megas.py vgc_pokemon.db
git commit -m "feat(data): load new Champions Megas into vgc_pokemon.db"
```

---

## Task 4: Build Reg M-B legality and refresh M-A

**Files:** Create `scripts/scrape_regulation_m_b.py`; Modify `vgc_pokemon.db`

- [ ] **Step 1: Create the M-B scraper by mirroring M-A**

Run:
```bash
cp scripts/scrape_regulation_m_a.py scripts/scrape_regulation_m_b.py
```
Then in `scripts/scrape_regulation_m_b.py` change the two M-A-specific constants:
- the `url` (line ~66) to `https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml`
- the `format_name` (line ~126) to `Regulation M-B`

(The name/Mega matching logic — `find_pokemon_ids`, the `dextab`/`tab` table parsing, the `format_pokemon` clear+insert — is reused unchanged.)

- [ ] **Step 2: Run the M-B scraper, then re-run M-A**

Run:
```bash
python3 scripts/load_new_megas.py        # ensure new Megas are present first
python3 scripts/scrape_regulation_m_b.py
python3 scripts/scrape_regulation_m_a.py # re-link now that the 9 new M-A Megas exist as rows
```
Expected: each prints a summary with a non-zero legal-Pokémon count. If the M-B scraper finds 0 entries, the M-B page's table classes differ — inspect and adjust the `find_all('table', class_=[...])` filter. STOP and report if it can't be made to match.

- [ ] **Step 3: Verify both formats + that the new Megas are legal**

Run:
```bash
python3 -c "import sqlite3; c=sqlite3.connect('vgc_pokemon.db').cursor(); \
print('formats:', c.execute('SELECT name, (SELECT COUNT(*) FROM format_pokemon fp WHERE fp.format_id=f.id) FROM formats f').fetchall()); \
print('orphan legality rows:', c.execute('SELECT COUNT(*) FROM format_pokemon fp LEFT JOIN pokemon p ON p.id=fp.pokemon_id WHERE p.id IS NULL').fetchone()[0])"
```
Expected: both `Regulation M-A` and `Regulation M-B` present with non-zero counts; **orphan legality rows = 0**. Spot-check that a couple of new Megas appear in `format_pokemon` for the correct format.

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape_regulation_m_b.py vgc_pokemon.db
git commit -m "feat(data): add Regulation M-B legality and refresh M-A"
```

---

## Task 5: Ability check, golden tests, DB sanity, and sign-off

**Files:** Create `docs/champions-new-abilities.md`, `src/features/pokemon/utils/champions-dataset.test.ts`

- [ ] **Step 1: Check new-Mega abilities against `@smogon/calc`**

Run this probe (constructs each ability via `@smogon/calc` data and reports unknowns):
```bash
node --input-type=module -e "
import pkg from '@smogon/calc';
import { readFileSync } from 'node:fs';
const { Generations } = pkg;
const gen = Generations.get(9);
const megas = JSON.parse(readFileSync('scripts/data/champions_new_megas.json','utf8'));
const unknown = [...new Set(megas.map(m=>m.ability))].filter(a => !gen.abilities.get(a.replace(/ /g,'').toLowerCase()));
console.log('UNKNOWN_ABILITIES', JSON.stringify(unknown));
"
```
Expected: prints `UNKNOWN_ABILITIES [...]`. Record the list (often empty — most Megas reuse existing abilities).

- [ ] **Step 2: Document any unknown abilities**

Create `docs/champions-new-abilities.md` listing each unknown damage-affecting ability and its intended handling (model it in `damage-calc.ts`'s `getStatModifier` / `getModifiedMoveType`, or flag as a follow-up if not damage-relevant). If the list from Step 1 is empty, state that explicitly:
```markdown
# Champions new-Mega abilities vs @smogon/calc

Checked each new Mega's ability against @smogon/calc gen-9 data (Task 5, Step 1).

- Unknown abilities: <list, or "none — all reuse abilities @smogon/calc already models">
- Damage-affecting unknowns needing handling: <list, or "none">
```

- [ ] **Step 3: Write DB sanity + golden damage tests**

Create `src/features/pokemon/utils/champions-dataset.test.ts` (read the DB in node with `better-sqlite3`, already a dependency — `src/db/node.ts` uses it — which avoids the `sql.js`/wasm-in-node fiddliness):
```ts
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'

const db = new Database('vgc_pokemon.db', { readonly: true })
const one = (sql: string): any[][] => db.prepare(sql).raw().all() as any[][]

describe('Champions dataset sanity', () => {
  it('has both regulations, each non-empty', () => {
    const rows = one("SELECT name, (SELECT COUNT(*) FROM format_pokemon fp WHERE fp.format_id=f.id) FROM formats f")
    const map = Object.fromEntries(rows.map(([n, c]: any) => [n, c]))
    expect(map['Regulation M-A']).toBeGreaterThan(0)
    expect(map['Regulation M-B']).toBeGreaterThan(0)
  })
  it('every mega form has 6 base stats and >=1 ability', () => {
    const bad = one(`SELECT p.identifier FROM pokemon_forms f JOIN pokemon p ON p.id=f.pokemon_id
      WHERE f.is_mega=1 AND (p.base_hp IS NULL OR p.base_speed IS NULL
        OR (SELECT COUNT(*) FROM pokemon_abilities pa WHERE pa.pokemon_id=p.id)=0)`)
    expect(bad).toEqual([])
  })
  it('no format_pokemon row points at a missing pokemon', () => {
    const orphans = one("SELECT COUNT(*) FROM format_pokemon fp LEFT JOIN pokemon p ON p.id=fp.pokemon_id WHERE p.id IS NULL")
    expect(orphans[0][0]).toBe(0)
  })
})

describe('Champions Mega golden damage (capture refs from ChampDex/NCP during execution)', () => {
  // Fill EXP_MIN/EXP_MAX from a trusted Champions calc for a NEW Champions Mega matchup
  // using identical inputs (species, 0 SP, neutral nature, no item, the chosen move, singles).
  // Replace the placeholder species/move/% with a real new Mega once Task 2 is done.
  it.todo('a new Champions Mega matchup matches ChampDex within rounding')
})
```

(Note: this test reads `vgc_pokemon.db` via `sql.js`, already a dependency. If `initSqlJs` needs the wasm path in node, pass `{ locateFile: () => 'node_modules/sql.js/dist/sql-wasm.wasm' }`.)

- [ ] **Step 4: Turn the golden `it.todo` into a real assertion**

Pick one **new** Champions Mega, compute its damage on a fixed matchup in ChampDex/NCP (identical inputs), and replace the `it.todo` with a real `it(...)` that builds the same scenario via `mapToSmogonPokemon`/`calculateSmogonDamage` and asserts the min/max % match within ±1%. Use the Spec-1 pattern in `champions-stats-override.test.ts` as the template (look up the Mega's base stats from the DB or hardcode them from the JSON for the test).

- [ ] **Step 5: Full verification gate**

Run:
```bash
npm test
npm run type-check
npm run build
```
Expected: all green (the new sanity tests pass; the golden Mega test passes; no regressions).

- [ ] **Step 6: Mark the spec done and commit**

In `docs/superpowers/specs/2026-06-29-champions-dataset-design.md`, change `Status: draft for review` to `Status: implemented (Champions dataset) — <date>`. Then:
```bash
git add docs/champions-new-abilities.md src/features/pokemon/utils/champions-dataset.test.ts docs/superpowers/specs/2026-06-29-champions-dataset-design.md
git commit -m "test(data): Champions dataset sanity + new-Mega golden tests; mark spec done"
```

---

## Completion

After all tasks pass, use **superpowers:finishing-a-development-branch** to verify tests and integrate the `champions-dataset` branch (PR to `main`). The format-selector UI that makes Reg M-B user-selectable is the next slice.
