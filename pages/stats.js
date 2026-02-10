import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { TurnChart, MonthlyChart, YearDistributionChart, GenreChart, CountryChart } from '../components/StatsCharts'

const PEOPLE = ['Tomi', 'Mikkis', 'Aino', 'Mari']

export default function Stats() {
    const [movies, setMovies] = useState([])
    const [metadata, setMetadata] = useState({}) // { tmdbId: { genres: [], countries: [] } }
    const [loading, setLoading] = useState(true)
    const [filterPerson, setFilterPerson] = useState('Kaikki')
    const [loadingMetadata, setLoadingMetadata] = useState(false)

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

    // 1. Turns per person
    const turnsData = useMemo(() => {
        const counts = {}
        // Initialize
        PEOPLE.forEach(p => counts[p] = 0)

        // Count ONLY from the filtered set? 
        // Requirement: "When a single person is selected: Show only that person’s total"
        // So if filter is Tomi, we show one bar for Tomi.
        if (filterPerson === 'Kaikki') {
            movies.forEach(m => {
                if (counts[m.person] !== undefined) counts[m.person]++
            })
            return PEOPLE.map(p => ({
                name: p,
                count: counts[p] || 0
            }))
        } else {
            const count = movies.filter(m => m.person === filterPerson).length
            return [{ name: filterPerson, count }]
        }
    }, [movies, filterPerson])

    // 2. Movies per month
    const monthlyData = useMemo(() => {
        const sorted = [...filteredMovies].sort((a, b) => {
            const da = new Date(a.watchedAt || a.watchDate)
            const db = new Date(b.watchedAt || b.watchDate)
            return da - db
        })

        if (sorted.length === 0) return []

        const stats = {}
        sorted.forEach(m => {
            const d = new Date(m.watchedAt || m.watchDate)
            if (isNaN(d.getTime())) return
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            stats[key] = (stats[key] || 0) + 1
        })

        return Object.entries(stats).map(([key, count]) => ({
            name: key,
            count
        }))
    }, [filteredMovies])

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
            .sort((a, b) => Number(a[0]) - Number(b[0]))
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
            metadata[m.tmdbId].genres.forEach(g => {
                counts[g] = (counts[g] || 0) + 1
            })
        })

        // Sort and take top X
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6) // Top 6
            .map(([name, count]) => ({ name, count }))
    }, [filteredMovies, metadata])

    // 5. Countries
    const countryData = useMemo(() => {
        const counts = {} // { "US": { name: "United States", count: 1, code: "US" } }

        filteredMovies.forEach(m => {
            if (!m.tmdbId || !metadata[m.tmdbId]) return
            // Count primary country only (first one)
            const countries = metadata[m.tmdbId].countries
            const primary = countries[0]

            let code = null
            let name = null

            if (typeof primary === 'string') {
                name = primary
            } else {
                code = primary.iso_3166_1
                name = primary.name
            }

            // Allow counting even if code is missing (fallback for legacy data)
            if (name) {
                // Use name as key if code is missing, but prefer code for accurate aggregation
                const key = code || name
                if (!counts[key]) {
                    counts[key] = { name, count: 0, code }
                }
                counts[key].count++
            }
        })

        // Helper to get flag emoji from ISO code
        const getFlagEmoji = (countryCode) => {
            if (!countryCode) return ''
            const codePoints = countryCode
                .toUpperCase()
                .split('')
                .map(char => 127397 + char.charCodeAt(0));
            return String.fromCodePoint(...codePoints);
        }

        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10) // Top 10
            .map(c => ({
                name: c.name === "United States of America" ? "USA" : c.name, // Shorten USA for better fit
                count: c.count,
                flag: getFlagEmoji(c.code)
            }))
    }, [filteredMovies, metadata])


    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Ladataan tilastoja...</div>

    return (
        <div className="min-h-screen bg-slate-950 pb-20 selection:bg-blue-500/30 font-sans">
            <div className="max-w-5xl mx-auto min-h-screen relative">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5 hover:bg-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
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

                <div className="p-6 space-y-10">
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

                        {/* 1. Turns */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Valitut elokuvat</h2>
                            <TurnChart data={turnsData} />
                        </div>

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

                            {/* Activity Chart */}
                            <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Katselut (kk)</h2>
                                <MonthlyChart data={monthlyData} />
                            </div>
                        </div>

                        {/* 3. Genres */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Suosituimmat genret</h2>
                            <div className="h-[300px] flex items-center justify-center">
                                {genreData.length > 0 ? (
                                    <GenreChart data={genreData} />
                                ) : (
                                    <div className="text-slate-600 text-sm font-bold">Ei tarpeeksi dataa</div>
                                )}
                            </div>
                        </div>

                        {/* 4. Countries */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl md:row-span-2">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Elokuvan alkuperämaa</h2>
                            <div className="custom-scrollbar overflow-y-auto max-h-[600px] pr-2">
                                {countryData.length > 0 ? (
                                    <CountryChart data={countryData} />
                                ) : (
                                    <div className="text-slate-600 text-sm font-bold">Ei tarpeeksi dataa</div>
                                )}
                            </div>
                        </div>

                        {/* 5. Decades */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Julkaisuvuodet</h2>
                            <YearDistributionChart data={yearData} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
