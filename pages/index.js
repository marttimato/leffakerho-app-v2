import { useEffect, useState } from 'react'
import MovieList from '../components/MovieList'

const PEOPLE = ['Aino', 'Mari', 'Mikkis', 'Tomi']

// Kuukausien muunnos seed.txt:ää varten
const MONTHS = {
  tammikuu: '01',
  helmikuu: '02',
  maaliskuu: '03',
  huhtikuu: '04',
  toukokuu: '05',
  kesäkuu: '06',
  heinäkuu: '07',
  elokuu: '08',
  syyskuu: '09',
  lokakuu: '10',
  marraskuu: '11',
  joulukuu: '12',
}

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

    async function init() {
      try {
        const local = localStorage.getItem('leffakerho_movies')
        if (local) {
          setMovies(JSON.parse(local))
          return
        }

        const res = await fetch('/seed.txt')
        if (!res.ok) {
          setMovies([])
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
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const entries = []

    let currentYear = ''

    for (const line of lines) {
      // Vuosi
      if (/^\d{4}$/.test(line)) {
        currentYear = line
        continue
      }

      const match = line.match(/^(.*?)(?:\s*\(([^)]+)\))?\s*-\s*(.*)$/)
      if (!match) continue

      const title = match[1].trim()
      const person = (match[2] || '').trim()
      const monthName = match[3].trim().toLowerCase()
      const month = MONTHS[monthName] || ''

      const watchDate =
        month && currentYear ? `${month}/${currentYear}` : ''

      entries.push({
        id: `${title}-${Date.now()}-${Math.random()}`,
        title,
        year: '',
        watchDate,
        person,
        createdAt: new Date().toISOString(),
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

    let formattedDate = ''
    if (watchDate) {
      const d = new Date(watchDate)
      if (!isNaN(d)) {
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        formattedDate = `${dd}.${mm}.${yyyy}`
      }
    }

    const newEntry = {
      id: `${title}-${Date.now()}`,
      title: title.trim(),
      year: year.trim(),
      watchDate: formattedDate,
      person,
      createdAt: new Date().toISOString(),
    }

    if (!newEntry.year) {
      setLookupInProgress(true)
      try {
        const r = await fetch(`/api/fetch-year?title=${encodeURIComponent(newEntry.title)}`)
        if (r.ok) {
          const data = await r.json()
          if (data?.year) newEntry.year = data.year
        }
      } finally {
        setLookupInProgress(false)
      }
    }

    persist([newEntry, ...movies])
    setTitle('')
    setYear('')
    setWatchDate('')
    setPerson(PEOPLE[0])
  }

  return (
    <main className="min-h-screen max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Leffakerho</h1>

      <form onSubmit={handleAdd} className="bg-white p-4 rounded shadow space-y-3 mb-6">
        <input
          className="w-full border p-2"
          placeholder="Elokuvan nimi"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <input
          className="w-full border p-2"
          placeholder="Julkaisuvuosi (valinnainen)"
          value={year}
          onChange={e => setYear(e.target.value)}
        />

        <input
          type="date"
          className="w-full border p-2"
          value={watchDate}
          onChange={e => setWatchDate(e.target.value)}
        />

        <div className="flex gap-3">
          {PEOPLE.map(p => (
            <label key={p}>
              <input
                type="radio"
                checked={person === p}
                onChange={() => setPerson(p)}
              />{' '}
              {p}
            </label>
          ))}
        </div>

        {error && <div className="text-red-600">{error}</div>}

        <button className="bg-sky-600 text-white px-4 py-2 rounded">
          {lookupInProgress ? 'Haetaan...' : 'Lisää elokuva'}
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

export async function getServerSideProps() {
  return { props: {} }
}
