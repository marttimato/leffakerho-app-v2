import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { YearDistributionChart, GenreChart, CountryChart } from '../components/StatsCharts'

const PEOPLE = ['Tomi', 'Mikkis', 'Aino', 'Mari']

export default function Stats() {
    const [movies, setMovies] = useState([])
    const [metadata, setMetadata] = useState({}) // { tmdbId: { genres: [], countries: [] } }
    const [loading, setLoading] = useState(true)
    const [filterPerson, setFilterPerson] = useState('Kaikki')
    const [loadingMetadata, setLoadingMetadata] = useState(false)
    const [selectedCountry, setSelectedCountry] = useState(null)
    const [selectedGenre, setSelectedGenre] = useState(null)
    const [selectedDecade, setSelectedDecade] = useState(null)

    // 1. Fetch basic movie list
    useEffect(() => {
        async function fetchMovies() {
            try {
                const res = await fetch('/api/movies')
                const data = await res.json()
                setMovies(data)
            } catch (err) {
                console.error('Failed to fetch movies', err)
            } finally {
                setLoading(false)
            }
        }
        fetchMovies()
    }, [])

    // 2. Load metadata from localStorage on mount
    useEffect(() => {
        const cached = localStorage.getItem('leffakerho_metadata')
        if (cached) {
            setMetadata(JSON.parse(cached))
        }
    }, [])

    // 3. Fetch missing metadata (genres/countries) for movies that have tmdbId
    useEffect(() => {
        if (movies.length === 0) return

        async function fetchMissingMetadata() {
            const missingIds = movies
                .filter(m => {
                    if (!m.tmdbId) return false
                    const meta = metadata[m.tmdbId]
                    if (!meta) return true
                    // Check for legacy format (countries is array of strings)
                    if (meta.countries && meta.countries.length > 0 && typeof meta.countries[0] === 'string') {
                        return true
                    }
                    return false
                })
                .map(m => m.tmdbId)

            // Eliminate duplicates
            const uniqueMissingIds = [...new Set(missingIds)]

            if (uniqueMissingIds.length === 0) return

            setLoadingMetadata(true)
            const newMetadata = { ...metadata }
            let changed = false

            // Fetch in chunks to avoid overwhelming the server/API
            // Simple implementation: fetch one by one or small parallel batches
            // We'll do a simple loop with Promise.all for blocks of 5
            const chunkSize = 5
            for (let i = 0; i < uniqueMissingIds.length; i += chunkSize) {
                const chunk = uniqueMissingIds.slice(i, i + chunkSize)
                await Promise.all(chunk.map(async (id) => {
                    try {
                        const res = await fetch(`/api/movies/details?id=${id}`)
                        if (res.ok) {
                            const data = await res.json()
                            newMetadata[id] = {
                                genres: data.genres || [],
                                countries: data.countries || [] // Now contains objects with { iso_3166_1, name }
                            }
                            changed = true
                        }
                    } catch (e) {
                        console.error(`Failed to fetch metadata for ${id}`, e)
                    }
                }))
                // Save intermediate progress
                if (changed) {
                    setMetadata(prev => ({ ...prev, ...newMetadata }))
                    localStorage.setItem('leffakerho_metadata', JSON.stringify(newMetadata))
                }
            }
            setLoadingMetadata(false)
        }

        // Small delay to let initial render happen
        const timer = setTimeout(fetchMissingMetadata, 1000)
        return () => clearTimeout(timer)
    }, [movies, metadata]) // This dependency array needs care to avoid infinite loops. 
    // Actually, depend on movies.length. metadata dependency might loop if we are not matching keys correctly.
    // Better approach: Check if we have movies AND we have *missing* metadata.
    // Let's rely on the check inside the effect. 
    // To avoid loop: solely depend on movies.length and a flag? 
    // Actually, we can just run this once when movies loads, as movies list doesn't change usually during stats viewing.
    // But movies might be added. Let's stick to simple logic: 
    // If movies change, we check. If metadata changes, we DON'T need to re-check immediately unless distinct IDs are missing.
    // For safety, let's use a ref or just run it when 'movies' updates. 

    /* 
       AGGREGATION LOGIC 
    */
    const filteredMovies = useMemo(() => {
        if (filterPerson === 'Kaikki') return movies
        return movies.filter(m => m.person === filterPerson)
    }, [movies, filterPerson])


    // 2b. Average movies per month (Pace)
    const averagePace = useMemo(() => {
        if (filteredMovies.length === 0) return 0

        // Find min and max date
        const dates = filteredMovies
            .map(m => new Date(m.watchedAt || m.watchDate))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b)

        if (dates.length === 0) return 0

        const start = dates[0]
        const end = new Date() // Use current date as end to represent "pace up to now" or dates[dates.length - 1]?
        // "Pace" usually implies consistency over the active period. 
        // Let's use the span between first movie and now (if active) or just first and last.
        // If we use "now", and the user hasn't watched anything in a year, the pace drops (which is correct).
        // Let's use the span between first watched and today.

        const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
        return (filteredMovies.length / Math.max(1, monthDiff)).toFixed(1)
    }, [filteredMovies])

    // 3. Release Year Distribution
    const yearData = useMemo(() => {
        const decades = {}
        filteredMovies.forEach(m => {
            if (!m.releaseYear) return
            const decade = Math.floor(m.releaseYear / 10) * 10
            decades[decade] = (decades[decade] || 0) + 1
        })

        return Object.entries(decades)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([d, c]) => ({
                name: `${d}s`,
                count: c
            }))
    }, [filteredMovies])

    // 4. Genres
    const genreData = useMemo(() => {
        const counts = {}
        filteredMovies.forEach(m => {
            if (!m.tmdbId || !metadata[m.tmdbId]) return
            if (metadata[m.tmdbId].genres && metadata[m.tmdbId].genres.length > 0) {
                const primaryGenre = metadata[m.tmdbId].genres[0]
                counts[primaryGenre] = (counts[primaryGenre] || 0) + 1
            }
        })

        // Sort and return all genres
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }))
    }, [filteredMovies, metadata])

    // 5. Countries
    const countryData = useMemo(() => {
        const counts = {} // { "US": { name: "United States", count: 1, code: "US" } }
        const clubMovies = movies.filter(m => PEOPLE.includes(m.person))

        clubMovies.forEach(m => {
            const meta = m.tmdbId ? metadata[m.tmdbId] : null
            const countries = meta?.countries || []

            // Prioritize Finland for co-productions
            let primary = countries.find(c => {
                const name = typeof c === 'string' ? c : c.name
                const code = typeof c === 'string' ? null : c.iso_3166_1
                return name === "Finland" || code === "FI"
            })

            // Fallback to first country if Finland not found
            if (!primary && countries.length > 0) {
                primary = countries[0]
            }

            let code = null
            let name = null

            if (primary) {
                if (typeof primary === 'string') {
                    name = primary
                } else {
                    code = primary.iso_3166_1
                    name = primary.name
                }
            } else {
                // Fallback for missing country info
                name = "Tuntematon"
                code = "XX"
            }

            if (name) {
                if (name === "United States of America") name = "USA"
                const key = code || name
                if (!counts[key]) {
                    counts[key] = { name, count: 0, code }
                }
                counts[key].count++
            }
        })

        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            // Removed slice(0, 10) to include all movies
            .map(c => ({
                name: c.name,
                count: c.count,
                code: c.code || 'XX'
            }))
    }, [movies, metadata])

    const countryMovies = useMemo(() => {
        if (!selectedCountry) return []
        const clubMovies = movies.filter(m => PEOPLE.includes(m.person))

        return clubMovies.filter(m => {
            const meta = m.tmdbId ? metadata[m.tmdbId] : null
            const countries = meta?.countries || []

            // Prioritize Finland for co-productions
            let primary = countries.find(c => {
                const name = typeof c === 'string' ? c : c.name
                const code = typeof c === 'string' ? null : c.iso_3166_1
                return name === "Finland" || code === "FI"
            })

            // Fallback to first country
            if (!primary && countries.length > 0) {
                primary = countries[0]
            }

            let name = null
            if (primary) {
                name = typeof primary === 'string' ? primary : primary.name
                if (name === "United States of America") name = "USA"
            } else {
                name = "Tuntematon"
            }

            return name === selectedCountry.name
        })
    }, [movies, metadata, selectedCountry])

    const genreMovies = useMemo(() => {
        if (!selectedGenre) return []

        return filteredMovies.filter(m => {
            const meta = m.tmdbId ? metadata[m.tmdbId] : null
            const genres = meta?.genres || []
            return genres[0] === selectedGenre.name
        })
    }, [filteredMovies, metadata, selectedGenre])

    const decadeMovies = useMemo(() => {
        if (!selectedDecade) return []
        const decadeStart = parseInt(selectedDecade.name)
        return filteredMovies.filter(m => {
            if (!m.releaseYear) return false
            return m.releaseYear >= decadeStart && m.releaseYear < decadeStart + 10
        })
    }, [filteredMovies, selectedDecade])

    useEffect(() => {
        if (selectedCountry || selectedGenre || selectedDecade) {
            document.body.classList.add('overflow-hidden')
        } else {
            document.body.classList.remove('overflow-hidden')
        }
        return () => document.body.classList.remove('overflow-hidden')
    }, [selectedCountry, selectedGenre, selectedDecade])


    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Ladataan tilastoja...</div>

    return (
        <div className="min-h-screen bg-slate-950 pb-20 selection:bg-blue-500/30 font-sans">
            <div className="max-w-5xl mx-auto min-h-screen relative">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5 hover:bg-white/10" title="Etusivu">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                            </svg>
                        </Link>
                        <Link href="/carousel" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5 hover:bg-white/10" title="Leffakaruselli">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-black text-white tracking-tight">Tilastot</h1>
                    </div>
                    {loadingMetadata && (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Päivitetään tietoja</span>
                        </div>
                    )}
                </header>

                <div className="p-4 md:p-6 space-y-10">
                    {/* Filter */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterPerson('Kaikki')}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${filterPerson === 'Kaikki'
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            Kaikki
                        </button>
                        {PEOPLE.map(p => (
                            <button
                                key={p}
                                onClick={() => setFilterPerson(p)}
                                className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${filterPerson === p
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                        {/* 2. Monthly */}
                        <div className="md:row-span-2 space-y-6">
                            {/* Pace Metric */}
                            <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl flex flex-col justify-center items-center text-center h-[200px]">
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Katselutahti</h2>
                                <div className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                                    {averagePace}
                                </div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                    leffaa / kk
                                </div>
                            </div>
                        </div>

                        {/* 3. Genres */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Genret</h2>
                            <div className="w-full">
                                {genreData.length > 0 ? (
                                    <GenreChart data={genreData} onGenreClick={(genre) => {
                                        setSelectedCountry(null);
                                        setSelectedDecade(null);
                                        setSelectedGenre(genre);
                                    }} />
                                ) : (
                                    <div className="text-slate-600 text-sm font-bold">Ei tarpeeksi dataa</div>
                                )}
                            </div>
                        </div>

                        {/* 4. Countries */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl md:row-span-2">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Elokuvan alkuperämaa</h2>
                            <div>
                                {countryData.length > 0 ? (
                                    <CountryChart data={countryData} onCountryClick={(country) => {
                                        setSelectedGenre(null);
                                        setSelectedDecade(null);
                                        setSelectedCountry(country);
                                    }} />
                                ) : (
                                    <div className="text-slate-600 text-sm font-bold">Ei tarpeeksi dataa</div>
                                )}
                            </div>
                        </div>

                        {/* 5. Decades */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Julkaisuvuodet</h2>
                            <YearDistributionChart data={yearData} onYearClick={(decade) => {
                                setSelectedCountry(null);
                                setSelectedGenre(null);
                                setSelectedDecade(decade);
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-over Drawer */}
            <div
                className={`fixed inset-0 z-[100] transition-opacity duration-500 ease-in-out ${selectedCountry || selectedGenre || selectedDecade ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    onClick={() => { setSelectedCountry(null); setSelectedGenre(null); setSelectedDecade(null); }}
                />

                {/* Panel */}
                <div
                    className={`absolute inset-y-0 right-0 w-full max-w-md bg-slate-900 shadow-2xl border-l border-white/10 transform transition-transform duration-500 ease-in-out flex flex-col ${selectedCountry || selectedGenre || selectedDecade ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Drawer Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            {selectedCountry ? (
                                <>
                                    <img
                                        src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                                        width="32"
                                        height="24"
                                        alt=""
                                        className="rounded shadow-sm"
                                    />
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">{selectedCountry.name}</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{countryMovies.length} elokuvaa</p>
                                    </div>
                                </>
                            ) : selectedGenre ? (
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">{selectedGenre.name}</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{genreMovies.length} elokuvaa</p>
                                </div>
                            ) : selectedDecade ? (
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">{selectedDecade.name}</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{decadeMovies.length} elokuvaa</p>
                                </div>
                            ) : null}
                        </div>
                        <button
                            onClick={() => { setSelectedCountry(null); setSelectedGenre(null); setSelectedDecade(null); }}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5 hover:bg-white/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>

                    {/* Movie List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {(selectedCountry ? countryMovies : (selectedGenre ? genreMovies : decadeMovies)).map((movie, idx) => (
                            <div
                                key={movie.id}
                                className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group animate-in slide-in-from-right-4 duration-300 ease-out"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                                            {movie.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                {movie.releaseYear}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <div className="px-2 py-1 rounded-md bg-slate-800 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {movie.person}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
