import { useEffect, useState } from 'react'
import MovieList from '../components/MovieList'

const PEOPLE = ['Aino', 'Mari', 'Mikkis', 'Tomi']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Home() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [watchDate, setWatchDate] = useState(todayISO())
  const [person, setPerson] = useState(PEOPLE[0])

  const [lookupInProgress, setLookupInProgress] = useState(false)
  const [error, setError] = useState('')

  /* ---------- API ---------- */

  async function fetchReleaseYear(title) {
    try {
      const r = await fetch(
        `/api/fetch-year?title=${encodeURIComponent(title)}`
      )
      if (!r.ok) return null
      const data = await r.json()
      return data?.year || null
    } catch {
      return null
    }
  }

  /* ---------- SEED LOAD ---------- */

  useEffect(() => {
    if (typeof window === 'undefined') return

    const local = localStorage.getItem('leffakerho_movies')
    if (local) {
      const parsed = JSON.parse(local)
      setMovies(parsed)
      setLoading(false)
      enrichSeedMovies(parsed)
      return
    }

    fetch('/seed.txt')
      .then(r => r.text())
      .then(text => {
        const parsed = parseSeed(text)
        setMovies(parsed)
        localStorage.setItem('leffakerho_movies', JSON.stringify(parsed))
        enrichSeedMovies(parsed)
      })
      .finally(() => setLoading(false))
  }, [])

  /* ---------- SEED PARSER ---------- */

  function parseSeed(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const entries = []
    let currentYear = null

    const MONTHS = {
      tammikuu: 1, helmikuu: 2, maaliskuu: 3, huhtikuu: 4,
      toukokuu: 5, kesäkuu: 6, heinäkuu: 7, elokuu: 8,
      syyskuu: 9, lokakuu: 10, marraskuu: 11, joulukuu: 12,
    }

    for (const line of lines) {
      if (/^\d{4}$/.test(line)) {
        currentYear = Number(line)
        continue
      }
      if (!currentYear) continue

      const cleaned = line.replace(/^\d+\.\s*/, '')
      const m = cleaned.match(
        /^(.*?)(?:\s*\(([^)]+)\))?\s*-\s*(Tammikuu|Helmikuu|Maaliskuu|Huhtikuu|Toukokuu|Kesäkuu|Heinäkuu|Elokuu|Syyskuu|Lokakuu|Marraskuu|Joulukuu)$/i
      )
      if (!m) continue

      entries.push({
        id: `${m[1]}-${currentYear}-${Math.random()}`,
        title: m[1].trim(),
        person: (m[2] || '').trim(),
        year: currentYear,
        month: MONTHS[m[3].toLowerCase()],
        source: 'seed',
      })
    }
    return entries
  }

  /* ---------- OMDB RIKASTUS (KORJATTU) ---------- */

  async function enrichSeedMovies(baseMovies) {
    const enriched = await Promise.all(
      baseMovies.map(async m => {
        if (m.source === 'seed' && !m.releaseYear) {
          const y = await fetchReleaseYear(m.title)
          if (y) return { ...m, releaseYear: y }
        }
        return m
      })
    )

    setMovies(enriched)
    localStorage.setItem('leffakerho_movies', JSON.stringify(enriched))
  }

  /* ---------- ADD MOVIE ---------- */

  function persist(list) {
    setMovies(list)
    localStorage.setItem('leffakerho_movies', JSON.stringify(list))
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Anna elokuvan nimi.')
      return
    }

    const d = new Date(watchDate)

    const newEntry = {
      id: `${title}-${Date.now()}`,
      title: title.trim(),
      person,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      source: 'ui',
    }

    if (releaseYear) {
      newEntry.releaseYear = releaseYear
    } else {
      setLookupInProgress(true)
      const y = await fetchReleaseYear(title.trim())
      if (y) newEntry.releaseYear = y
      setLookupInProgress(false)
    }

    persist([...movies, newEntry])
    setTitle('')
    setReleaseYear('')
    setWatchDate(todayISO())
    setPerson(PEOPLE[0])
  }

  /* ---------- RENDER ---------- */

  return (
    <main className="min-h-screen max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Leffakerho</h1>

      <form onSubmit={handleAdd} className="bg-white p-4 rounded shadow space-y-3 mb-8">
        <input className="w-full border p-2" placeholder="Elokuvan nimi" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="w-full border p-2" placeholder="Julkaisuvuosi (valinnainen)" value={releaseYear} onChange={e => setReleaseYear(e.target.value)} />
        <input type="date" className="w-full border p-2" value={watchDate} onChange={e => setWatchDate(e.target.value)} />

        <div className="flex gap-3">
          {PEOPLE.map(p => (
            <label key={p}>
              <input type="radio" checked={person === p} onChange={() => setPerson(p)} /> {p}
            </label>
          ))}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button disabled={lookupInProgress} className="bg-sky-600 text-white px-4 py-2 rounded">
          Lisää elokuva
        </button>
      </form>

      {loading ? <div>Luetaan...</div> : <MovieList movies={movies} onDelete={id => persist(movies.filter(m => m.id !== id))} />}
    </main>
  )
}
