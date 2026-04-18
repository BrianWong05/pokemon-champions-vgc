import requests
from bs4 import BeautifulSoup
import sqlite3
import sys
import re
import os

def find_pokemon_id(cursor, name, types):
    """
    Finds the correct pokemon_id by matching name/identifier and types.
    Serebii name: 'Ninetales', Types: ['ice', 'fairy'] -> matches 'ninetales-alola'
    """
    search_name = name.lower().strip()
    
    # 1. Standardize types (ensure they are sorted for consistent matching if needed)
    types = [t.lower() for t in types]
    type1 = types[0] if len(types) > 0 else None
    type2 = types[1] if len(types) > 1 else None

    # 2. Strategy: Find all pokemon matching the base name or identifier
    # Base name might be 'Ninetales' but DB has 'Alolan Ninetales'
    # Identifier might be 'ninetales' or 'ninetales-alola'
    
    # Try exact identifier match first for things like Mega
    id_name = search_name.replace(' ', '-').replace('.', '').replace("'", "").replace(':', '')
    
    # Handle Megas
    if search_name.startswith('mega '):
        base = search_name[5:]
        id_name = f"{base.replace(' ', '-')}-mega"
    
    # Search candidates
    query = "SELECT id, identifier, type1, type2 FROM pokemon WHERE (identifier LIKE ? OR LOWER(name_en) LIKE ?)"
    cursor.execute(query, (f"{id_name}%", f"%{search_name}%"))
    candidates = cursor.fetchall()
    
    if not candidates:
        return None
    
    # Filter candidates by types
    for p_id, p_identifier, p_type1, p_type2 in candidates:
        db_types = {p_type1.lower() if p_type1 else None, p_type2.lower() if p_type2 else None}
        serebii_types = {type1, type2}
        
        # Exact match of type sets (None included)
        if db_types == serebii_types:
            return p_id

    # Fallback: if only one candidate and no types provided from Serebii (unlikely)
    if len(candidates) == 1:
        return candidates[0][0]
        
    return None

def scrape_regulation_m_a():
    url = "https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    print(f"Fetching {url}...")
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Error: Blocked by Cloudflare or server error (Status Code: {response.status_code})")
            sys.exit(1)
    except Exception as e:
        print(f"Error fetching URL: {e}")
        sys.exit(1)

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract data from rows
    # Each item: { "name": str, "types": [str, ...] }
    pokemon_data = []
    
    target_string = "Newly Useable Pokémon"
    target_element = soup.find(string=re.compile(target_string))
    
    if target_element:
        print(f"Found target element: {target_element.strip()}")
        table = target_element.find_next('table')
        if table:
            rows = table.find_all('tr')
            print(f"Processing table with {len(rows)} rows...")
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 5:
                    # Name is in cells[3]
                    name_cell = cells[3]
                    text = name_cell.get_text().strip()
                    match = re.match(r'^([A-Za-z0-9\.\-\:\' ]+)', text)
                    
                    if match:
                        name = match.group(1).strip()
                        if name and name not in ['Name', 'Type', 'No'] and not name.isdigit():
                            # Extract types from cells[4] images
                            type_cell = cells[4]
                            types = []
                            for img in type_cell.find_all('img'):
                                src = img.get('src', '')
                                # e.g. /pokedex-bw/type/fire.gif
                                type_match = re.search(r'/([^/]+)\.(gif|png)$', src)
                                if type_match:
                                    types.append(type_match.group(1).lower())
                            
                            pokemon_data.append({"name": name, "types": types})

    print(f"Extracted {len(pokemon_data)} potential Pokemon entries.")

    db_path = 'vgc_pokemon.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    format_name = 'Regulation M-A'
    cursor.execute("SELECT id FROM formats WHERE name = ?", (format_name,))
    result = cursor.fetchone()
    if result:
        format_id = result[0]
    else:
        cursor.execute("INSERT INTO formats (name, is_active) VALUES (?, 1)", (format_name,))
        format_id = cursor.lastrowid

    # Clear existing to ensure fresh start with fixed logic
    cursor.execute("DELETE FROM format_pokemon WHERE format_id = ?", (format_id,))

    success_count = 0
    failed_matches = []

    for entry in pokemon_data:
        p_id = find_pokemon_id(cursor, entry['name'], entry['types'])
        
        if p_id:
            cursor.execute("INSERT OR IGNORE INTO format_pokemon (format_id, pokemon_id) VALUES (?, ?)", (format_id, p_id))
            success_count += 1
        else:
            failed_matches.append(f"{entry['name']} ({'/'.join(entry['types'])})")

    conn.commit()
    conn.close()

    print(f"\nSummary for {format_name}:")
    print(f"Successfully linked: {success_count}")
    print(f"Failed to match: {len(failed_matches)}")
    if failed_matches:
        print(f"First 20 failures: {sorted(list(set(failed_matches)))[:20]}")

if __name__ == "__main__":
    scrape_regulation_m_a()
