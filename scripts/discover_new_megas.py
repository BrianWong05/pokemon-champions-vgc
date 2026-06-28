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
