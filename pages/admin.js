import { useState } from 'react'
import Link from 'next/link'

export default function Admin() {
    const [syncing, setSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState(null)

    async function handleSync() {
        setSyncing(true)
        setSyncResult(null)
        try {
            const res = await fetch('/api/movies/sync-tmdb')
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Synkronointi epäonnistui')
            }
            setSyncResult(data)
            alert(`Synkronointi valmis! Onnistui: ${data.success}, Ohitettu: ${data.skipped}, Virheitä: ${data.error}`)
        } catch (err) {
            console.error(err)
            alert(err.message)
        } finally {
            setSyncing(false)
        }
    }

    return (
        <main className="min-h-screen pb-20 font-sans bg-slate-950 text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <header className="py-8 flex items-center justify-between border-b border-white/5 mb-12">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 hover:bg-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight">Ylläpito</h1>
                    </div>
                </header>

                <div className="space-y-8">
                    <section className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10">
                        <h2 className="text-xl font-bold mb-4">TMDB Synkronointi</h2>
                        <p className="text-slate-400 mb-6">
                            Synkronoi kaikki katsotut elokuvat TMDB-tiliisi. Tämä merkitsee ne katsotuiksi antamalla niille arvosanan 7 (jos arvosanaa ei ole ennestään).
                        </p>

                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all ${syncing ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
                        >
                            {syncing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
                                    Synkronoidaan...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    Synkronoi TMDB nyt
                                </>
                            )}
                        </button>

                        {syncResult && (
                            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Viimeisin tulos</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="text-2xl font-black">{syncResult.success}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Onnistui</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black">{syncResult.skipped}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Ohitettu</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-red-400">{syncResult.error}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Virheitä</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    )
}
