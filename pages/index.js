import { useEffect, useState } from 'react'
import MovieList from '../components/MovieList'

const PEOPLE = ['Aino','Mari','Mikkis','Tomi']

export default function Home() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [watchDate, setWatchDate] = useState('')
  const [person, setPerson] = useState(PEOPLE[0])
  const [lookupInProgress, setLookupInProgress] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
  if (typeof window === 'undefined') return
    // Lataa seed-tiedosto ja paikalliset tallenteet
    async function init() {
      try {
        const local = localStorage.getItem('leffakerho_movies')
        if (local) {
          setMovies(JSON.parse(local))
          setLoading(false)
          return
        }
        // Jos ei localStorage, lue public/seed.txt ja jäsennä
        const res = await fetch('/seed.txt')
        if (!res.ok) {
          setMovies([])
          setLoading(false)
          return
        }
        const txt = await res.text()
        const parsed = parseSeed(txt)
        setMovies(parsed)
        localStorage.setItem('leffakerho_movies', JSON.stringify(parsed))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  function parseSeed(text) {
    // Yksinkertainen parser: etsii rivit joissa on muotoa "Title (Person) - Month"
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const entries = []
    for (const line of lines) {
      // estä otsikkorivit kuten "2022" "2023"
      if (/^\d{4}$/.test(line)) continue
      // etsi pattern "Title (Person) - Month" tai "Title (Person) - Month"
      // monissa riveissä on "Title (Person) - Month"
      const m = line.match(/^(.*?)(?:\s*\(([^)]+)\))?\s*-\s*(.*)$/)
      if (m) {
        const title = m[1].trim()
        const person = (m[2] || '').trim() || null
        const month = (m[3] || '').trim()
        // arvioi katselupäivä vain kuukausi-syntaktisesti: käytetään YYYY tilalla tuntematon vuosi
        entries.push({
          id: `${title}-${person || 'unknown'}-${Date.now()}-${Math.random()}`,

          title,
          year: '', // ei ollut luotettavaa vuotta seedissä
          watchDate: month || '',
          person: person || '',
          createdAt: new Date().toISOString()
        })
      } else {
        // fallback: käytä kokonaisriviä nimenä
        entries.push({
          id: `${line}-${entries.length}`,
          title: line,
          year: '',
          watchDate: '',
          person: '',
          createdAt: new Date().toISOString()
        })
      }
    }
    return entries
  }

  function persist(newList) {
    setMovies(newList)
    localStorage.setItem('leffakerho_movies', JSON.stringify(newList))
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Anna elokuvan nimi.')
      return
    }
    const newEntry = {
      id: `${title}-${Date.now()}`,
      title: title.trim(),
      year: year.trim(),
      watchDate: watchDate || '',
      person,
      createdAt: new Date().toISOString()
    }
    // jos vuosi puuttuu, yritä hakea serverless-API:lla (OMDb) — toimii kun OMDB_API_KEY on asetettu Vercelissä
    if (!newEntry.year) {
      setLookupInProgress(true)
      try {
        const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(newEntry.title)}`)
        if (r.ok) {
          const data = await r.json()
          if (data && data.year) newEntry.year = data.year
        }
      } catch (err) {
        console.warn('Vuoden haku epäonnistui', err)
      } finally {
        setLookupInProgress(false)
      }
    }
    const updated = [newEntry, ...movies]
    persist(updated)
    setTitle(''); setYear(''); setWatchDate(''); setPerson(PEOPLE[0])
  }

  return (
    <main className="min-h-screen max-w-xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Leffakerho</h1>
        <p className="text-sm text-gray-600">Selaa tallennettuja elokuvia ja lisää uusia.</p>
      </header>

      <section className="mb-6 bg-white shadow rounded p-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm">Elokuvan nimi</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Julkaisuvuosi (valinnainen)</label>
              <input value={year} onChange={e => setYear(e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm">Katselupäivämäärä (valinnainen)</label>
              <input value={watchDate} onChange={e => setWatchDate(e.target.value)} placeholder="esim. Tammikuu 2023 tai 2023-01-15" className="w-full border rounded p-2" />
            </div>
          </div>

          <div>
            <span className="block text-sm mb-1">Kenen vuoro</span>
            <div className="flex gap-2">
              {PEOPLE.map(p => (
                <label key={p} className="flex items-center gap-2">
                  <input type="radio" checked={person === p} onChange={() => setPerson(p)} />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex items-center gap-3">
            <button disabled={lookupInProgress} className="bg-sky-600 text-white px-4 py-2 rounded">
              {lookupInProgress ? 'Haetaan...' : 'Lisää elokuva'}
            </button>
            <button type="button" onClick={() => {
              // nollaa localStorage ja lataa seed uudelleen
              localStorage.removeItem('leffakerho_movies')
              location.reload()
            }} className="text-sm text-gray-600">Palauta seed</button>
          </div>
        </form>
      </section>

      <section>
        {loading ? (
          <div>Luetaan...</div>
        ) : (
          <MovieList movies={movies} onDelete={(id) => {
            const filtered = movies.filter(m => m.id !== id)
            persist(filtered)
          }} />
        )}
      </section>

      <footer className="mt-8 text-xs text-gray-500">
        Alkuperäinen seed-lista on ladattu tiedostosta <code>/public/seed.txt</code>. Lähde: :contentReference[oaicite:2]{index=2}
      </footer>
    </main>
	export async function getServerSideProps() {
  return {
    props: {}
  }
}

  )
}
