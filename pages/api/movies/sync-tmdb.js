import pool from '../../../lib/db'

export default async function handler(req, res) {
    const apiKey = process.env.TMDB_API_KEY
    const sessionId = process.env.TMDB_SESSION_ID

    if (!apiKey || !sessionId) {
        const missing = []
        if (!apiKey) missing.push('TMDB_API_KEY')
        if (!sessionId) missing.push('TMDB_SESSION_ID')
        return res.status(400).json({
            error: `TMDB-synkronointi epäonnistui: Puuttuvat ympäristömuuttujat: ${missing.join(', ')}.`
        })
    }

    try {
        // 1. Get all watched movies with TMDB ID
        const result = await pool.query(
            "SELECT tmdb_id, title FROM movies WHERE tmdb_id IS NOT NULL"
        )
        const movies = result.rows

        const results = {
            total: movies.length,
            success: 0,
            skipped: 0,
            error: 0,
            details: []
        }

        // 2. Synchronize in chunks to avoid overwhelming TMDB
        const chunkSize = 5
        for (let i = 0; i < movies.length; i += chunkSize) {
            const chunk = movies.slice(i, i + chunkSize)
            await Promise.all(chunk.map(async (movie) => {
                try {
                    // Check if already rated/watched in TMDB
                    const stateUrl = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}/account_states?api_key=${apiKey}&session_id=${sessionId}`
                    const stateRes = await fetch(stateUrl)
                    const stateData = await stateRes.json()

                    if (stateData.rated) {
                        results.skipped++
                        return
                    }

                    if (stateData.status_code === 3 || stateData.status_code === 30 || stateData.status_code === 34) {
                        results.error++
                        results.details.push({ title: movie.title, error: stateData.status_message || 'Virheellinen istunto tai API-avain' })
                        return
                    }

                    // Rate the movie (mark as watched)
                    const rateUrl = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}/rating?api_key=${apiKey}&session_id=${sessionId}`
                    const rateRes = await fetch(rateUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json;charset=utf-8' },
                        body: JSON.stringify({ value: 7.0 })
                    })

                    const rateData = await rateRes.json()

                    if (rateRes.ok) {
                        results.success++
                    } else {
                        results.error++
                        results.details.push({ title: movie.title, error: rateData.status_message || 'Arvostelu epäonnistui' })
                    }
                } catch (e) {
                    results.error++
                    results.details.push({ title: movie.title, error: e.message })
                }
            }))
        }

        return res.status(200).json(results)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Synchronization failed' })
    }
}
