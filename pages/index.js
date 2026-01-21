import { useEffect, useState } from 'react'
import MovieList from '../components/MovieList'

const PEOPLE = ['Aino', 'Mari', 'Mikkis', 'Tomi']

// Palauttaa tämän päivän muodossa YYYY-MM-DD (HTML date input)
function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const local = localStorage.getItem('leffakerho_movies')
    if (local) {
      setMovies(JSON.parse(local))
      setLoading(false)
      return
    }

    fetch('/seed.txt')
      .then(res => res.text())
      .then(txt => {
        const parsed = parseSeed(txt)
        setMovies(parsed)
        localStorage.setItem('leffakerho_movies', JSON.stringify(parsed))
      })
      .finally(() => setLoading(false))
  }, [])

  function parseSeed(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const entries = []

    let currentYear = ''

    const MONTHS = {
      tammikuu: 1,
      helmikuu: 2,
      maaliskuu: 3,
      huhtikuu: 4,
      toukokuu: 5,
      kesäkuu: 6,
      heinäkuu: 7,
      elokuu: 8,
      syyskuu: 9,
      lokakuu: 10,
      marraskuu: 11,
      joulukuu: 12,
    }

    for (const line of lines) {
      if (/^\d{4}$/.test(line)) {
        currentYear = Number(line)
        continue
      }

      if (!currentYear) continue

      const cleaned = line.replace(/^\d+\.\s*/, '')

      const match = cleaned.match(
        /^(.*?)(?:\s*\(([^)]+)\))?\s*-\s*(Tammikuu|Helmikuu|Maaliskuu|Huhtikuu|Toukokuu|Kesäkuu|Heinäkuu|Elokuu|Syyskuu|Lokakuu|Marraskuu|Joulukuu)$/i
      )

      if (!match) continue

      entries.push({
        id: `${match[1]}-${currentYear}-${Math.random()}`,
        title: match[1].trim(),
        year: currentYear,
        month: MONTHS[match[3].toLowerCase()],
        person: (match[2] || '').trim(),
        source: 'seed',
      })
    }

    return entries
  }

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
    const yyyy = d.getFullYear()
    const mm = d.getMonth() + 1
    const dd = String(d.getDate()).padStart(2, '0')
    const mm2 = String(mm).padStart(2, '0')
    const formattedDate = `${dd}.${mm2}.${yyyy}`

    const newEntry = {
      id: `${title}-${Date.now()}`,
      title: title.trim(),
      year: yyyy,
      month: mm,
      watchDate: formattedDate,
      person,
      source: 'ui',
    }

    if (releaseYear) {
      newEntry.releaseYear = releaseYear
    } else {
      setLookupInProgress(true)
      try {
        const r = await fetch(
          `/api/fetch-year?title=${encodeURIComponent(title.trim())}`
        )
        if (r.ok) {
          const data = await r.json()
          if (data?.year) newEntry.releaseYear = data.year
        }
      } finally {
        setLookupInProgress(false)
      }
    }

    // LISÄYS AINA LISTAN LOPPUUN
    persist([...movies, newEntry])

    setTitle('')
    setReleaseYear('')
    setWatchDate(todayISO())
    setPerson(PEOPLE[0])
  }

  return (
    <main className="min-h-screen max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Leffakerho</h1>

      <form
        onSubmit={handleAdd}
        className="bg-white p-4 rounded shadow space-y-3 mb-8"
      >
        <input
          className="w-full border p-2"
          placeholder="Elokuvan nimi"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <input
          className="w-full border p-2"
          placeholder="Julkaisuvuosi (valinnainen)"
          value={releaseYear}
          onChange={e => setReleaseYear(e.target.value)}
        />

        <input
          type="date"
          className="w-full border p-2"
          value={watchDate}
          onChange={e => setWatchDate(e.target.value)}
        />

        <div className="flex gap-3">
          {PEOPLE.map(p => (
            <label key={p} className="flex items-center gap-1">
              <input
                type="radio"
                checked={person === p}
                onChange={() => setPerson(p)}
              />
              {p}
            </label>
          ))}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          disabled={lookupInProgress}
          className="bg-sky-600 text-white px-4 py-2 rounded"
        >
          Lisää elokuva
        </button>
      </form>

      {loading ? (
        <div>Luetaan...</div>
      ) : (
        <MovieList
          movies={movies}
          onDelete={id => persist(movies.filter(m => m.id !== id))}
        />
      )}
    </main>
  )
}
