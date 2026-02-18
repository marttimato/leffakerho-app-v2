import pool from '../../../lib/db'

export default async function handler(req, res) {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        return res.status(500).json({ error: 'TMDB API key missing' })
    }

    try {
        // 1. Get watched movie IDs to exclude and to base recommendations on
        const watchedResult = await pool.query(
            "SELECT tmdb_id FROM movies WHERE tmdb_id IS NOT NULL ORDER BY watched_at DESC LIMIT 50"
        )
        const watchedIds = new Set(watchedResult.rows.map(r => parseInt(r.tmdb_id)))
        const recentIds = watchedResult.rows.slice(0, 10).map(r => r.tmdb_id)

        if (recentIds.length === 0) {
            // Fallback to general discovery if history is empty (unlikely given the app purpose)
            const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fi-FI&sort_by=popularity.desc&include_adult=false&page=1`
            const discRes = await fetch(discoverUrl)
            const discData = await discRes.json()
            return res.status(200).json(discData.results.slice(0, 20))
        }

        // 2. Get recommendations based on recently watched movies
        // We'll pick 3 random recent movies to get recommendations for variety
        const seedIds = recentIds.sort(() => 0.5 - Math.random()).slice(0, 3)
        const allRecommendations = []

        await Promise.all(seedIds.map(async (id) => {
            try {
                const recUrl = `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${apiKey}&language=fi-FI&page=1`
                const response = await fetch(recUrl)
                const data = await response.json()
                if (data.results) {
                    allRecommendations.push(...data.results)
                }
            } catch (e) {
                console.error(`Failed to fetch recommendations for ${id}`, e)
            }
        }))

        // 3. Filter out watched movies and duplicates
        const uniqueFiltered = []
        const seenIds = new Set()

        for (const movie of allRecommendations) {
            if (!watchedIds.has(movie.id) && !seenIds.has(movie.id)) {
                uniqueFiltered.push({
                    id: movie.id,
                    title: movie.title,
                    posterPath: movie.poster_path,
                    releaseYear: movie.release_date ? movie.release_date.split('-')[0] : ''
                })
                seenIds.add(movie.id)
            }
        }

        // 4. Return top 24 results
        return res.status(200).json(uniqueFiltered.slice(0, 24))
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: 'Failed to generate recommendations' })
    }
}
