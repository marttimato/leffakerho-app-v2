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
  const [selectedMovieId, setSelectedMovieId] = useState(null)
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

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
      watchDate: watchDate,
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
        tmdbId: match.id,
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

  /* ---------- DETAILS (API) ---------- */
  async function handleSelectMovie(movie) {
    if (!movie.tmdbId) {
      alert('Elokuvalla ei ole TMDB-tunnistetta, tietoja ei voida hakea.')
      return
    }

    setSelectedMovieId(movie.id)
    setLoadingDetails(true)
    setDetails(null)

    try {
      const res = await fetch(`/api/movies/details?id=${movie.tmdbId}`)
      if (!res.ok) throw new Error('Failed to fetch details')
      const data = await res.json()
      setDetails(data)
    } catch (err) {
      console.error(err)
      alert('Tietojen haku epäonnistui')
    } finally {
      setLoadingDetails(false)
    }
  }

  /* ---------- SCROLL LOCK ---------- */
  useEffect(() => {
    if (selectedMovieId || candidates) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [selectedMovieId, candidates])

  return (
    <main className="min-h-screen pb-20 selection:bg-blue-500/30">
      <div className="max-w-md mx-auto min-h-screen bg-slate-950/20 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden border-x border-white/5">
        {/* Header / Top Bar like iPhone app */}
        <div className="sticky top-0 z-30 glass border-b border-white/5 p-4 pt-12 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">Leffakerho</h1>
          <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            {movies.length} <span className="ml-1 opacity-50 font-normal">leffaa</span>
          </div>
        </div>

        <div className="p-4 space-y-8">
          {/* Add Movie Form */}
          <section className="glass-card p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-4 px-1">Lisää uusi elämys</h2>
            <form onSubmit={handleAdd} className="space-y-4 relative z-10">
              <div className="relative">
                <input
                  className="w-full glass-input rounded-2xl px-4 py-4 placeholder-slate-500 text-white transition-all ring-0 border-white/10 focus:border-blue-500/50"
                  placeholder="Elokuvan nimi..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <input
                  type="date"
                  className="w-full glass-input rounded-2xl px-4 py-3.5 text-slate-300 transition-all border-white/10 focus:border-blue-500/50 [color-scheme:dark]"
                  value={watchDate}
                  onChange={e => setWatchDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                {PEOPLE.map(p => (
                  <label
                    key={p}
                    className={`
                      text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate
                      ${person === p ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                    `}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      checked={person === p}
                      onChange={() => setPerson(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-950/20 transition-all border border-blue-400/20 group-hover:shadow-blue-500/10">
                Lisää listalle
              </button>
            </form>
          </section>

          {/* List */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">Ladataan elämyksiä...</div>
            </div>
          ) : (
            <MovieList movies={movies} onDelete={handleDelete} onSelect={handleSelectMovie} />
          )}
        </div>
      </div>

      {/* MODALS - Moved outside max-w-md to escape backdrop-blur positioning context */}

      {/* Candidates Modal */}
      {candidates && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-lg tracking-tight text-white">Valitse oikea elokuva</h2>
              <button
                onClick={() => { setCandidates(null); setPendingMovie(null); }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {candidates.map(c => (
                <button
                  key={c.id}
                  className="w-full text-left p-5 rounded-2xl hover:bg-white/5 border border-white/5 hover:border-blue-500/30 flex items-start flex-col transition-all group"
                  onClick={() => {
                    if (!confirmAdd(c.title)) return
                    saveMovie({
                      ...pendingMovie,
                      title: c.title,
                      releaseYear: c.releaseYear,
                      tmdbId: c.id,
                    })
                  }}
                >
                  <span className="font-bold text-slate-100 text-lg group-hover:text-blue-400 transition-colors">{c.title}</span>
                  <span className="text-slate-500 font-medium">{c.releaseYear}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMovieId && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-3xl h-full sm:h-auto sm:max-h-[80vh] sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-y-auto relative animate-in zoom-in-95 duration-500 border border-white/10 group">
            {/* Close Button */}
            <button
              onClick={() => { setSelectedMovieId(null); setDetails(null); }}
              className="absolute top-6 right-6 z-30 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10 scale-90 hover:scale-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {loadingDetails ? (
              <div className="p-40 text-center">
                <div className="inline-block w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
                <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">Noudetaan tietoja...</div>
              </div>
            ) : details ? (
              <div className="flex flex-col">
                {/* Backdrop */}
                <div className="relative aspect-video sm:aspect-[21/9] w-full bg-slate-800 transition-transform duration-700 group-hover:scale-105">
                  {details.backdropPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w1280${details.backdropPath}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">Ei taustakuvaa</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="px-8 pb-16 -mt-24 relative z-10 transition-transform duration-500">
                  <div className="flex flex-col sm:flex-row gap-8 items-end sm:items-start text-center sm:text-left">
                    {/* Poster */}
                    <div className="w-40 sm:w-48 shrink-0 mx-auto sm:mx-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      {details.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w500${details.posterPath}`}
                          alt={details.title}
                          className="w-full rounded-[2rem] border-4 border-slate-900 object-cover aspect-[2/3]"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-600 border-4 border-slate-900">Ei kuvaa</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4 pt-4 sm:pt-28">
                      <h2 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tighter">{details.title}</h2>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                        {details.releaseDate && (
                          <span className="text-lg font-bold text-slate-400">{new Date(details.releaseDate).getFullYear()}</span>
                        )}
                        {details.runtime > 0 && (
                          <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{details.runtime} min</span>
                        )}
                        {details.voteAverage > 0 && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 text-sm font-black border border-amber-500/20">
                            ★ {details.voteAverage.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        {details.genres.map(g => (
                          <span key={g} className="px-4 py-1.5 bg-white/5 text-slate-300 rounded-full text-xs font-bold border border-white/5">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 space-y-8">
                    <div className="glass-card p-8 rounded-[2.5rem]">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80 mb-4">Tarina lyhyesti</h3>
                      <p className="text-slate-300 leading-relaxed text-lg font-medium italic">
                        {details.overview || 'Ei kuvausta saatavilla.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-40 text-center">
                <div className="text-red-400 font-black text-lg mb-2">Hups!</div>
                <div className="text-slate-500">Tietojen haku epäonnistui. Kokeile myöhemmin uudelleen.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
