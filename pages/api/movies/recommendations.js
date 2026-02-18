import pool from '../../../lib/db'

export default async function handler(req, res) {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        return res.status(500).json({ error: 'TMDB API key missing' })
    }

    const { excludeIds: excludeIdsQuery } = req.query
    const excludeIds = new Set(excludeIdsQuery ? excludeIdsQuery.split(',').map(id => parseInt(id)) : [])

    try {
        // 1. Get ALL watched movies to analyze history and exclude from results
        const allWatchedResult = await pool.query(
            "SELECT tmdb_id FROM movies WHERE tmdb_id IS NOT NULL ORDER BY watched_at DESC"
        )
        const allWatchedIds = new Set(allWatchedResult.rows.map(r => parseInt(r.tmdb_id)))
        const recentIds = allWatchedResult.rows.slice(0, 10).map(r => r.tmdb_id)

        if (allWatchedResult.rows.length === 0) {
            const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fi-FI&sort_by=popularity.desc&include_adult=false&page=1`
            const discRes = await fetch(discoverUrl)
            const discData = await discRes.json()
            return res.status(200).json(discData.results.slice(0, 20))
        }

        // 2. Fetch metadata for a subset of watched movies to determine top genres
        // Since we don't have genres in DB, we'll fetch details for the last 30 movies (sampled)
        // or just use a few recent ones. To keep it fast, let's take the last 20.
        const samplingCount = 20
        const sampleIds = allWatchedResult.rows.slice(0, samplingCount).map(r => r.tmdb_id)

        const genreCounts = {}
        await Promise.all(sampleIds.map(async (id) => {
            try {
                const detUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=fi-FI`
                const detRes = await fetch(detUrl)
                const detData = await detRes.json()
                if (detData.genres) {
                    detData.genres.forEach(g => {
                        genreCounts[g.id] = (genreCounts[g.id] || 0) + 1
                    })
                }
            } catch (e) { }
        }))

        const topGenreIds = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(e => e[0])

        // 3. Generate recommendations from multiple sources
        const candidates = []
        const candidateIds = new Set()

        // Source A: Recommendations based on 3 random recent movies
        const seedIds = recentIds.sort(() => 0.5 - Math.random()).slice(0, 3)
        await Promise.all(seedIds.map(async (id) => {
            try {
                const recUrl = `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${apiKey}&language=fi-FI&page=1`
                const response = await fetch(recUrl)
                const data = await response.json()
                if (data.results) {
                    data.results.forEach(m => {
                        if (!allWatchedIds.has(m.id) && !excludeIds.has(m.id) && !candidateIds.has(m.id)) {
                            candidates.push(m)
                            candidateIds.add(m.id)
                        }
                    })
                }
            } catch (e) { }
        }))

        // Source B: Discovery based on top genres
        if (topGenreIds.length > 0) {
            const genreQuery = topGenreIds.join(',')
            try {
                const discUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fi-FI&with_genres=${genreQuery}&sort_by=popularity.desc&page=1`
                const response = await fetch(discUrl)
                const data = await response.json()
                if (data.results) {
                    data.results.forEach(m => {
                        if (!allWatchedIds.has(m.id) && !excludeIds.has(m.id) && !candidateIds.has(m.id)) {
                            candidates.push(m)
                            candidateIds.add(m.id)
                        }
                    })
                }
            } catch (e) { }
        }

        // Source C: General trending (fallback/variety)
        try {
            const trendUrl = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=fi-FI`
            const response = await fetch(trendUrl)
            const data = await response.json()
            if (data.results) {
                data.results.forEach(m => {
                    if (!allWatchedIds.has(m.id) && !excludeIds.has(m.id) && !candidateIds.has(m.id)) {
                        candidates.push(m)
                        candidateIds.add(m.id)
                    }
                })
            }
        } catch (e) { }

        // 4. Transform and return
        const result = candidates
            .sort(() => 0.5 - Math.random())
            .slice(0, 30)
            .map(movie => ({
                id: movie.id,
                title: movie.title,
                posterPath: movie.poster_path,
                releaseYear: movie.release_date ? movie.release_date.split('-')[0] : ''
            }))

        return res.status(200).json(result)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Failed to generate recommendations' })
    }
}
