import requests
from bs4 import BeautifulSoup
import sqlite3
import sys
import re

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
    
    pokemon_names = set()
    
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
                if len(cells) >= 4:
                    # Based on debug: index 3 (4th cell) contains the name
                    name_cell = cells[3]
                    # Try to get English name (Japanese follows it)
                    # Serebii often has "Venusaurフシギバナ"
                    # We can use regex to split English from Japanese
                    text = name_cell.get_text().strip()
                    # Keep only English part (A-Z, a-z, spaces, dots, dashes)
                    match = re.match(r'^([A-Za-z0-9\.\-\:\' ]+)', text)
                    if match:
                        name = match.group(1).strip()
                        if name and name not in ['Name', 'Type', 'No'] and not name.isdigit():
                            pokemon_names.add(name)

    print(f"Extracted {len(pokemon_names)} potential Pokemon names.")

    db_path = 'vgc_pokemon.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    format_name = 'Regulation M-A'
    # Safe initialization
    cursor.execute("SELECT id FROM formats WHERE name = ?", (format_name,))
    result = cursor.fetchone()
    if result:
        format_id = result[0]
    else:
        cursor.execute("INSERT INTO formats (name, is_active) VALUES (?, 1)", (format_name,))
        format_id = cursor.lastrowid

    success_count = 0
    failed_matches = []

    for name in sorted(list(pokemon_names)):
        search_name = name.lower().strip()
        
        # 1. Exact match name_en
        cursor.execute("SELECT id FROM pokemon WHERE LOWER(name_en) = ?", (search_name,))
        result = cursor.fetchone()
        
        # 2. Match identifier
        if not result:
            id_name = search_name.replace(' ', '-').replace('.', '').replace("'", "").replace(':', '')
            cursor.execute("SELECT id FROM pokemon WHERE identifier = ?", (id_name,))
            result = cursor.fetchone()

        # 3. Handle Mega
        if not result:
            if search_name.startswith('mega '):
                # Charizard Mega X -> charizard-mega-x
                if ' mega ' in search_name:
                    parts = search_name.split(' mega ')
                    id_name = f"{parts[0].replace(' ', '-')}-mega-{parts[1].replace(' ', '-')}"
                else:
                    base_name = search_name[5:].replace(' ', '-').replace('.', '').replace("'", "")
                    id_name = f"{base_name}-mega"
                cursor.execute("SELECT id FROM pokemon WHERE identifier = ?", (id_name,))
                result = cursor.fetchone()
            elif 'mega' in search_name:
                id_name = search_name.replace(' ', '-')
                cursor.execute("SELECT id FROM pokemon WHERE identifier = ?", (id_name,))
                result = cursor.fetchone()

        if result:
            pokemon_id = result[0]
            cursor.execute("INSERT OR IGNORE INTO format_pokemon (format_id, pokemon_id) VALUES (?, ?)", (format_id, pokemon_id))
            success_count += 1
        else:
            failed_matches.append(name)

    conn.commit()
    conn.close()

    print(f"\nSummary for {format_name}:")
    print(f"Successfully linked: {success_count}")
    print(f"Failed to match: {len(failed_matches)}")
    if failed_matches and success_count > 0:
        print("First 20 failures:", sorted(list(set(failed_matches)))[:20])

if __name__ == "__main__":
    scrape_regulation_m_a()
