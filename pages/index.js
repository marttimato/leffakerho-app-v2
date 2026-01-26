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
    async function init() {
      const local = localStorage.getItem('leffakerho_movies')
      if (local) {
        setMovies(JSON.parse(local))
        setLoading(false)
        return
      }

      const text = await fetch('/seed.txt').then(r => r.text())
      const parsed = parseSeed(text)
      const enriched = await enrichSeedMovies(parsed)

      setMovies(enriched)
      localStorage.setItem('leffakerho_movies', JSON.stringify(enriched))
      setLoading(false)
    }

    init()
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

  /* ---------- TMDB RIKASTUS (SEED) ---------- */
  async function enrichSeedMovies(seedMovies) {
    const enriched = []

    for (const m of seedMovies) {
      const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(m.title)}`)
      const data = await r.json()

      if (data.results.length > 0) {
        const best =
          data.results
            .filter(r => r.releaseYear <= m.year)
            .sort((a, b) => b.releaseYear - a.releaseYear)[0] ||
          data.results.sort((a, b) => b.releaseYear - a.releaseYear)[0]

        enriched.push({
          ...m,
          releaseYear: best.releaseYear,
        })
      } else {
        enriched.push(m)
      }
    }

    return enriched
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

  /* ---------- ADD (UI) ---------- */
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
      saveMovie({
        ...newMovie,
        releaseYear: data.results[0].releaseYear,
      })
    } else if (data.results.length > 1) {
      setPendingMovie(newMovie)
      setCandidates(data.results)
    } else {
      saveMovie(newMovie)
    }
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative overflow-hidden">
        {/* Header / Top Bar like iPhone app */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 pt-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leffakerho</h1>
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
            {movies.length}
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Add Movie Form */}
          <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Lisää uusi</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <input
                  className="w-full bg-white border-0 ring-1 ring-slate-200 rounded-xl px-4 py-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 transition-all text-base"
                  placeholder="Elokuvan nimi"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <input
                  type="date"
                  className="w-full bg-white border-0 ring-1 ring-slate-200 rounded-xl px-4 py-3 text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all text-base"
                  value={watchDate}
                  onChange={e => setWatchDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200 overflow-x-auto">
                {PEOPLE.map(p => (
                  <label
                    key={p}
                    className={`
                      flex-1 text-center py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap
                      ${person === p ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}
                    `}
                  >
                    <input
                      type="radio"
                      className="hidden" // Custom radio style
                      checked={person === p}
                      onChange={() => setPerson(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>

              <button className="w-full bg-blue-600 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-transform active:scale-[0.98]">
                Lisää listalle
              </button>
            </form>
          </section>

          {/* Candidates Modal */}
          {candidates && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">Valitse oikea elokuva</h2>
                  <button
                    onClick={() => { setCandidates(null); setPendingMovie(null); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Sulje
                  </button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {candidates.map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left p-4 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-start flex-col transition-colors"
                      onClick={() =>
                        saveMovie({
                          ...pendingMovie,
                          releaseYear: c.releaseYear,
                        })
                      }
                    >
                      <span className="font-bold text-slate-900 text-lg">{c.title}</span>
                      <span className="text-slate-500">{c.releaseYear}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="text-center py-10 text-slate-400">Ladataan elokuvia...</div>
          ) : (
            <MovieList movies={movies} />
          )}
        </div>
      </div>
    </main>
  )
}
