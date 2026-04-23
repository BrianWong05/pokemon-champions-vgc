import requests
from bs4 import BeautifulSoup
import sqlite3
import sys
import re
import os

def find_pokemon_ids(cursor, name, types):
    """
    Finds all relevant pokemon_ids (base and alternate forms) by matching species and types.
    """
    search_name = name.lower().strip()
    types = [t.lower() for t in types]
    type1 = types[0] if len(types) > 0 else None
    type2 = types[1] if len(types) > 1 else None

    # Try to find matching identifiers or names
    id_name = search_name.replace(' ', '-').replace('.', '').replace("'", "").replace(':', '')
    
    # Handle Megas
    if search_name.startswith('mega '):
        base = search_name[5:]
        id_name = f"{base.replace(' ', '-')}-mega"

    # 1. Find the primary matching pokemon
    query = "SELECT id, identifier FROM pokemon WHERE (identifier = ? OR LOWER(name_en) = ? OR identifier LIKE ?)"
    cursor.execute(query, (id_name, search_name, f"{id_name}-%"))
    matches = cursor.fetchall()
    
    if not matches:
        return []

    # 2. Get the base identifier (e.g., 'rotom' from 'rotom-wash')
    # Strategy: find the shortest identifier in the matches as a proxy for the base
    base_identifier = min([m[1] for m in matches], key=len).split('-')[0]
    
    # 3. Find all pokemon in our DB that share this base identifier
    query = "SELECT id, type1, type2 FROM pokemon WHERE identifier = ? OR identifier LIKE ?"
    cursor.execute(query, (base_identifier, f"{base_identifier}-%"))
    all_variants = cursor.fetchall()
    
    serebii_types = {type1, type2}
    final_ids = []
    
    for p_id, p_type1, p_type2 in all_variants:
        db_types = {p_type1.lower() if p_type1 else None, p_type2.lower() if p_type2 else None}
        
        # If types match Serebii exactly, it's a definite match
        if db_types == serebii_types:
            final_ids.append(p_id)
        
    # If the search name matches the base species name exactly, 
    # we want to include ALL whitelisted variants regardless of type match 
    # (since VGC often allows all forms if the species is allowed, 
    # and Serebii might not list every appliance separately).
    if id_name == base_identifier or search_name == base_identifier:
        final_ids.extend([v[0] for v in all_variants])

    # Final fallback: take the first match if still nothing
    if not final_ids and matches:
        final_ids = [matches[0][0]]
        
    return list(set(final_ids))

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
    
    # Extract data from ALL tables on the page that look like Pokémon lists
    pokemon_data = []
    
    tables = soup.find_all('table', class_=['dextab', 'tab'])
    print(f"Found {len(tables)} tables to process...")
    
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            # Serebii dex tables usually have: No. | Pic | Name | Type | ...
            if len(cells) >= 5:
                # Name is usually in cells[3] or cells[2] depending on table
                # We'll check cells[2] and cells[3] for valid names
                for cell_idx in [2, 3]:
                    name_cell = cells[cell_idx]
                    text = name_cell.get_text().strip()
                    # Check for valid name characters
                    match = re.match(r'^([A-Za-z0-9\.\-\:\' ]+)', text)
                    
                    if match:
                        name = match.group(1).strip()
                        # Exclude headers and numbers
                        if name and name not in ['Name', 'Type', 'No'] and not name.isdigit() and len(name) > 2:
                            # Extract types from the NEXT cell relative to name
                            type_cell = cells[cell_idx + 1]
                            types = []
                            for img in type_cell.find_all('img'):
                                src = img.get('src', '')
                                type_match = re.search(r'/([^/]+)\.(gif|png)$', src)
                                if type_match:
                                    types.append(type_match.group(1).lower())
                            
                            if types: # Only add if we found types
                                pokemon_data.append({"name": name, "types": types})
                                break # Found name in this row, move to next row

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
        p_ids = find_pokemon_ids(cursor, entry['name'], entry['types'])
        
        if p_ids:
            for p_id in p_ids:
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
