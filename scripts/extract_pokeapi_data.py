import pandas as pd
import requests
import sqlite3
import os
import io
import re

BASE_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"

# VGC Competitive Form Keywords
FORM_WHITELIST = [
    'wash', 'heat', 'frost', 'fan', 'mow', # Rotom
    'therian', # Landorus, Thundurus, Tornadus, Enamorus
    'rapid-strike', 'single-strike', # Urshifu
    'hearthflame', 'wellspring', 'cornerstone', # Ogerpon
    'crowned', # Zacian, Zamazenta
    'mega', 'mega-x', 'mega-y',
    'alola', 'galar', 'hisui', 'paldea',
    'dusk', 'midnight', 'dusk-mane', 'dawn-wings', # Lycanroc, Necrozma
    'bloodmoon', # Ursaluna
    'hero', # Palafin
    'roaming', # Gimmighoul
]

# 1.1 Form Localization Mapping
FORM_MAPPINGS = {
    "mega": {"en": "Mega {name}", "ja": "メガ{name}", "zh": "超級{name}"},
    "alola": {"en": "Alolan {name}", "ja": "アローラ{name}", "zh": "阿羅拉的樣子 {name}"},
    "galar": {"en": "Galarian {name}", "ja": "ガラル{name}", "zh": "伽勒爾的樣子 {name}"},
    "hisui": {"en": "Hisuian {name}", "ja": "ヒスイ{name}", "zh": "洗翠的樣子 {name}"},
    "paldea": {"en": "Paldean {name}", "ja": "パルデア{name}", "zh": "帕底亞的樣子 {name}"},
    "mega-x": {"en": "Mega {name} X", "ja": "メガ{name}X", "zh": "超級{name}X"},
    "mega-y": {"en": "Mega {name} Y", "ja": "メガ{name}Y", "zh": "超級{name}Y"},
}

def format_alternate_name(identifier, base_name, lang):
    """Formats identifier like rotom-wash to 'Rotom (Wash)'"""
    parts = identifier.split('-')
    if len(parts) < 2:
        return base_name
    
    form_part = " ".join(parts[1:]).title()
    
    # Check for special Mappings (Mega, Alola, etc.)
    suffix = "-".join(parts[1:])
    if suffix in FORM_MAPPINGS:
        return FORM_MAPPINGS[suffix][lang].format(name=base_name)
    
    # Default format: Base (Form)
    if lang == 'en':
        return f"{base_name} ({form_part})"
    elif lang == 'zh':
        return f"{base_name} ({form_part})" # Simplified for now, could add map
    else:
        return f"{base_name} ({form_part})"

def localize_form_name(row, lang):
    identifier = row['identifier']
    base_name = row[f'name_{lang}']
    is_default = row['is_default']
    
    if is_default and '-' not in identifier:
        return base_name

    return format_alternate_name(identifier, base_name, lang)

def fetch_csv(filename):
    print(f"Fetching {filename}...")
    url = f"{BASE_URL}{filename}"
    response = requests.get(url)
    response.raise_for_status()
    return pd.read_csv(io.StringIO(response.text))

def main():
    # Fetch CSVs
    pokemon_df = fetch_csv("pokemon.csv")
    pokemon_species_df = fetch_csv("pokemon_species.csv")
    pokemon_species_names_df = fetch_csv("pokemon_species_names.csv")
    pokemon_types_df = fetch_csv("pokemon_types.csv")
    types_df = fetch_csv("types.csv")
    type_names_df = fetch_csv("type_names.csv")
    pokemon_stats_df = fetch_csv("pokemon_stats.csv")
    pokemon_forms_df = fetch_csv("pokemon_forms.csv")
    type_efficacy_df = fetch_csv("type_efficacy.csv")

    # Localized Pokémon names
    names_en = pokemon_species_names_df[pokemon_species_names_df['local_language_id'] == 9][['pokemon_species_id', 'name']].rename(columns={'name': 'name_en'})
    names_ja = pokemon_species_names_df[pokemon_species_names_df['local_language_id'] == 11][['pokemon_species_id', 'name']].rename(columns={'name': 'name_ja'})
    names_zh = pokemon_species_names_df[pokemon_species_names_df['local_language_id'] == 4][['pokemon_species_id', 'name']].rename(columns={'name': 'name_zh'})

    pokemon_names_merged = names_en.merge(names_ja, on='pokemon_species_id', how='left').merge(names_zh, on='pokemon_species_id', how='left')

    # Localized Type names
    type_names_en = type_names_df[type_names_df['local_language_id'] == 9][['type_id', 'name']].rename(columns={'name': 'name_en'})
    type_names_ja = type_names_df[type_names_df['local_language_id'] == 11][['type_id', 'name']].rename(columns={'name': 'name_ja'})
    type_names_zh = type_names_df[type_names_df['local_language_id'] == 4][['type_id', 'name']].rename(columns={'name': 'name_zh'})
    
    type_names_merged = type_names_en.merge(type_names_ja, on='type_id', how='left').merge(type_names_zh, on='type_id', how='left')
    types_final_df = types_df.merge(type_names_merged, left_on='id', right_on='type_id', how='left').drop(columns=['type_id'])

    # Filtering Logic: Keep defaults OR whitelisted forms
    def is_competitive(row):
        if row['is_default']:
            return True
        identifier = row['identifier']
        return any(f"-{word}" in identifier or identifier.endswith(f"-{word}") for word in FORM_WHITELIST)

    pokemon_df = pokemon_df[pokemon_df.apply(is_competitive, axis=1)]
    print(f"Filtered to {len(pokemon_df)} competitive Pokémon/Forms.")

    # Merge pokemon with species and localized names
    pokemon_merged = pokemon_df.merge(pokemon_species_df[['id', 'identifier']], left_on='species_id', right_on='id', suffixes=('', '_species'), how='left')
    pokemon_merged = pokemon_merged.merge(pokemon_names_merged, left_on='species_id', right_on='pokemon_species_id', how='left')

    print("Constructing localized names for alternate forms...")
    pokemon_merged['name_en'] = pokemon_merged.apply(lambda row: localize_form_name(row, 'en'), axis=1)
    pokemon_merged['name_ja'] = pokemon_merged.apply(lambda row: localize_form_name(row, 'ja'), axis=1)
    pokemon_merged['name_zh'] = pokemon_merged.apply(lambda row: localize_form_name(row, 'zh'), axis=1)

    # Pivot stats
    stat_mapping = {1: 'base_hp', 2: 'base_attack', 3: 'base_defense', 4: 'base_sp_atk', 5: 'base_sp_def', 6: 'base_speed'}
    pokemon_stats_df['stat_name'] = pokemon_stats_df['stat_id'].map(stat_mapping)
    pokemon_stats_df = pokemon_stats_df.dropna(subset=['stat_name'])
    stats_pivot = pokemon_stats_df.pivot(index='pokemon_id', columns='stat_name', values='base_stat').reset_index()

    # Merge stats into pokemon
    pokemon_merged = pokemon_merged.merge(stats_pivot, left_on='id', right_on='pokemon_id', how='left')

    # Process types for pokemon
    pt_merged = pokemon_types_df.merge(types_df[['id', 'identifier']], left_on='type_id', right_on='id', how='left')
    p_type1 = pt_merged[pt_merged['slot'] == 1][['pokemon_id', 'identifier']].rename(columns={'identifier': 'type1'})
    p_type2 = pt_merged[pt_merged['slot'] == 2][['pokemon_id', 'identifier']].rename(columns={'identifier': 'type2'})
    p_types_pivot = p_type1.merge(p_type2, on='pokemon_id', how='left')
    pokemon_merged = pokemon_merged.merge(p_types_pivot, left_on='id', right_on='pokemon_id', how='left')
    
    # Final Pokémon data selection
    pokemon_final_df = pokemon_merged[[
        'id', 'identifier', 'name_en', 'name_ja', 'name_zh',
        'type1', 'type2',
        'base_hp', 'base_attack', 'base_defense', 'base_sp_atk', 'base_sp_def', 'base_speed',
        'height', 'weight', 'base_experience', 'order', 'is_default'
    ]].copy()

    # Database Creation
    db_path = "vgc_pokemon.db"
    conn = sqlite3.connect(db_path)
    
    print(f"Writing to SQLite database {db_path}...")
    conn.execute("DROP TABLE IF EXISTS pokemon;")
    conn.execute("DROP TABLE IF EXISTS types;")
    
    create_pokemon_table_sql = """
    CREATE TABLE pokemon (
        id INTEGER PRIMARY KEY,
        identifier TEXT NOT NULL,
        name_en TEXT,
        name_ja TEXT,
        name_zh TEXT,
        type1 TEXT NOT NULL,
        type2 TEXT,
        base_hp INTEGER NOT NULL,
        base_attack INTEGER NOT NULL,
        base_defense INTEGER NOT NULL,
        base_sp_atk INTEGER NOT NULL,
        base_sp_def INTEGER NOT NULL,
        base_speed INTEGER NOT NULL,
        height INTEGER,
        weight INTEGER,
        base_experience INTEGER,
        "order" INTEGER,
        is_default BOOLEAN
    );
    """
    
    create_types_table_sql = """
    CREATE TABLE types (
        id INTEGER PRIMARY KEY,
        identifier TEXT NOT NULL,
        name_en TEXT,
        name_ja TEXT,
        name_zh TEXT,
        generation_id INTEGER NOT NULL,
        damage_class_id INTEGER
    );
    """

    conn.execute(create_pokemon_table_sql)
    conn.execute(create_types_table_sql)
    
    pokemon_final_df.to_sql('pokemon', conn, if_exists='append', index=False)
    pokemon_forms_df.to_sql('pokemon_forms', conn, if_exists='replace', index=False)
    types_final_df.to_sql('types', conn, if_exists='append', index=False)
    type_efficacy_df.to_sql('type_efficacy', conn, if_exists='replace', index=False)
    
    conn.commit()
    conn.close()
    print("Data extraction and insertion complete!")

if __name__ == "__main__":
    main()
