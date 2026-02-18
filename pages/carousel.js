import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Carousel() {
    const [movies, setMovies] = useState([])
    const [displayMovies, setDisplayMovies] = useState([])
    const [seenIds, setSeenIds] = useState(new Set())
    const [loading, setLoading] = useState(true)
    const [selectedMovieId, setSelectedMovieId] = useState(null)
    const [details, setDetails] = useState(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState(null)

    useEffect(() => {
        fetchRecommendations()
    }, [])

    async function handleSync() {

        setSyncing(true)
        setSyncResult(null)
        try {
            const res = await fetch('/api/movies/sync-tmdb')
            const data = await res.json()
            if (!res.ok) {
                if (data.error.includes('Session ID required')) {
                    throw new Error('Synkronointi vaatii TMDB_SESSION_ID-tunnisteen .env.local tiedostoon. Katso ohjeet walkthrough.md tiedostosta.')
                }
                throw new Error(data.error || 'Synkronointi epäonnistui')
            }
            setSyncResult(data)
            let msg = `Synkronointi valmis! Onnistui: ${data.success}, Ohitettu: ${data.skipped}, Virheitä: ${data.error}`
            if (data.error > 0 && data.details && data.details.length > 0) {
                const errorSample = data.details.find(d => d.error)
                if (errorSample) {
                    msg += `\n\nEsimerkkivirhe: "${errorSample.title}": ${errorSample.error}`
                }
            }
            alert(msg)
        } catch (err) {
            console.error(err)
            alert(err.message)
        } finally {
            setSyncing(false)
        }
    }

    async function fetchRecommendations(currentSeenIds = new Set()) {
        setLoading(true)
        try {
            const excludeParam = Array.from(currentSeenIds).join(',')
            const res = await fetch(`/api/movies/recommendations?excludeIds=${excludeParam}`)
            const data = await res.json()
            setMovies(data)

            // Pick first 3 from the fresh pool
            if (data.length >= 3) {
                const initial3 = data.slice(0, 3)
                setDisplayMovies(initial3)
                const newSeen = new Set(currentSeenIds)
                initial3.forEach(m => newSeen.add(m.id))
                setSeenIds(newSeen)
            } else {
                setDisplayMovies(data)
            }
        } catch (err) {
            console.error('Failed to fetch recommendations', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleRegenerate() {
        // If we have less than 3 movies left in our local 'movies' pool that haven't been shown,
        // we should probably fetch more. 
        // But for simplicity, let's just always fetch fresh results based on seenIds.
        fetchRecommendations(seenIds)
    }

    async function handleSelectMovie(movieId) {
        const movie = movies.find(m => m.id === movieId) || displayMovies.find(m => m.id === movieId)
        if (!movie) return

        setSelectedMovieId(movieId)
        setLoadingDetails(true)
        setDetails(null)

        try {
            const res = await fetch(`/api/movies/details?id=${movieId}`)
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

    return (
        <main className="min-h-screen pb-20 selection:bg-blue-500/30 font-sans bg-slate-950 text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <header className="py-8 flex items-center justify-between border-b border-white/5 mb-12">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 hover:bg-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Leffakaruselli</h1>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase tracking-widest ${syncing ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed' : 'bg-slate-900 border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}
                    >
                        {syncing ? (
                            <>
                                <div className="w-3 h-3 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
                                Synkronoidaan...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Synkronoi TMDB
                            </>
                        )}
                    </button>
                </header>

                {/* Content */}
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        Suositeltuja elokuvia
                    </h2>
                    <div className="space-y-2">
                        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                            Valitsimme sinulle kolme näkemätöntä helmeä katseluhistoriasi perusteella.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Istunnon aikana näytetty: {seenIds.size} elokuvaa</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-6">
                        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">Analysoidaan makuasi...</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                            {displayMovies.map((movie, idx) => (
                                <div
                                    key={movie.id}
                                    className="group relative flex flex-col bg-slate-900 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl transition-all hover:scale-[1.02] hover:border-blue-500/30 animate-in fade-in zoom-in-95 duration-700"
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                >
                                    {/* Poster Container */}
                                    <div className="aspect-[2/3] relative overflow-hidden">
                                        {movie.posterPath ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                                                alt={movie.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">Ei kuvaa</div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-940 via-transparent to-transparent opacity-60" />
                                    </div>

                                    {/* Info */}
                                    <div className="p-8 flex flex-col flex-1 justify-between gap-6">
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">{movie.title}</h3>
                                            <p className="text-slate-500 font-bold text-sm">{movie.releaseYear}</p>
                                        </div>

                                        <button
                                            onClick={() => handleSelectMovie(movie.id)}
                                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-blue-600 hover:border-blue-500 transition-all uppercase tracking-wider text-xs"
                                        >
                                            Lisätietoja
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center pt-8">
                            <button
                                onClick={handleRegenerate}
                                className="group flex items-center gap-4 px-10 py-6 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black text-xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all active:scale-95 border border-blue-400/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Arvo uudelleen
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Movie Detail Modal (Stripped down version or duplicated for now to avoid massive refactoring) */}
            {selectedMovieId && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 overscroll-behavior-contain">
                    <div className="bg-slate-900 w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-y-auto overflow-x-hidden custom-scrollbar relative animate-in zoom-in-95 duration-500 border border-white/10 group">
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
                                <div className="relative aspect-video sm:aspect-[21/9] w-full bg-slate-800 overflow-hidden">
                                    {details.backdropPath ? (
                                        <img src={`https://image.tmdb.org/t/p/w1280${details.backdropPath}`} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">Ei taustakuvaa</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                                </div>

                                <div className="px-8 pb-16 -mt-24 relative z-10">
                                    <div className="flex flex-col sm:flex-row gap-8 items-end sm:items-start text-center sm:text-left">
                                        <div className="w-40 sm:w-48 shrink-0 mx-auto sm:mx-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                            {details.posterPath ? (
                                                <img src={`https://image.tmdb.org/t/p/w500${details.posterPath}`} alt={details.title} className="w-full rounded-[2rem] border-4 border-slate-900 aspect-[2/3] object-cover" />
                                            ) : (
                                                <div className="w-full aspect-[2/3] bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-600 border-4 border-slate-900">Ei kuvaa</div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-4 pt-4 sm:pt-28">
                                            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">{details.title}</h2>
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                                                <span className="text-lg font-bold text-slate-400">{new Date(details.releaseDate).getFullYear()}</span>
                                                {details.runtime > 0 && <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{details.runtime} min</span>}
                                                {details.voteAverage > 0 && (
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 text-sm font-black border border-amber-500/20">
                                                        ★ {details.voteAverage.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                                {details.genres.map(g => (
                                                    <span key={g} className="px-4 py-1.5 bg-white/5 text-slate-300 rounded-full text-xs font-bold border border-white/5">{g}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-12 space-y-8">
                                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80 mb-4">Tarina lyhyesti</h3>
                                            <p className="text-slate-300 leading-relaxed text-lg font-medium italic">{details.overview || 'Ei kuvausta saatavilla.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </main>
    )
}
