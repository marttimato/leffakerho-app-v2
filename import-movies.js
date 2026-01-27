const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually read .env.local for POSTGRES_URL and TMDB_API_KEY
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const pool = new Pool({
    connectionString: env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

const TMDB_API_KEY = env.TMDB_API_KEY;

const MONTH_MAP = {
    'Tammikuu': 1, 'Helmikuu': 2, 'Maaliskuu': 3, 'Huhtikuu': 4,
    'Toukokuu': 5, 'Kesäkuu': 6, 'Heinäkuu': 7, 'Elokuu': 8,
    'Syyskuu': 9, 'Lokakuu': 10, 'Marraskuu': 11, 'Joulukuu': 12
};

const rawData = `
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
`;

async function searchTMDB(title) {
    try {
        const url = \`https://api.themoviedb.org/3/search/movie?api_key=\${TMDB_API_KEY}&query=\${encodeURIComponent(title)}&language=fi-FI\`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const first = data.results[0];
            return {
                tmdbId: first.id,
                releaseYear: first.release_date ? parseInt(first.release_date.split('-')[0]) : 0
            };
        }
    } catch (e) {
        console.error(\`Failed to search TMDB for \${title}:\`, e.message);
    }
    return { tmdbId: null, releaseYear: 0 };
}

async function run() {
    const lines = rawData.split('\\n');
    let currentYear = '';
    const moviesToInsert = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.match(/^\\d{4}$/)) {
            currentYear = line;
            continue;
        }

        // Parse format: Title (Person) - Month
        // Special case: "Leffakerho 1v: Wayne's world (Mikkis)"
        // Special case: "What's Eating Gilbert Grape (Mikkis)"
        const match = line.match(/^(.+)\\((.+)\\)\\s*-\\s*(.+)$/);
        if (match) {
            let title = match[1].trim();
            const person = match[2].trim();
            const monthStr = match[3].trim();
            const month = MONTH_MAP[monthStr] || 1;

            // Remove prefixes like "Leffakerho 1v:"
            title = title.replace(/^Leffakerho \\dv:\\s*/i, '');

            moviesToInsert.push({ title, person, year: parseInt(currentYear), month });
        } else {
            // Try simpler match if needed, but the current one is quite broad
            console.warn('Could not parse line:', line);
        }
    }

    console.log(\`Found \${moviesToInsert.length} movies. Starting TMDB lookup...\`);

    for (let i = 0; i < moviesToInsert.length; i++) {
        const m = moviesToInsert[i];
        console.log(\`[\${i + 1}/\${moviesToInsert.length}] Looking up: \${m.title}\`);
        const tmdb = await searchTMDB(m.title);
        m.tmdbId = tmdb.tmdbId;
        m.releaseYear = tmdb.releaseYear;
        // Watch date: 1st of the month
        m.watchDate = \`\${m.year}-\${String(m.month).padStart(2, '0')}-01\`;
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('Inserting into database...');

    for (const m of moviesToInsert) {
        try {
            const id = \`import-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`;
            await pool.query(
                \`INSERT INTO movies (id, title, person, year, month, watched_at, tmdb_id, release_year, source)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
                [id, m.title, m.person, m.year, m.month, m.watchDate, m.tmdbId, m.releaseYear, 'import']
            );
        } catch (e) {
            console.error(\`Failed to insert \${m.title}:\`, e.message);
        }
    }

    console.log('Finished!');
    await pool.end();
}

run();
