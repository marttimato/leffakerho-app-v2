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
  const [watchDate, setWatchDate] = useState(todayISO())
  const [person, setPerson] = useState(PEOPLE[0])

  const [candidates, setCandidates] = useState(null)
  const [pendingMovie, setPendingMovie] = useState(null)

  /* ---------- INIT ---------- */
  useEffect(() => {
    const local = localStorage.getItem('leffakerho_movies')
    if (local) {
      const parsed = JSON.parse(local)
      enrichSeedMovies(parsed)
      return
    }

    fetch('/seed.txt')
      .then(r => r.text())
      .then(text => {
        const parsed = parseSeed(text)
        enrichSeedMovies(parsed)
      })
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
        id: `${m[1]}-${Math.random()}`,
        title: m[1].trim(),
        person: (m[2] || '').trim(),
        year: currentYear,
        month: MONTHS[m[3].toLowerCase()],
        source: 'seed',
      })
    }
    return entries
  }

  /* ---------- TMDB RIKASTUS SEEDILLE ---------- */
  async function enrichSeedMovies(seedMovies) {
    const enriched = []

    for (const m of seedMovies) {
      const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(m.title)}`)
      const data = await r.json()

      if (data.results.length === 1) {
        enriched.push({ ...m, releaseYear: data.results[0].releaseYear })
      } else {
        enriched.push(m)
      }
    }

    setMovies(enriched)
    localStorage.setItem('leffakerho_movies', JSON.stringify(enriched))
    setLoading(false)
  }

  /* ---------- SAVE ---------- */
  function saveMovie(movie) {
    const updated = [...movies, movie]
    setMovies(updated)
    localStorage.setItem('leffakerho_movies', JSON.stringify(updated))
    setTitle('')
    setWatchDate(todayISO())
    setPerson(PEOPLE[0])
    setCandidates(null)
    setPendingMovie(null)
  }

  /* ---------- ADD ---------- */
  async function handleAdd(e) {
    e.preventDefault()

    const d = new Date(watchDate)
    const newMovie = {
      id: `${title}-${Date.now()}`,
      title: title.trim(),
      person,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      source: 'ui',
    }

    const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(title)}`)
    const data = await r.json()

    if (data.results.length === 1) {
      saveMovie({ ...newMovie, releaseYear: data.results[0].releaseYear })
    } else if (data.results.length > 1) {
      setPendingMovie(newMovie)
      setCandidates(data.results)
    } else {
      saveMovie(newMovie)
    }
  }

  return (
    <main className="min-h-screen max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Leffakerho</h1>

      <form onSubmit={handleAdd} className="bg-white p-4 rounded shadow space-y-3 mb-6">
        <input className="w-full border p-2" placeholder="Elokuvan nimi" value={title} onChange={e => setTitle(e.target.value)} />
        <input type="date" className="w-full border p-2" value={watchDate} onChange={e => setWatchDate(e.target.value)} />
        <div className="flex gap-3">
          {PEOPLE.map(p => (
            <label key={p}>
              <input type="radio" checked={person === p} onChange={() => setPerson(p)} /> {p}
            </label>
          ))}
        </div>
        <button className="bg-sky-600 text-white px-4 py-2 rounded">Lisää elokuva</button>
      </form>

      {candidates && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded max-w-md w-full">
            <h2 className="font-semibold mb-2">Valitse elokuva</h2>
            {candidates.map(c => (
              <button
                key={c.id}
                className="w-full border p-2 mb-2 text-left"
                onClick={() => saveMovie({ ...pendingMovie, releaseYear: c.releaseYear })}
              >
                <b>{c.title}</b> ({c.releaseYear})
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? <div>Luetaan…</div> : <MovieList movies={movies} />}
    </main>
  )
}
