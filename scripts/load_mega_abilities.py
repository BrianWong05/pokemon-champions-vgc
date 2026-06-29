"""Load abilities for the M-B-legal Champions Megas that were missing them.

These are the only ability-less Megas that are actually legal (all in Reg M-B); the other
~14 ability-less Mega rows are legal in no format and are left as-is. Ability values are the
Mega-specific entries from the NCP VGC damage calculator (MIT-licensed; ability assignments
are factual game data), cross-checked to be NCP's per-Mega values (not base-species fallbacks).
"""
import sqlite3

# name_en -> ability (NCP Mega-specific)
MEGA_ABILITIES = {
    "Mega Barbaracle": "Tough Claws",
    "Mega Dragalge": "Regenerator",
    "Mega Eelektross": "Eelevate",
    "Mega Falinks": "Defiant",
    "Mega Malamar": "Contrary",
    "Mega Pyroar": "Fire Mane",
    "Mega Raichu X": "Electric Surge",
    "Mega Raichu Y": "No Guard",
    "Mega Scolipede": "Shell Armor",
    "Mega Scrafty": "Intimidate",
    "Mega Staraptor": "Contrary",
}


def get_or_create_ability(cur, name):
    ident = name.lower().replace(" ", "-")
    cur.execute("SELECT id FROM abilities WHERE identifier = ? OR LOWER(name_en) = ?", (ident, name.lower()))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM abilities")
    new_id = cur.fetchone()[0]
    cur.execute("INSERT INTO abilities (id, identifier, name_en) VALUES (?, ?, ?)", (new_id, ident, name))
    print(f"  + added new ability: {name} (id {new_id})")
    return new_id


def main():
    conn = sqlite3.connect("vgc_pokemon.db")
    cur = conn.cursor()
    linked = 0
    for name, ability in MEGA_ABILITIES.items():
        cur.execute("SELECT id FROM pokemon WHERE name_en = ?", (name,))
        prow = cur.fetchone()
        if not prow:
            print(f"  ! no pokemon row for {name!r} — skipped")
            continue
        pid = prow[0]
        ab_id = get_or_create_ability(cur, ability)
        cur.execute(
            "INSERT OR IGNORE INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot) VALUES (?, ?, 0, 1)",
            (pid, ab_id),
        )
        print(f"  {name} -> {ability}")
        linked += 1
    conn.commit()
    conn.close()
    print(f"Linked abilities for {linked}/{len(MEGA_ABILITIES)} Megas.")


if __name__ == "__main__":
    main()
