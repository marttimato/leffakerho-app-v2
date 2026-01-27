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
    fetchMovies()
  }, [])

  async function fetchMovies() {
    try {
      const res = await fetch('/api/movies')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      // Sort manually or rely on DB sort (DB sort added in API)
      setMovies(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /* ---------- ADD (API) ---------- */
  async function saveMovie(movie) {
    // Optimistic update
    const previous = movies
    setMovies(prev => [...prev, movie])

    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movie),
      })
      if (!res.ok) throw new Error('Failed to save')

      // Optionally re-fetch to be sure, or just trust optimistic
    } catch (err) {
      console.error(err)
      setMovies(previous) // Rollback
      alert('Tallennus epäonnistui')
    }

    setTitle('')
    setWatchDate(todayISO())
    setPerson(PEOPLE[0])
    setCandidates(null)
    setPendingMovie(null)
  }

  /* ---------- DUPLICATE CHECK ---------- */
  function confirmAdd(candidateTitle) {
    const exists = movies.some(m => m.title.toLowerCase() === candidateTitle.toLowerCase())
    if (exists) {
      return confirm(`Elokuva "${candidateTitle}" on jo listalla. Haluatko varmasti lisätä sen uudelleen?`)
    }
    return true
  }

  /* ---------- ADD (UI) ---------- */
  async function handleAdd(e) {
    e.preventDefault()

    const d = new Date(watchDate)
    const baseMovie = {
      id: `temp-${Date.now()}`, // Temporary ID, will be replaced by DB or kept unique
      title: title.trim(),
      person,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      source: 'ui',
    }

    // Check year/title from TMDB
    const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(title)}`)
    const data = await r.json()

    if (data.results.length === 1) {
      // 1 match: Use TMDB title & year
      const match = data.results[0]
      if (!confirmAdd(match.title)) return

      saveMovie({
        ...baseMovie,
        title: match.title,
        releaseYear: match.releaseYear,
      })
    } else if (data.results.length > 1) {
      // Multiple matches: Let user choose
      setPendingMovie(baseMovie)
      setCandidates(data.results)
    } else {
      // No match: Use user input
      if (!confirmAdd(baseMovie.title)) return
      saveMovie(baseMovie)
    }
  }

  /* ---------- DELETE (API) ---------- */
  async function handleDelete(id) {
    if (!confirm('Haluatko varmasti poistaa elokuvan?')) return

    const previous = movies
    setMovies(prev => prev.filter(m => m.id !== id))

    try {
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    } catch (err) {
      console.error(err)
      setMovies(previous)
      alert('Poisto epäonnistui')
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
                      onClick={() => {
                        if (!confirmAdd(c.title)) return
                        saveMovie({
                          ...pendingMovie,
                          title: c.title,
                          releaseYear: c.releaseYear,
                        })
                      }}
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
            <MovieList movies={movies} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </main>
  )
}
