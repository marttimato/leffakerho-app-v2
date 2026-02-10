import { useEffect, useState } from 'react'
import MovieList from '../components/MovieList'
import FinnishDatePicker from '../components/FinnishDatePicker'

const PEOPLE = ['Tomi', 'Mikkis', 'Aino', 'Mari']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateFi(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)}.${parseInt(m)}.${y}`
}

export default function Home() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [watchDate, setWatchDate] = useState(todayISO())
  const [person, setPerson] = useState(PEOPLE[0])
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [candidates, setCandidates] = useState(null)
  const [pendingMovie, setPendingMovie] = useState(null)
  const [selectedMovieId, setSelectedMovieId] = useState(null)
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [editingMovie, setEditingMovie] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editWatchDate, setEditWatchDate] = useState('')
  const [editPerson, setEditPerson] = useState('')
  const [showEditDatePicker, setShowEditDatePicker] = useState(false)

  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [editSuggestions, setEditSuggestions] = useState([])
  const [isEditSearching, setIsEditSearching] = useState(false)

  const [confirmConfig, setConfirmConfig] = useState(null) // { title, message, onConfirm }

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [validationError, setValidationError] = useState('')
  const [toast, setToast] = useState({ message: '', visible: false })

  /* ---------- SEARCH (Debounced) ---------- */
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmedTitle = title.trim()
      if (trimmedTitle.length >= 3) {
        // Skip search if we already have a matched movie with this title
        if (pendingMovie?.tmdbId && pendingMovie.title.toLowerCase() === trimmedTitle.toLowerCase()) {
          setSuggestions([])
          return
        }

        setIsSearching(true)
        try {
          const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(trimmedTitle)}`)
          const data = await r.json()
          setSuggestions(data.results || [])
        } catch (err) {
          console.error(err)
        } finally {
          setIsSearching(false)
        }
      } else {
        setSuggestions([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [title, pendingMovie?.tmdbId, pendingMovie?.title])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmedEditTitle = editTitle.trim()
      // Only search for edit if title actually changed from original OR if we don't have tmdbId yet
      if (editingMovie && trimmedEditTitle.length >= 3) {
        // Skip search if the title matches what we already have and we have a tmdbId
        // This prevents the loop when selecting from suggestions
        if (editingMovie.tmdbId && editingMovie.title.toLowerCase() === trimmedEditTitle.toLowerCase()) {
          setEditSuggestions([])
          return
        }

        setIsEditSearching(true)
        try {
          const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(trimmedEditTitle)}`)
          const data = await r.json()
          setEditSuggestions(data.results || [])
        } catch (err) {
          console.error(err)
        } finally {
          setIsEditSearching(false)
        }
      } else {
        setEditSuggestions([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [editTitle, editingMovie?.id, editingMovie?.tmdbId, editingMovie?.title])

  /* ---------- REAL-TIME VALIDATION ---------- */
  useEffect(() => {
    if (isSubmitting) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('')
      return
    }

    const exists = movies.some(m => m.title.toLowerCase() === trimmedTitle.toLowerCase())
    if (exists) {
      setValidationError('Elokuva on jo listalla')
    } else {
      setValidationError('')
    }
  }, [title, movies])

  /* ---------- SUGGESTION SELECT ---------- */
  function handleSelectSuggestion(s, isEdit = false) {
    if (isEdit) {
      setEditTitle(s.title)
      setEditSuggestions([])
      setEditingMovie(prev => ({ ...prev, title: s.title, tmdbId: s.id, releaseYear: s.releaseYear }))
    } else {
      setTitle(s.title)
      setSuggestions([])
      setPendingMovie({ title: s.title, tmdbId: s.id, releaseYear: s.releaseYear })
    }
  }

  function SuggestionList({ items, onSelect, isSearching }) {
    if (!isSearching && items.length === 0) return null
    return (
      <div className="absolute top-full left-0 right-0 z-[110] mt-2 bg-slate-900/95 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 animate-in fade-in slide-in-from-top-2 duration-200">
        {isSearching && (
          <div className="p-4 text-center">
            <div className="inline-block w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          {items.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className="w-full text-left px-5 py-4 hover:bg-white/10 border-b border-white/5 last:border-0 transition-all group"
            >
              <div className="font-bold text-white group-hover:text-blue-400 transition-colors text-base md:text-xl">{s.title}</div>
              <div className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-[0.1em] mt-0.5 md:mt-1">{s.releaseYear}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ---------- INIT ---------- */
  useEffect(() => {
    fetchMovies()
  }, [])

  async function fetchMovies() {
    try {
      const res = await fetch('/api/movies')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setMovies(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /* ---------- TURN ROTATION ---------- */
  useEffect(() => {
    if (movies.length > 0) {
      const latestMovie = movies[0]
      const currentIndex = PEOPLE.indexOf(latestMovie.person)
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % PEOPLE.length
        setPerson(PEOPLE[nextIndex])
      }
    } else {
      setPerson(PEOPLE[0])
    }
  }, [movies])

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

      // Refresh to get real IDs and sorting
      fetchMovies()

      // Success Toast
      setToast({
        message: `Lisätty: ${movie.title}${movie.releaseYear ? ` (${movie.releaseYear})` : ''}`,
        visible: true
      })
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
    } catch (err) {
      console.error(err)
      setMovies(previous) // Rollback
      alert('Tallennus epäonnistui')
    }

    setTitle('')
    setWatchDate(todayISO())
    setCandidates(null)
    setPendingMovie(null)
    setShowAddForm(false)
    setIsSubmitting(false)
  }

  /* ---------- UPDATE (API) ---------- */
  async function updateMovie(movie) {
    try {
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movie),
      })
      if (!res.ok) throw new Error('Failed to update')

      fetchMovies()
      setEditingMovie(null)
    } catch (err) {
      console.error(err)
      alert('Päivitys epäonnistui')
    }
    setCandidates(null)
    setPendingMovie(null)
  }

  /* ---------- DUPLICATE CHECK ---------- */
  function checkDuplicate(candidateTitle, currentId, onOk) {
    const exists = movies.some(m => m.title.toLowerCase() === candidateTitle.toLowerCase() && m.id !== currentId)
    if (exists) {
      setConfirmConfig({
        title: 'Tuplakappale?',
        message: `Elokuva "${candidateTitle}" on jo listalla. Haluatko varmasti jatkaa?`,
        onConfirm: onOk
      })
    } else {
      onOk()
    }
  }

  /* ---------- ADD (UI) ---------- */
  async function handleAdd(e) {
    if (e) e.preventDefault()
    setIsSubmitting(true)

    const d = new Date(watchDate)
    const baseMovie = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      person,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      watchDate: watchDate,
      source: 'ui',
    }

    // If we already have TMDB data (from selection) and the title matches
    const isMatched = pendingMovie?.tmdbId &&
      pendingMovie?.title?.trim().toLowerCase() === title.trim().toLowerCase()

    if (isMatched) {
      checkDuplicate(pendingMovie.title, null, () => {
        saveMovie({
          ...baseMovie,
          title: pendingMovie.title,
          releaseYear: pendingMovie.releaseYear,
          tmdbId: pendingMovie.tmdbId,
        })
      })
      return
    }

    // Check year/title from TMDB
    const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(title)}`)
    const data = await r.json()

    if (data.results.length === 1) {
      const match = data.results[0]
      checkDuplicate(match.title, null, () => {
        saveMovie({
          ...baseMovie,
          title: match.title,
          releaseYear: match.releaseYear,
          tmdbId: match.id,
        })
      })
    } else if (data.results.length > 1) {
      setPendingMovie(baseMovie)
      setCandidates(data.results)
    } else {
      checkDuplicate(baseMovie.title, null, () => {
        saveMovie(baseMovie)
      })
    }
  }

  /* ---------- EDIT (UI) ---------- */
  function handleStartEdit(movie) {
    setEditingMovie(movie)
    setEditTitle(movie.title)
    setEditWatchDate(movie.watchedAt ? movie.watchedAt.slice(0, 10) : (movie.watchDate ? movie.watchDate.slice(0, 10) : ''))
    setEditPerson(movie.person)
  }

  async function handleUpdate(e) {
    e.preventDefault()

    const baseUpdate = {
      ...editingMovie,
      title: editTitle.trim(),
      person: editPerson,
      watchDate: editWatchDate,
    }

    // If title changed, check if we already have the suggestion data
    if (editTitle.trim().toLowerCase() !== editingMovie.title.toLowerCase()) {
      if (editingMovie.tmdbId && editingMovie.title.trim().toLowerCase() === editTitle.trim().toLowerCase()) {
        updateMovie(baseUpdate)
        return
      }

      const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(editTitle)}`)
      const data = await r.json()

      if (data.results.length === 1) {
        const match = data.results[0]
        checkDuplicate(match.title, editingMovie.id, () => {
          updateMovie({ ...baseUpdate, title: match.title, releaseYear: match.releaseYear, tmdbId: match.id })
        })
      } else if (data.results.length > 1) {
        setPendingMovie(baseUpdate)
        setCandidates(data.results)
      } else {
        checkDuplicate(baseUpdate.title, editingMovie.id, () => {
          updateMovie(baseUpdate)
        })
      }
    } else {
      updateMovie(baseUpdate)
    }
  }

  /* ---------- DELETE (API) ---------- */
  async function handleDelete(movie) {
    setConfirmConfig({
      title: 'Poista elämys?',
      message: `Haluatko varmasti poistaa elokuvan "${movie.title}" listalta?`,
      onConfirm: async () => {
        const previous = movies
        setMovies(prev => prev.filter(m => m.id !== movie.id))

        try {
          const res = await fetch(`/api/movies/${movie.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Failed to delete')
        } catch (err) {
          console.error(err)
          setMovies(previous)
          alert('Poisto epäonnistui')
        }
      }
    })
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
    if (selectedMovieId || candidates || editingMovie || confirmConfig || showDatePicker || showEditDatePicker || showAddForm) {
      const scrollY = window.scrollY
      document.body.style.top = `-${scrollY}px`
      document.body.classList.add('no-scroll')
    } else {
      const scrollY = document.body.style.top
      document.body.classList.remove('no-scroll')
      const scrollTo = parseInt(scrollY || '0') * -1
      document.body.style.top = ''
      if (scrollY) window.scrollTo(0, scrollTo)
    }
  }, [selectedMovieId, candidates, editingMovie, confirmConfig, showDatePicker, showEditDatePicker, showAddForm])

  const watchedCount = movies.filter(m => PEOPLE.includes(m.person)).length

  return (
    <main className="min-h-screen pb-20 selection:bg-blue-500/30 font-sans">
      <div className="max-w-2xl md:max-w-5xl mx-auto min-h-screen relative overflow-x-hidden">
        {/* Header / Top Bar */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white transition-all">Leffakerho</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 transition-all">
              <span className="text-blue-400 font-bold text-xs md:text-sm">{watchedCount}</span>
              <span className="text-blue-400/60 text-[10px] md:text-xs font-bold uppercase tracking-wider">leffaa katsottu</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-8">
          {/* Search Bar */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500">Katsotut elokuvat</h2>
              <div className="h-px flex-1 mx-4 bg-white/5" />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-colors ${searchQuery ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                className="w-full glass-input rounded-2xl md:rounded-[2rem] pl-11 pr-12 py-4 md:py-6 md:pl-14 placeholder-slate-600 text-white md:text-xl transition-all ring-0 border-white/5 focus:border-blue-500/30"
                placeholder="Etsi elokuvaa tai katsojaa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/5 text-slate-500 hover:text-white flex items-center justify-center transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          </section>

          {/* List */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">Ladataan elämyksiä...</div>
            </div>
          ) : (
            <MovieList
              people={PEOPLE}
              movies={searchQuery.trim().length >= 3
                ? movies.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.person.toLowerCase().includes(searchQuery.toLowerCase()))
                : movies}
              onDelete={handleDelete}
              onSelect={handleSelectMovie}
              onEdit={handleStartEdit}
              isFiltered={searchQuery.trim().length >= 3}
            />
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-blue-600 rounded-full shadow-[0_20px_50px_rgba(37,99,235,0.4)] flex items-center justify-center text-white z-50 hover:bg-blue-500 transition-all active:scale-90 hover:scale-110 group border border-blue-400/20"
        aria-label="Lisää uusi elämys"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 transition-transform group-hover:rotate-90">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* MODALS */}

      {/* Add Modal */}
      {
        showAddForm && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 overscroll-behavior-contain">
            <div className="bg-slate-900 w-full max-w-md md:max-w-xl p-8 md:p-12 sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8 md:mb-12">
                  <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">Uusi elämys</h2>
                  <button
                    onClick={() => { setShowAddForm(false); setIsSubmitting(false); }}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAdd} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Elokuvan nimi</label>
                    <div className="relative">
                      <input
                        className={`w-full glass-input rounded-2xl md:rounded-[2rem] px-5 py-4 md:py-6 md:px-8 placeholder-slate-600 text-white md:text-lg transition-all ring-0 focus:border-blue-500/50 ${validationError ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}
                        placeholder="Mikä leffa katsottiin?"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                      />
                      {validationError && (
                        <div className="absolute -bottom-6 left-1 text-[10px] font-bold text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
                          {validationError}
                        </div>
                      )}
                      <SuggestionList
                        items={suggestions}
                        isSearching={isSearching}
                        onSelect={(s) => handleSelectSuggestion(s, false)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Katselupäivä</label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="w-full glass-input rounded-2xl md:rounded-[2rem] px-5 py-4 md:py-6 md:px-8 text-left text-slate-300 transition-all border-white/5 focus:border-blue-500/50 flex justify-between items-center group/btn"
                    >
                      <span className="font-semibold">{formatDateFi(watchDate)}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500 group-hover/btn:text-blue-400 transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Kuka valitsi?</label>
                    <div className="flex flex-wrap gap-2">
                      {PEOPLE.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPerson(p)}
                          className={`
                          px-5 py-2.5 md:px-8 md:py-4 rounded-full text-xs md:text-sm font-bold transition-all border
                          ${person === p
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}
                        `}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 md:pt-8">
                    <button
                      disabled={!!validationError || !title.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-blue-600 text-white font-bold py-4 md:py-6 rounded-2xl md:rounded-[2rem] shadow-xl shadow-blue-900/20 transition-all border border-blue-400/20 text-lg md:text-2xl"
                    >
                      Lisää listalle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Modal */}
      {
        editingMovie && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 overscroll-behavior-contain">
            <div className="bg-slate-900 w-full max-w-md md:max-w-xl p-8 md:p-12 sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Muokkaa tietoja</h2>
                <button
                  onClick={() => setEditingMovie(null)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-400/80 ml-1">Elokuvan nimi</label>
                  <input
                    className="w-full glass-input rounded-2xl px-4 py-4 placeholder-slate-500 text-white transition-all ring-0 border-white/10 focus:border-blue-500/50"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => setTimeout(() => setEditSuggestions([]), 200)}
                  />
                  <SuggestionList
                    items={editSuggestions}
                    isSearching={isEditSearching}
                    onSelect={(s) => handleSelectSuggestion(s, true)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-400/80 ml-1">Katselupäivä</label>
                  <button
                    type="button"
                    onClick={() => setShowEditDatePicker(true)}
                    className="w-full glass-input rounded-2xl px-4 py-4 text-left text-slate-300 transition-all border-white/10 focus:border-blue-500/50 flex justify-between items-center group/btn"
                  >
                    <span>{formatDateFi(editWatchDate)}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500 group-hover/btn:text-blue-400 transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </button>
                </div>


                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Kuka valitsi?</label>
                  <div className="flex flex-wrap gap-2">
                    {PEOPLE.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPerson(p)}
                        className={`
                        px-5 py-2.5 rounded-full text-xs font-bold transition-all border
                        ${editPerson === p
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}
                      `}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingMovie(null)}
                    className="flex-1 px-4 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all"
                  >
                    Peruuta
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-950/20 transition-all border border-blue-400/20"
                  >
                    Tallenna
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {
        candidates && (
          <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 overscroll-behavior-contain">
            <div className="bg-slate-900/90 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border border-white/10 overscroll-contain">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-lg tracking-tight text-white">Valitse oikea elokuva</h2>
                <button
                  onClick={() => { setCandidates(null); setPendingMovie(null); setIsSubmitting(false); }}
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
                      const isEdit = pendingMovie.id && !pendingMovie.id.startsWith('temp-')
                      checkDuplicate(c.title, isEdit ? pendingMovie.id : null, () => {
                        const finalMovie = {
                          ...pendingMovie,
                          title: c.title,
                          releaseYear: c.releaseYear,
                          tmdbId: c.id,
                        }

                        if (isEdit) {
                          updateMovie(finalMovie)
                        } else {
                          saveMovie(finalMovie)
                        }
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
        )
      }

      {/* Detail Modal */}
      {
        selectedMovieId && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 overscroll-behavior-contain">
            <div className="bg-slate-900 w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-y-auto overflow-x-hidden custom-scrollbar relative animate-in zoom-in-95 duration-500 border border-white/10 group overscroll-contain">
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
                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">{details.title}</h2>
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
        )
      }
      {/* Date Pickers */}
      {
        showDatePicker && (
          <FinnishDatePicker
            value={watchDate}
            onChange={setWatchDate}
            onClose={() => setShowDatePicker(false)}
          />
        )
      }
      {
        showEditDatePicker && (
          <FinnishDatePicker
            value={editWatchDate}
            onChange={setEditWatchDate}
            onClose={() => setShowEditDatePicker(false)}
          />
        )
      }

      {/* Confirm Modal */}
      {
        confirmConfig && (
          <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200 overscroll-behavior-contain">
            <div className="bg-slate-900 w-full max-w-sm p-8 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-300">
              <h2 className="text-xl font-black text-white mb-2 tracking-tight">{confirmConfig.title}</h2>
              <p className="text-slate-400 mb-8 leading-relaxed font-medium">{confirmConfig.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmConfig(null); setIsSubmitting(false); }}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all text-sm"
                >
                  Peruuta
                </button>
                <button
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-blue-950/20 transition-all border border-blue-400/20 active:scale-[0.98] text-sm"
                >
                  Kyllä
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Success Toast */}
      {toast.visible && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-white font-bold text-sm md:text-base">{toast.message}</span>
          </div>
        </div>
      )}
    </main >
  )
}
