import os
import re
import requests
import psycopg2
from datetime import datetime
import uuid
import time
import sys

# Load env from .env.local
env = {}
try:
    with open('.env.local', 'r') as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                # Clean quotes
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    v = v[1:-1]
                env[k] = v
except Exception as e:
    print(f"Error loading .env.local: {e}")

DB_URL = env.get('POSTGRES_URL')
TMDB_KEY = env.get('TMDB_API_KEY')

MONTH_MAP = {
    'Tammikuu': 1, 'Helmikuu': 2, 'Maaliskuu': 3, 'Huhtikuu': 4,
    'Toukokuu': 5, 'Kesäkuu': 6, 'Heinäkuu': 7, 'Elokuu': 8,
    'Syyskuu': 9, 'Lokakuu': 10, 'Marraskuu': 11, 'Joulukuu': 12
}

raw_data = """
2021

Fast & furious (Tomi) - Tammikuu
Seven (Mikkis) - Helmikuu 
Hercules (Aino) - Helmikuu
In the name of the father (Mari) - Helmikuu
Mr. & Mrs. Smith (Tomi) - Maaliskuu
Fantastic Mr. Fox (Mikkis) -Maaliskuu
Ring (Aino) - Maaliskuu
Spirited away (Mari) - Maaliskuu
World War Z (Tomi) - Maaliskuu
Leon (Mikkis) - Maaliskuu
Harry Potter ja viisasten kivi (Aino) - Maaliskuu
Step up (Mari) - Huhtikuu
Fury (Tomi) - Huhtikuu
The Usual Suspects (Mikkis) - Huhtikuu
The Hitman’s Bodyguard (Aino) - Huhtikuu
Rocketman (Mari) - Huhtikuu
Kunniattomat paskiaiset (Tomi) - Huhtikuu
The Budapest Grand Hotel (Mikkis) - Toukokuu
Orpokoti (Aino) - Toukokuu
Call Me by Your Name (Mari) - Toukokuu
Rango (Tomi) - Toukokuu
Moonlight Kingdom (Mikkis) - Kesäkuu
The Prestige (Aino) - Kesäkuu
Gladiator (Mari) - Kesäkuu
"42" (Tomi) - Heinäkuu
Top Secret! (Mikkis) - Elokuu
Teräsleidit (Aino) - Elokuu
Suicide Squad 2 (Mari) - Syyskuu
John Wick (Tomi) - Syyskuu
Warrior (Mikkis) - Lokakuu
Red notice (Aino) - Marraskuu
Rita Hayworth - avain pakoon (Mari) - Marraskuu
Austin Powers: Agentti joka tuuppasi minut (Tomi) - Marraskuu
Snatch - hävyttömät (Mikkis) - Marraskuu
It Chapter Two (Aino) - Marraskuu
Last Christmas (Mari) - Joulukuu
The Terminal (Tomi) - Joulukuu 
Klaus (Mikkis) - Joulukuu
Kaunotar ja hirviö: lumottu joulu (Aino) - Joulukuu

2022

Schindlerin lista (Mari) - Tammikuu
Eddie the Eagle (Tomi) - Tammikuu
Leffakerho 1v: Wayne’s world (Mikkis) - Tammikuu
Forrest Gump (Aino) - Helmikuu
Encanto (Mari) - Helmikuu
The Little Things (Tomi) - Helmikuu
Avatar (Mikkis) - Helmikuu
West side story (Aino) - Maaliskuu
LEGO Batman elokuva (Mari) - Maaliskuu
The Magnificent Seven (Tomi) - Maaliskuu
What We Do in the Shadows (Mikkis) - Maaliskuu
The Tourist (Aino) - Huhtikuu
Notting Hill (Mari) - Toukokuu
Deepwater Horizon (Tomi) - Kesäkuu
Top Gun - lentäjistä parhaat (Mikkis) - Kesäkuu
Ihmeotukset: Dumbledoren salaisuudet (Aino)- Kesäkuu
Tikun ja Takun pelastuspartio (Mari) - Kesäkuu
Full Metal Jacket (Tomi) - Heinäkuu
Kätyrit - Grun tarina (Mikkis) - Elokuu
Hitman’s Wife’s Bodyguard (Aino) - Syyskuu
The Doors (Mari) - Syyskuu
Studio 666 (Tomi) - Syyskuu
Dog (Mikkis) - Syyskuu
The Horse Whisperer (Aino) - Syyskuu
Coda (Mari) - Syyskuu
O brother, where art you? (Tomi) - Lokakuu
Elvis (Mikkis) - Lokakuu
The trial of the Chicago 7 (Aino) - Lokakuu
The Night Before Christmas (Mari) - Lokakuu
Halloween (Tomi) - Lokakuu
Suon villi laulu (Mikkis) - Marraskuu
Black panther (Finnkino IMAX) - Marraskuu 
Bullet Train (Aino) - Joulukuu
Spirited (Mari) - Joulukuu
Länsirintamalta ei mitään uutta (Tomi) - Joulukuu
What’s Eating Gilbert Grape (Mikkis) - Joulukuu
The Hypnotist (Aino) - Joulukuu

2023

Zoolander (Mari) - Tammikuu
The Truman Show (Tomi) - Tammikuu
Everything Everywhere All at Once (Mikkis) - Tammikuu
Paras ystäväni Anne Frank (Aino) - Tammikuu
Hair (Mari) - Tammikuu
Whiplash (Tomi) - Tammikuu
Leffakerho 2v: The Menu (Mikkis) - Helmikuu
Up - kohti korkeuksia (Aino) - Helmikuu
Trainspotting (Mari) - Maaliskuu 
Team America: World Police (Tomi) - Maaliskuu
The Batman (Finnkino IMAX ennakkonäytös) - Maaliskuu
Tetris (Mikkis) - Huhtikuu
Kerro minulle jotain hyvää (Aino) - Huhtikuu
Manchester by the Sea (Mari) - Huhtikuu 
Tenacious D: Maailman paras rokkibändi (Tomi) - Huhtikuu
The Banshees of Inisherin (Mikkis) - Toukokuu
Ylpeys ja ennakkoluulo (Aino) - Toukokuu
DodgeBall: A True Underdog Story (Mari) - Toukokuu
The guardians of the galaxy vol. 3 (Finnkino IMAX) - Toukokuu
8 Mile (Tomi) - Toukokuu
Spider-Man: Kohti Hämähäkkiversumia (Mikkis) - Kesäkuu
 E.T. (Aino) - Kesäkuu
Airplane! (Mari) - Kesäkuu 
Deadpool (Tomi) - Heinäkuu
Naapurini Totoro (Mikkis) - Heinäkuu
The Greatest Showman (Aino) - Heinäkuu
Dirty Dancing (Mari) - Elokuu
Pulp Fiction (Tomi) - Elokuu
M3gan (Mikkis) - Lokakuu
The Rocky Horror Picture Show (Aino) - Marraskuu
Kuudes aisti (Mari) - Marraskuu
The Gentlemen (Tomi) - Marraskuu
Triangle of Sadness (Mikkis) - Joulukuu
The Grinch (Aino) - Joulukuu
Violent Night (Mari) - Joulukuu

2024

The Covenant (Tomi) - Tammikuu
Leave the world behind (Mikkis) - Tammikuu
Leffakerho 3v: The Family Plan (Aino) - Tammikuu
Paddington (Mari) - Helmikuu
The Highwaymen (Tomi) - Maaliskuu
Guillermo del Toron Pinokkio (Mikkis) - Maaliskuu
Sharper (Aino) - Maaliskuu
Will Hunting - syntynyt neroksi - (Mari) Huhtikuu
Road House (Tomi) - Huhtikuu
Interstellar (Mari) - Toukokuu
Yhdet häät ja muutama pankkiryöstö (Aino) - Toukokuu
Saksikäsi Edward (Mikkis) - Toukokuu
Moneyball (Tomi) - Toukokuu
Parasite (Mikkis) - Heinäkuu
Extremely Wicked, Shockingly Evil, and Vile (Aino) - Heinäkuu
High school musical (Mari) - Elokuu
Hiljainen paikka (Tomi) - Elokuu
Yksi lensi yli käenpesän (Mikkis) - Syyskuu
Gremlins (Aino) - Syyskuu
Tähtiin kirjoitettu virhe (Mari) - Lokakuu
Wolfs (Tomi) - Lokakuu
Beetlejuice (Mikkis) - Lokakuu
The Happiness of the Katakuris (Aino) - Marraskuu
The Sound of Music (Mari) - Marraskuu
The Mist (Tomi) - Marraskuu
The Imitation Game (Mikkis) - Joulukuu
Elf (Aino) - Joulukuu
Hohto (Mari) - Joulukuu
Red One (Tomi) - Joulukuu

2025

Wallace ja Gromit: Kosto kynittävänä (Mikkis) - Tammikuu
Back in Action (Aino) - Tammikuu
Kuolleiden runoilijoiden seura (Mari) - Tammikuu
Weird: The Al Yankovic Story (Tomi) - Helmikuu
Gifted (Mikkis) - Helmikuu
Leijonakuningas (Aino) - Maaliskuu
Labyrinth (Mari) - Maaliskuu
Anchorman: The Legend of Ron Burgundy (Tomi) - Huhtikuu
Ohjus (Mikkis) - Toukokuu
Pahat pojat (Aino) - Toukokuu
Palm Springs (Mari) - Kesäkuu
Uutisankkuri - legendan paluu (Tomi) - Heinäkuu
Isle of Dogs (Mikkis) - Heinäkuu
Muumipeikko ja pyrstötähti (Aino) - Elokuu
Tim Burton’s Corpse Bride (Mari) - Syyskuu
Kraven - The Hunter (Tomi) - Lokakuu 
The Goomies (Mikkis) - Lokakuu
Yksin kotona (Aino) - Joulukuu
Good bye Lenin (Mari) - Joulukuu

2026

Kiinni jäit!? (Tomi) - Tammikuu
Bugonia (Mikkis) - Tammikuu
Pikku naisia (Aino)- Tammikuu
Billy Elliot (Mari) - Tammikuu
"""

def search_tmdb(title):
    try:
        url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_KEY}&query={title}&language=fi-FI"
        r = requests.get(url)
        data = r.json()
        if data.get('results'):
            first = data['results'][0]
            return {
                'tmdb_id': first['id'],
                'release_year': int(first['release_date'].split('-')[0]) if first.get('release_date') else 0
            }
    except Exception as e:
        print(f"Error searching TMDB for {title}: {e}")
    return {'tmdb_id': None, 'release_year': 0}

def run():
    lines = raw_data.split('\n')
    current_year = ""
    movies_to_insert = []

    for line in lines:
        line = line.strip()
        if not line: continue
        
        if re.match(r'^\d{4}$', line):
            current_year = line
            continue
            
        # Format: Title (Person) - Month
        match = re.match(r'^(.+)\((.+)\)\s*-\s*(.+)$', line)
        if match:
            title = match.group(1).strip()
            person = match.group(2).strip()
            month_str = match.group(3).strip()
            month = MONTH_MAP.get(month_str, 1)
            
            # Clean title
            title = re.sub(r'^Leffakerho \dv:\s*', '', title, flags=re.IGNORECASE)
            title = re.sub(r'\s*\(Finnkino IMAX.*\)', '', title, flags=re.IGNORECASE)
            title = re.sub(r'\s*\(ennakkonäytös.*\)', '', title, flags=re.IGNORECASE)
            
            movies_to_insert.append({
                'title': title,
                'person': person,
                'year': int(current_year),
                'month': month
            })

    print(f"Found {len(movies_to_insert)} movies. Starting TMDB lookup...")
    sys.stdout.flush()
    
    for i, m in enumerate(movies_to_insert):
        print(f"[{i+1}/{len(movies_to_insert)}] Looking up: {m['title']}")
        sys.stdout.flush()
        tmdb = search_tmdb(m['title'])
        m['tmdb_id'] = tmdb['tmdb_id']
        m['release_year'] = tmdb['release_year']
        m['watch_date'] = f"{m['year']}-{m['month']:02d}-01"
        time.sleep(0.05)

    print("Connecting to database...")
    sys.stdout.flush()
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("Inserting into database...")
        sys.stdout.flush()
        
        for m in movies_to_insert:
            id_val = f"import-{int(time.time())}-{uuid.uuid4().hex[:5]}"
            try:
                cur.execute(
                    "INSERT INTO movies (id, title, person, year, month, watched_at, tmdb_id, release_year, source) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (id_val, m['title'], m['person'], m['year'], m['month'], m['watch_date'], m['tmdb_id'], m['release_year'], 'import')
                )
            except Exception as e:
                print(f"Failed to insert {m['title']}: {e}")
                conn.rollback()
            else:
                conn.commit()
                
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database error: {e}")
        sys.stdout.flush()

    print("Finished!")
    sys.stdout.flush()

if __name__ == "__main__":
    run()
